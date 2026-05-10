/**
 * DriverDocumentsScreen
 * Shows the logged-in driver's own documents (add/edit/view) and vehicle
 * documents linked to their assigned vehicle(s) (view only).
 */
import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t, isRTL as isRTLFn} from '../lib/i18n';
import {Colors, Radius, Shadow, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {formatDateSmart} from '../lib/dates';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

// ── Types ─────────────────────────────────────────────────────────────────────

interface LinkedVehicle {id: string; plateNumber: string; make: string; model: string}
interface LinkedDriver  {id: string; fullName: string}

interface FleetDocument {
  id: string;
  type: string;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority?: string;
  referenceNumber?: string;
  notes?: string;
  vehicles: LinkedVehicle[];
  drivers: LinkedDriver[];
}

interface DocumentsResponse {
  data: FleetDocument[];
  total: number;
}

interface DriverRecord {
  id: string;
  fullName: string;
  vehicles: LinkedVehicle[];
}

type Segment = 'mine' | 'vehicle';

interface Props {
  locale: Locale;
  onSelectDoc: (docId: string) => void;
  onAddPress: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function docTypeLabel(type: string, i18n: ReturnType<typeof t>): string {
  const map: Record<string, string> = {
    DRIVER_LICENSE:      i18n.docTypeDriverLicense,
    VEHICLE_INSURANCE:   i18n.docTypeVehicleInsurance,
    PERIODIC_INSPECTION: i18n.docTypePeriodicInspection,
    VEHICLE_REGISTRATION:i18n.docTypeVehicleRegistration,
    OPERATION_CARD:      i18n.docTypeOperationCard,
    TRANSPORT_PERMIT:    i18n.docTypeTransportPermit,
    OWNERSHIP_DEED:      i18n.docTypeOwnershipDeed,
  };
  return map[type] ?? i18n.docTypeOther;
}

function statusBadge(
  expiryDate: string,
  i18n: ReturnType<typeof t>,
): {label: string; color: string; bg: string} {
  const now  = new Date();
  const exp  = new Date(expiryDate);
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (exp < now)  return {label: i18n.statusExpired,  color: '#fff', bg: Colors.danger};
  if (exp <= soon) return {label: i18n.statusExpiring, color: '#fff', bg: Colors.warning ?? '#F57C00'};
  return {label: i18n.statusValid, color: '#fff', bg: Colors.success};
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function DriverDocumentsScreen({locale, onSelectDoc, onAddPress}: Props) {
  const i18n  = t(locale);
  const isRTL = isRTLFn(locale);

  const [driver, setDriver]       = useState<DriverRecord | null>(null);
  const [driverLoading, setDriverLoading] = useState(true);
  const [segment, setSegment]     = useState<Segment>('mine');
  const [docs, setDocs]           = useState<FleetDocument[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage]           = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 20;

  // Fetch the driver's own record to get driverId + assigned vehicles
  useEffect(() => {
    api.get<DriverRecord>('/drivers/me')
      .then(d => setDriver(d))
      .catch(() => {})
      .finally(() => setDriverLoading(false));
  }, []);

  const fetchDocs = useCallback(
    async (p: number, replace: boolean, isRefresh = false) => {
      if (!driver) return;
      if (replace) {
        isRefresh ? setRefreshing(true) : setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params: Record<string, string> = {
          page: String(p),
          limit: String(LIMIT),
        };

        if (segment === 'mine') {
          params.driverId = driver.id;
        } else {
          const vehicleId = driver.vehicles[0]?.id;
          if (!vehicleId) { setDocs([]); setTotal(0); return; }
          params.vehicleId = vehicleId;
        }

        const qs = new URLSearchParams(params).toString();
        const res = await api.get<DocumentsResponse>(`/documents?${qs}`);
        const fetched = res.data ?? [];
        setTotal(res.total ?? 0);
        setDocs(prev => replace ? fetched : [...prev, ...fetched]);
        setPage(p);
      } catch {
        // keep existing data
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [driver, segment],
  );

  useEffect(() => {
    if (driver) fetchDocs(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver, segment]);

  function loadMore() {
    if (loadingMore || docs.length >= total) return;
    fetchDocs(page + 1, false);
  }

  // ── Render doc card ───────────────────────────────────────────────────────

  const renderItem = useCallback(({item}: {item: FleetDocument}) => {
    const badge       = statusBadge(item.expiryDate, i18n);
    const typeStr     = docTypeLabel(item.type, i18n);
    const linkedPlates  = item.vehicles.map(v => v.plateNumber);
    const linkedDrivers = item.drivers.map(d => d.fullName);
    const allLinked   = [...linkedPlates, ...linkedDrivers];

    return (
      <TouchableOpacity style={styles.card} onPress={() => onSelectDoc(item.id)} activeOpacity={0.85}>
        <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
          <View style={styles.iconWrap}>
            <AppIcon name="file-document-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={[styles.typeText, isRTL && styles.rtlText]} numberOfLines={1}>
            {typeStr}
          </Text>
          <View style={[styles.badge, {backgroundColor: badge.bg}]}>
            <Text style={[styles.badgeText, {color: badge.color}]}>{badge.label}</Text>
          </View>
        </View>

        {allLinked.length > 0 && (
          <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
            <AppIcon name="link-variant" size={13} color={Colors.textMuted} />
            <Text style={[styles.metaText, isRTL && styles.rtlText]} numberOfLines={1}>
              {allLinked.join(' · ')}
            </Text>
          </View>
        )}

        <View style={[styles.datesRow, isRTL && styles.rowReverse]}>
          <View style={styles.datePair}>
            <Text style={styles.dateLabel}>{i18n.issueDateLabel}</Text>
            <Text style={styles.dateValue}>{formatDateSmart(item.issueDate, locale)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.datePair}>
            <Text style={styles.dateLabel}>{i18n.expiryLabel}</Text>
            <Text style={[styles.dateValue, {color: badge.bg !== (Colors.success ?? '#2E7D32') ? badge.bg : undefined}]}>
              {formatDateSmart(item.expiryDate, locale)}
            </Text>
          </View>
        </View>

        {!!item.referenceNumber && (
          <Text style={[styles.refText, isRTL && styles.rtlText]} numberOfLines={1}>
            # {item.referenceNumber}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [i18n, isRTL, locale, onSelectDoc]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (driverLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const hasVehicle = (driver?.vehicles.length ?? 0) > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
          <View style={{width: 38}} />
          <Text style={styles.headerTitle}>{i18n.documents}</Text>
          {segment === 'mine' ? (
            <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.7}>
              <AppIcon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{width: 38}} />
          )}
        </View>

        {/* Segment tabs */}
        <View style={[styles.segmentRow, isRTL && styles.rowReverse]}>
          <TouchableOpacity
            style={[styles.segBtn, segment === 'mine' && styles.segBtnActive]}
            onPress={() => setSegment('mine')}
            activeOpacity={0.8}>
            <Text style={[styles.segBtnText, segment === 'mine' && styles.segBtnTextActive]}>
              {i18n.myDocs}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, segment === 'vehicle' && styles.segBtnActive]}
            onPress={() => setSegment('vehicle')}
            activeOpacity={0.8}>
            <Text style={[styles.segBtnText, segment === 'vehicle' && styles.segBtnTextActive]}>
              {i18n.vehicleDocs}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle-docs segment: no vehicle assigned */}
      {segment === 'vehicle' && !hasVehicle ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyText}>{i18n.noVehicleLinked}</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDocs(1, true, true)}
              tintColor={Colors.primary}
            />
          }
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{marginVertical: 12}} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>{i18n.noDocuments}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  header: {backgroundColor: Colors.primary, paddingBottom: 12},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 12,
  },
  headerTitle: {fontSize: 20, fontWeight: '700' as const, color: '#fff'},
  addBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  rowReverse: {flexDirection: 'row-reverse'},
  rtlText: {textAlign: 'right'},
  segmentRow: {
    flexDirection: 'row', marginHorizontal: Spacing.md, gap: 8, paddingBottom: 4,
  },
  segBtn: {
    flex: 1, paddingVertical: 7, borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  segBtnActive: {backgroundColor: '#fff'},
  segBtnText: {fontSize: 13, fontWeight: '600' as const, color: 'rgba(255,255,255,0.85)'},
  segBtnTextActive: {color: Colors.primary},
  list: {padding: Spacing.md, gap: Spacing.sm},
  emptyWrap: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80},
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyText: {...Typography.body, color: Colors.textMuted, textAlign: 'center'},
  // Card
  card: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.md,
    ...Shadow.sm, gap: 8,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', gap: 10},
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primaryLight ?? 'rgba(36,124,118,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  typeText: {flex: 1, fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary},
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  badgeText: {fontSize: 10, fontWeight: '700' as const},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 5},
  metaText: {fontSize: 12, color: Colors.textMuted, flex: 1},
  datesRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  datePair: {flex: 1},
  dateLabel: {fontSize: 10, color: Colors.textMuted, marginBottom: 2},
  dateValue: {fontSize: 12, fontWeight: '600' as const, color: Colors.textPrimary},
  divider: {width: 1, height: 28, backgroundColor: Colors.borderLight},
  refText: {fontSize: 11, color: Colors.textMuted, fontStyle: 'italic'},
});
