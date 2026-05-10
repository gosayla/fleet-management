/**
 * RentalDetailScreen — View rental details, return vehicle
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import {api} from '../lib/api';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {Locale, t, isRTL as isRTLFn} from '../lib/i18n';

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface RentalDetail {
  id: string;
  contractNumber?: string;
  clientName: string;
  clientPhone?: string;
  clientNationalId?: string;
  rentalStart: string;
  rentalEnd: string;
  odometerOut?: number;
  odometerIn?: number;
  dailyRateSar?: number;
  contractFileUrl?: string;
  status: string;
  notes?: string;
  vehicle?: {id: string; plateNumber: string; make: string; model: string};
}

interface Props {
  rentalId: string;
  locale: Locale;
  onBack: () => void;
  onEdit: () => void;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
}

const STATUS_CONFIG: Record<string, {color: string; bg: string; icon: string}> = {
  ACTIVE:    {color: '#2E7D32', bg: '#E8F5E9', icon: 'key-outline'},
  RETURNED:  {color: Colors.textMuted, bg: Colors.borderLight, icon: 'check-circle-outline'},
  OVERDUE:   {color: Colors.danger, bg: Colors.dangerLight, icon: 'alert-circle-outline'},
  CANCELLED: {color: Colors.textMuted, bg: Colors.borderLight, icon: 'close-circle-outline'},
};

export function RentalDetailScreen({rentalId, locale, onBack, onEdit}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);

  const [rental, setRental] = useState<RentalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Return vehicle modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [odometerIn, setOdometerIn] = useState('');
  const [returning, setReturning] = useState(false);

  async function load() {
    try {
      const data = await api.get<RentalDetail>(`/rentals/${rentalId}`);
      setRental(data);
    } catch {
      setError(i18n.failedToLoadRental);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [rentalId]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
  }

  async function handleReturn() {
    setReturning(true);
    try {
      const payload: Record<string, unknown> = {};
      if (odometerIn.trim()) payload.odometerIn = Number(odometerIn);
      await api.post(`/rentals/${rentalId}/return`, payload);
      setReturnModalOpen(false);
      setOdometerIn('');
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error';
      Alert.alert(i18n.error, Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setReturning(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      locale === 'ar' ? 'حذف الإيجار' : 'Delete Rental',
      i18n.deleteRentalConfirm,
      [
        {text: i18n.cancel, style: 'cancel'},
        {
          text: i18n.deleteLabel,
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/rentals/${rentalId}`);
              onBack();
            } catch {}
          },
        },
      ],
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (error || !rental) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || i18n.failedToLoadRental}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>{i18n.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sc = STATUS_CONFIG[rental.status] ?? STATUS_CONFIG.RETURNED;
  const canReturn = rental.status === 'ACTIVE' || rental.status === 'OVERDUE';
  const canEdit = rental.status === 'ACTIVE' || rental.status === 'OVERDUE';

  function rentalStatusLabel(status: string) {
    switch (status) {
      case 'ACTIVE': return i18n.rentalStatusActive;
      case 'RETURNED': return i18n.rentalStatusReturned;
      case 'OVERDUE': return i18n.rentalStatusOverdue;
      case 'CANCELLED': return i18n.rentalStatusCancelled;
      default: return status;
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_H}} />
        <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{flex: 1}}>
            <Text style={styles.headerTitle} numberOfLines={1}>{rental.clientName}</Text>
            {rental.vehicle && (
              <Text style={styles.headerSub}>{rental.vehicle.plateNumber}</Text>
            )}
          </View>
          {canEdit && (
            <TouchableOpacity style={styles.headerBtn} onPress={onEdit}>
              <AppIcon name="pencil-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
            <AppIcon name="trash-can-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}>

        {/* Status banner */}
        <View style={[styles.statusBanner, {backgroundColor: sc.bg}]}>
          <AppIcon name={sc.icon} size={20} color={sc.color} />
          <Text style={[styles.statusBannerText, {color: sc.color}]}>{rentalStatusLabel(rental.status)}</Text>
        </View>

        {/* Vehicle */}
        {rental.vehicle && (
          <View style={styles.card}>
            <InfoRow icon="truck-outline" label={i18n.rentalVehicle} value={`${rental.vehicle.plateNumber} — ${rental.vehicle.make} ${rental.vehicle.model}`} />
          </View>
        )}

        {/* Client info */}
        <View style={styles.card}>
          <InfoRow icon="account-outline" label={i18n.rentalClientName} value={rental.clientName} />
          {rental.clientPhone && <InfoRow icon="phone-outline" label={i18n.rentalClientPhone} value={rental.clientPhone} />}
          {rental.clientNationalId && <InfoRow icon="card-account-details-outline" label={i18n.rentalClientNationalId} value={rental.clientNationalId} />}
          {rental.contractNumber && <InfoRow icon="file-document-outline" label={i18n.rentalContractNumber} value={rental.contractNumber} />}
        </View>

        {/* Period */}
        <View style={styles.card}>
          <InfoRow icon="calendar-start" label={i18n.rentalStart} value={fmtDate(rental.rentalStart)} />
          <InfoRow icon="calendar-end" label={i18n.rentalEnd} value={fmtDate(rental.rentalEnd)} />
        </View>

        {/* Odometer & Rate */}
        <View style={styles.card}>
          {rental.odometerOut != null && (
            <InfoRow icon="counter" label={i18n.rentalOdometerOut} value={`${rental.odometerOut} km`} />
          )}
          {rental.odometerIn != null && (
            <InfoRow icon="counter" label={i18n.rentalOdometerIn} value={`${rental.odometerIn} km`} />
          )}
          {rental.dailyRateSar != null && (
            <InfoRow icon="currency-usd" label={i18n.rentalDailyRate} value={`${rental.dailyRateSar} ${i18n.sarUnit}`} />
          )}
        </View>

        {/* Notes */}
        {rental.notes && (
          <View style={styles.card}>
            <InfoRow icon="note-text-outline" label={i18n.notes} value={rental.notes} />
          </View>
        )}

        {/* Return Vehicle Button */}
        {canReturn && (
          <TouchableOpacity style={styles.returnBtn} onPress={() => setReturnModalOpen(true)}>
            <AppIcon name="key-variant" size={20} color="#fff" />
            <Text style={styles.returnBtnText}>{i18n.returnVehicle}</Text>
          </TouchableOpacity>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* Return Vehicle Modal */}
      <Modal visible={returnModalOpen} transparent animationType="slide" onRequestClose={() => setReturnModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.returnVehicle}</Text>
              <TouchableOpacity onPress={() => setReturnModalOpen(false)}>
                <AppIcon name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>{i18n.rentalOdometerIn}</Text>
              <TextInput
                style={styles.modalInput}
                value={odometerIn}
                onChangeText={setOdometerIn}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[styles.modalSaveBtn, returning && styles.modalSaveBtnDisabled]}
                onPress={handleReturn}
                disabled={returning}>
                {returning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>{i18n.returnVehicle}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoRow({icon, label, value}: {icon: string; label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <AppIcon name={icon} size={16} color={Colors.textMuted} />
      <View style={{flex: 1}}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, gap: 12},
  header: {backgroundColor: Colors.primary},
  headerRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 8, gap: 8},
  rowReverse: {flexDirection: 'row-reverse'},
  headerBtn: {width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center'},
  headerTitle: {flex: 1, fontSize: 17, fontWeight: '700' as const, color: '#fff'},
  headerSub: {fontSize: 12, color: 'rgba(255,255,255,0.7)'},
  body: {flex: 1},
  bodyContent: {padding: Spacing.md, gap: 10},
  statusBanner: {flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12},
  statusBannerText: {fontSize: 15, fontWeight: '700' as const},
  card: {backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2},
  infoRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  infoLabel: {fontSize: 11, color: Colors.textMuted, fontWeight: '600' as const, textTransform: 'uppercase'},
  infoValue: {fontSize: 14, color: Colors.textPrimary, marginTop: 2},
  returnBtn: {backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6},
  returnBtnText: {color: '#fff', fontWeight: '700' as const, fontSize: 15},
  errorText: {color: Colors.danger, fontSize: 14, textAlign: 'center'},
  retryBtn: {backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10},
  retryText: {color: '#fff', fontWeight: '600' as const},
  // Modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  modalTitle: {fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary},
  modalBody: {padding: 16},
  fieldLabel: {fontSize: 12, fontWeight: '600' as const, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6},
  modalInput: {backgroundColor: Colors.bg, borderRadius: 10, padding: 12, fontSize: 15, color: Colors.textPrimary},
  modalSaveBtn: {backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16},
  modalSaveBtnDisabled: {opacity: 0.5},
  modalSaveBtnText: {color: '#fff', fontWeight: '700' as const, fontSize: 15},
});
