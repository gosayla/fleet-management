/**
 * ContractDetailScreen — View contract details, manage vacations, view trips, regenerate trips
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { api } from '../lib/api';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Locale, t, isRTL as isRTLFn } from '../lib/i18n';
import { formatDateSmart } from '../lib/dates';
import { Alert } from '../lib/alert';
import { TripLegBadge } from '../components/ui/TripLegBadge';
import { DateWheelModal } from '../components/ui/DateWheelModal';

interface ContractVacation {
  id: string;
  date: string;
  reason?: string;
}

interface ContractTrip {
  id: string;
  scheduledStart: string;
  leg?: string;
  status: string;
  tripType: string;
  origin: string;
  destination: string;
}

interface ContractDetail {
  id: string;
  contractNumber?: string;
  clientName: string;
  clientPhone?: string;
  origin: string;
  destination: string;
  contractStart: string;
  contractEnd: string;
  departureTime: string;
  returnTime?: string;
  isTwoWay: boolean;
  excludeFridays: boolean;
  excludeSaturdays: boolean;
  notes?: string;
  vehicle?: { id: string; plateNumber: string; make: string; model: string };
  driver?: { id: string; fullName: string; phone: string };
  vacations: ContractVacation[];
  _count?: { trips: number };
}

interface ContractTripsPage {
  items: ContractTrip[];
  nextOffset: number | null;
}

interface Props {
  contractId: string;
  locale: Locale;
  onBack: () => void;
  onEdit: () => void;
  onSelectTrip?: (tripId: string) => void;
}

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

const TRIP_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  SCHEDULED: { color: Colors.info, bg: Colors.infoLight },
  IN_PROGRESS: { color: Colors.success, bg: Colors.successLight },
  COMPLETED: { color: Colors.textMuted, bg: Colors.borderLight },
  CANCELLED: { color: Colors.danger, bg: Colors.dangerLight },
};

function fmtDate(iso: string | undefined, locale: Locale) {
  return formatDateSmart(iso, locale);
}

function fmtDateTime(iso: string | undefined, locale: Locale) {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  const localeCode: Record<Locale, string> = {
    ar: 'ar-SA',
    en: 'en-GB',
    hi: 'hi-IN',
    bn: 'bn-BD',
    ur: 'ur-PK',
  };
  return (
    d.toLocaleDateString(localeCode[locale], {
      day: '2-digit',
      month: 'short',
    }) +
    ' ' +
    d.toLocaleTimeString(localeCode[locale], {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

export function ContractDetailScreen({
  contractId,
  locale,
  onBack,
  onEdit,
  onSelectTrip,
}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [trips, setTrips] = useState<ContractTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [loadingMoreTrips, setLoadingMoreTrips] = useState(false);
  const [_nextTripsOffset, setNextTripsOffset] = useState<number | null>(0);
  const [_hasMoreTrips, setHasMoreTrips] = useState(false);
  const tripsLoadingRef = useRef(true);
  const loadingMoreTripsRef = useRef(false);
  const nextTripsOffsetRef = useRef<number | null>(0);
  const hasMoreTripsRef = useRef(false);
  const scrollMetricsRef = useRef({
    layoutHeight: 0,
    offsetY: 0,
    contentHeight: 0,
  });

  // Vacation modal state
  const [vacModalOpen, setVacModalOpen] = useState(false);
  const [vacDate, setVacDate] = useState('');
  const [vacEndDate, setVacEndDate] = useState('');
  const [vacReason, setVacReason] = useState('');
  const [vacSaving, setVacSaving] = useState(false);
  const [vacDatePickerField, setVacDatePickerField] = useState<
    'start' | 'end' | null
  >(null);

  const loadTrips = useCallback(
    async (reset = false) => {
      if (reset) {
        tripsLoadingRef.current = true;
        setTripsLoading(true);
        loadingMoreTripsRef.current = false;
        setLoadingMoreTrips(false);
      } else {
        if (loadingMoreTripsRef.current || !hasMoreTripsRef.current) {
          return;
        }
        loadingMoreTripsRef.current = true;
        setLoadingMoreTrips(true);
      }

      try {
        const qs = new URLSearchParams({ take: '20' });
        if (!reset && nextTripsOffsetRef.current !== null) {
          qs.set('skip', String(nextTripsOffsetRef.current));
        }

        const data = await api.get<ContractTripsPage>(
          `/contracts/${contractId}/trips?${qs.toString()}`
        );
        const nextItems = Array.isArray(data.items) ? data.items : [];
        const nextOffset =
          typeof data.nextOffset === 'number' ? data.nextOffset : null;

        setTrips((prev) => (reset ? nextItems : [...prev, ...nextItems]));
        nextTripsOffsetRef.current = nextOffset;
        hasMoreTripsRef.current = nextOffset !== null;
        setNextTripsOffset(nextOffset);
        setHasMoreTrips(nextOffset !== null);
      } catch {
        if (reset) {
          setTrips([]);
        }
      } finally {
        tripsLoadingRef.current = false;
        loadingMoreTripsRef.current = false;
        setTripsLoading(false);
        setLoadingMoreTrips(false);
      }
    },
    [contractId]
  );

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await api.get<ContractDetail>(`/contracts/${contractId}`);
      setContract(data);
    } catch {
      setError(i18n.failedToLoadContract);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contractId, i18n.failedToLoadContract]);

  useEffect(() => {
    setTrips([]);
    nextTripsOffsetRef.current = 0;
    hasMoreTripsRef.current = false;
    tripsLoadingRef.current = true;
    loadingMoreTripsRef.current = false;
    setNextTripsOffset(0);
    setHasMoreTrips(false);
    load();
    loadTrips(true);
  }, [contractId, load, loadTrips]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([load(), loadTrips(true)]);
  }

  async function handleGenerateTrips() {
    Alert.alert(
      i18n.generateTrips,
      locale === 'ar'
        ? 'سيتم إنشاء الرحلات بناءً على إعدادات العقد.'
        : 'Trips will be generated based on contract settings.',
      [
        { text: i18n.cancel, style: 'cancel' },
        {
          text: i18n.generateTrips,
          onPress: async () => {
            setGenerating(true);
            try {
              await api.post(`/contracts/${contractId}/generate-trips`, {});
              await Promise.all([load(), loadTrips(true)]);
              Alert.alert('', i18n.generatedSuccess);
            } catch (e: any) {
              const msg = e?.response?.data?.message ?? e?.message ?? 'Error';
              Alert.alert(
                i18n.error,
                Array.isArray(msg) ? msg.join(', ') : String(msg)
              );
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  }

  async function handleAddVacation() {
    if (!vacDate.trim()) {
      return;
    }
    setVacSaving(true);
    try {
      const start = vacDate.trim();
      const end =
        vacEndDate.trim() && vacEndDate.trim() >= start
          ? vacEndDate.trim()
          : start;
      const existingDates = new Set(
        (contract?.vacations ?? []).map((item) => item.date.slice(0, 10))
      );
      const requests: Promise<unknown>[] = [];

      for (
        let cursor = new Date(`${start}T00:00:00.000Z`);
        cursor <= new Date(`${end}T00:00:00.000Z`);
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      ) {
        const nextDate = cursor.toISOString().slice(0, 10);
        if (existingDates.has(nextDate)) {
          continue;
        }
        requests.push(
          api.post(`/contracts/${contractId}/vacations`, {
            date: nextDate,
            ...(vacReason.trim() && { reason: vacReason.trim() }),
          })
        );
      }

      await Promise.all(requests);
      setVacDate('');
      setVacEndDate('');
      setVacReason('');
      setVacModalOpen(false);
      await Promise.all([load(), loadTrips(true)]);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error';
      Alert.alert(
        i18n.error,
        Array.isArray(msg) ? msg.join(', ') : String(msg)
      );
    } finally {
      setVacSaving(false);
    }
  }

  async function handleRemoveVacation(vacId: string) {
    try {
      await api.delete(`/contracts/${contractId}/vacations/${vacId}`);
      await Promise.all([load(), loadTrips(true)]);
    } catch {}
  }

  function maybeLoadMoreTrips() {
    if (
      !hasMoreTripsRef.current ||
      loadingMoreTripsRef.current ||
      tripsLoadingRef.current
    ) {
      return;
    }

    const { layoutHeight, offsetY, contentHeight } = scrollMetricsRef.current;
    if (!layoutHeight || !contentHeight) {
      return;
    }

    const distanceFromBottom = contentHeight - (layoutHeight + offsetY);
    if (distanceFromBottom <= 320) {
      loadTrips(false);
    }
  }

  function updateScrollMetrics(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    scrollMetricsRef.current = {
      layoutHeight: layoutMeasurement.height,
      offsetY: contentOffset.y,
      contentHeight: contentSize.height,
    };
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    updateScrollMetrics(event);
    maybeLoadMoreTrips();
  }

  function handleScrollSettled(event: NativeSyntheticEvent<NativeScrollEvent>) {
    updateScrollMetrics(event);
    maybeLoadMoreTrips();
  }

  async function handleDelete() {
    Alert.alert(
      locale === 'ar' ? 'حذف العقد' : 'Delete Contract',
      i18n.deleteContractConfirm,
      [
        { text: i18n.cancel, style: 'cancel' },
        {
          text: i18n.deleteLabel,
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/contracts/${contractId}`);
              onBack();
            } catch {}
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !contract) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error || i18n.failedToLoadContract}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>{i18n.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tripStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      SCHEDULED: locale === 'ar' ? 'مجدولة' : 'Scheduled',
      IN_PROGRESS: locale === 'ar' ? 'جارية' : 'Active',
      COMPLETED: locale === 'ar' ? 'مكتملة' : 'Done',
      CANCELLED: locale === 'ar' ? 'ملغاة' : 'Cancelled',
    };
    return labels[status] ?? status;
  };

  const existingVacationDates = new Set(
    (contract.vacations ?? []).map((item) => item.date.slice(0, 10))
  );

  const vacationStartLabel = i18n.vacationStartDate;
  const vacationEndLabel = i18n.vacationEndDate;
  const vacationStartPlaceholder = i18n.vacationStartPlaceholder;
  const vacationEndPlaceholder = i18n.vacationEndPlaceholder;
  const rowDirectionStyle = isRTL ? styles.row : styles.rowReverse;
  const textStartStyle = isRTL ? styles.textRight : styles.textLeft;
  const textEndStyle = isRTL ? styles.textLeft : styles.textRight;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusBarSpacer} />
        <View style={[styles.headerRow, rowDirectionStyle]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <AppIcon
              name={isRTL ? 'arrow-right' : 'arrow-left'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
          <View style={styles.flexOne}>
            <Text
              style={[styles.headerTitle, textStartStyle]}
              numberOfLines={1}
            >
              {contract.clientName}
            </Text>
            {contract.contractNumber ? (
              <Text style={[styles.headerSub, textStartStyle]}>
                #{contract.contractNumber}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={onEdit}>
            <AppIcon name="pencil-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
            <AppIcon name="trash-can-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        onLayout={(event) => {
          scrollMetricsRef.current.layoutHeight =
            event.nativeEvent.layout.height;
          maybeLoadMoreTrips();
        }}
        onContentSizeChange={(_, height) => {
          scrollMetricsRef.current.contentHeight = height;
          maybeLoadMoreTrips();
        }}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollSettled}
        onMomentumScrollEnd={handleScrollSettled}
        scrollEventThrottle={16}
      >
        {/* Client info card */}
        <View style={styles.card}>
          <InfoRow
            icon="account-outline"
            label={i18n.contractClientName}
            value={contract.clientName}
            isRTL={isRTL}
          />
          {contract.clientPhone && (
            <InfoRow
              icon="phone-outline"
              label={i18n.contractClientPhone}
              value={contract.clientPhone}
              isRTL={isRTL}
            />
          )}
          <InfoRow
            icon="map-marker-outline"
            label={`${contract.origin} → ${contract.destination}`}
            value=""
            isRoute
            isRTL={isRTL}
          />
          <InfoRow
            icon="calendar-outline"
            label={i18n.contractStart}
            value={`${fmtDate(contract.contractStart, locale)} – ${fmtDate(
              contract.contractEnd,
              locale
            )}`}
            isRTL={isRTL}
          />
          <InfoRow
            icon="clock-outline"
            label={i18n.departureTime}
            value={
              contract.departureTime +
              (contract.isTwoWay && contract.returnTime
                ? ` / ${contract.returnTime}`
                : '')
            }
            isRTL={isRTL}
          />
          <View style={styles.badgeRow}>
            {contract.isTwoWay && (
              <Badge label={i18n.isTwoWay} color={Colors.primary} />
            )}
            {contract.excludeFridays && (
              <Badge label={i18n.excludeFridays} color={Colors.warning} />
            )}
            {contract.excludeSaturdays && (
              <Badge label={i18n.excludeSaturdays} color={Colors.warning} />
            )}
          </View>
        </View>

        {/* Vehicle & Driver */}
        {(contract.vehicle || contract.driver) && (
          <View style={styles.card}>
            {contract.vehicle && (
              <InfoRow
                icon="truck-outline"
                label={i18n.contractVehicle}
                value={`${contract.vehicle.plateNumber} — ${contract.vehicle.make} ${contract.vehicle.model}`}
                isRTL={isRTL}
              />
            )}
            {contract.driver && (
              <InfoRow
                icon="account-tie-outline"
                label={i18n.contractDriver}
                value={contract.driver.fullName}
                isRTL={isRTL}
              />
            )}
          </View>
        )}

        {/* Notes */}
        {contract.notes && (
          <View style={styles.card}>
            <InfoRow
              icon="note-text-outline"
              label={i18n.notes}
              value={contract.notes}
              isRTL={isRTL}
            />
          </View>
        )}

        {/* Vacations */}
        <View style={[styles.sectionHeader, rowDirectionStyle]}>
          <Text style={styles.sectionTitle}>{i18n.vacationsSection}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setVacModalOpen(true)}
          >
            <AppIcon name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addBtnText}>{i18n.addVacation}</Text>
          </TouchableOpacity>
        </View>

        {contract.vacations.length === 0 ? (
          <Text style={[styles.emptyMini, textEndStyle]}>
            {locale === 'ar' ? 'لا توجد أيام مستثناة' : 'No excluded days'}
          </Text>
        ) : (
          <View style={styles.card}>
            {contract.vacations.map((vac, idx) => (
              <React.Fragment key={vac.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={[styles.vacRow, rowDirectionStyle]}>
                  <View style={styles.flexOne}>
                    <Text style={[styles.vacDate, textEndStyle]}>
                      {fmtDate(vac.date, locale)}
                    </Text>
                    {vac.reason && (
                      <Text style={[styles.vacReason, textEndStyle]}>
                        {vac.reason}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveVacation(vac.id)}
                    style={styles.removeBtn}
                  >
                    <AppIcon name="close" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Trips */}
        <View style={[styles.sectionHeader, rowDirectionStyle]}>
          <Text style={styles.sectionTitle}>{i18n.contractTripsSection}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleGenerateTrips}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <AppIcon name="refresh" size={16} color={Colors.primary} />
                <Text style={styles.addBtnText}>{i18n.generateTrips}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {tripsLoading ? (
          <View style={styles.tripsLoadingWrap}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : trips.length === 0 ? (
          <Text style={styles.emptyMini}>
            {locale === 'ar'
              ? 'لا توجد رحلات بعد'
              : 'No trips yet — tap Generate to create them'}
          </Text>
        ) : (
          <View style={styles.card}>
            {trips.map((trip, idx) => {
              const sc = TRIP_STATUS_COLORS[trip.status] ?? {
                color: Colors.textMuted,
                bg: Colors.borderLight,
              };
              return (
                <React.Fragment key={trip.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={[styles.tripRow, rowDirectionStyle]}
                    onPress={() => onSelectTrip?.(trip.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.tripMain, rowDirectionStyle]}>
                      <Text style={styles.tripDate}>
                        {fmtDateTime(trip.scheduledStart, locale)}
                      </Text>
                      <TripLegBadge leg={trip.leg} locale={locale} />
                    </View>
                    <View
                      style={[styles.statusBadge, { backgroundColor: sc.bg }]}
                    >
                      <Text
                        style={[styles.statusBadgeText, { color: sc.color }]}
                      >
                        {tripStatusLabel(trip.status)}
                      </Text>
                    </View>
                    <AppIcon
                      name={isRTL ? 'chevron-left' : 'chevron-right'}
                      size={16}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        )}

        {loadingMoreTrips && (
          <View style={styles.tripsFooterLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Vacation Modal */}
      <Modal
        visible={vacModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVacModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, rowDirectionStyle]}>
              <Text style={styles.modalTitle}>{i18n.addVacation}</Text>
              <TouchableOpacity onPress={() => setVacModalOpen(false)}>
                <AppIcon name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>{vacationStartLabel} *</Text>
              <TouchableOpacity
                style={styles.modalPickerBtn}
                onPress={() => setVacDatePickerField('start')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modalPickerValue,
                    !vacDate && styles.modalPickerPlaceholder,
                    textEndStyle,
                  ]}
                >
                  {vacDate || vacationStartPlaceholder}
                </Text>
                <AppIcon
                  name={isRTL ? 'chevron-left' : 'chevron-right'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                {vacationEndLabel}
              </Text>
              <TouchableOpacity
                style={styles.modalPickerBtn}
                onPress={() => setVacDatePickerField('end')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modalPickerValue,
                    !vacEndDate && styles.modalPickerPlaceholder,
                    textEndStyle,
                  ]}
                >
                  {vacEndDate || vacationEndPlaceholder}
                </Text>
                <AppIcon
                  name={isRTL ? 'chevron-left' : 'chevron-right'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                {i18n.vacationReason}
              </Text>
              <TextInput
                style={[styles.modalInput, textStartStyle]}
                value={vacReason}
                onChangeText={setVacReason}
                placeholder={i18n.vacationReason}
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  (!vacDate.trim() || vacSaving) && styles.modalSaveBtnDisabled,
                ]}
                onPress={handleAddVacation}
                disabled={!vacDate.trim() || vacSaving}
              >
                {vacSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>
                    {i18n.addVacation}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DateWheelModal
        visible={vacDatePickerField !== null}
        value={vacDatePickerField === 'end' ? vacEndDate : vacDate}
        locale={locale}
        cancelLabel={i18n.cancel}
        doneLabel={i18n.done}
        label={
          vacDatePickerField === 'end' ? vacationEndLabel : vacationStartLabel
        }
        onClose={() => setVacDatePickerField(null)}
        onConfirm={(date) => {
          if (existingVacationDates.has(date)) {
            Alert.alert(i18n.addVacation, i18n.vacationAlreadyExcluded);
            return;
          }

          if (vacDatePickerField === 'end') {
            setVacEndDate(date);
          } else {
            setVacDate(date);
          }
          setVacDatePickerField(null);
        }}
      />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  isRoute,
  isRTL,
}: {
  icon: string;
  label: string;
  value: string;
  isRoute?: boolean;
  isRTL: boolean;
}) {
  const rowDirectionStyle = isRTL ? styles.row : styles.rowReverse;
  const textEndStyle = isRTL ? styles.textLeft : styles.textRight;
  if (isRoute) {
    return (
      <View style={[styles.infoRow, rowDirectionStyle]}>
        <AppIcon name={icon} size={16} color={Colors.primary} />
        <Text style={[styles.infoValue, styles.infoValueStrong, textEndStyle]}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.infoRow, rowDirectionStyle]}>
      <AppIcon name={icon} size={16} color={Colors.textMuted} />
      <View style={styles.flexOne}>
        <Text style={[styles.infoLabel, textEndStyle]}>{label}</Text>
        {value ? (
          <Text style={[styles.infoValue, textEndStyle]}>{value}</Text>
        ) : null}
      </View>
    </View>
  );
}
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  row: { flexDirection: 'row' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  flexOne: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    gap: 12,
  },
  header: { backgroundColor: Colors.primary },
  statusBarSpacer: { height: SB_H },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: 8,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.md, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  infoValue: { fontSize: 14, color: Colors.textPrimary, marginTop: 2 },
  infoValueStrong: { fontWeight: '600' as const },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600' as const },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  addBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  emptyMini: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  vacRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  vacDate: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  vacReason: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  removeBtn: { padding: 6 },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  tripMain: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-start',
  },
  tripDate: { fontSize: 14, color: Colors.textPrimary },
  tripLegWrap: { marginTop: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' as const },
  tripsLoadingWrap: { alignItems: 'center', paddingVertical: 20 },
  tripsFooterLoading: { alignItems: 'center', paddingVertical: 14 },
  errorText: { color: Colors.danger, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' as const },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  modalBody: { padding: 16 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldLabelSpaced: { marginTop: 12 },
  modalInput: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  modalPickerBtn: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalPickerValue: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  modalPickerPlaceholder: { color: Colors.textMuted },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSaveBtnDisabled: { opacity: 0.5 },
  modalSaveBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 15 },
  bottomSpacer: { height: 40 },
});
