import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { api } from '../lib/api';
import { Locale, t, isRTL } from '../lib/i18n';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Alert } from '../lib/alert';

const SB_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type: string;
  status: string;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  costSar?: number;
  odometerAtService?: number;
  nextServiceKm?: number;
  nextServiceDate?: string;
  vehicle?: { plateNumber: string; make: string; model: string };
}

interface Props {
  maintenanceId: string;
  locale: Locale;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

function fmtDate(iso?: string) {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function MaintenanceDetailScreen({
  maintenanceId,
  locale,
  onBack,
  onEdit,
  onDeleted,
}: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const [log, setLog] = useState<MaintenanceLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [costInput, setCostInput] = useState('');
  const [odometerInput, setOdometerInput] = useState('');
  const [completing, setCompleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<MaintenanceLog>(
        `/maintenance/${maintenanceId}`
      );
      setLog(data);
    } catch {}
    setLoading(false);
  }, [maintenanceId]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, [load]);

  async function startWork() {
    Alert.alert(i18n.maintenanceStartWork, i18n.maintenanceStartWorkConfirm, [
      { text: i18n.cancel, style: 'cancel' },
      {
        text: i18n.confirm,
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.patch(`/maintenance/${maintenanceId}`, {
              status: 'IN_PROGRESS',
            });
            await load();
          } catch {}
          setActionLoading(false);
        },
      },
    ]);
  }

  async function cancelMaintenance() {
    Alert.alert(i18n.cancelMaintenance, i18n.cancelMaintenanceConfirm, [
      { text: i18n.cancel, style: 'cancel' },
      {
        text: i18n.confirm,
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.patch(`/maintenance/${maintenanceId}`, {
              status: 'CANCELLED',
            });
            await load();
          } catch {}
          setActionLoading(false);
        },
      },
    ]);
  }

  async function completeMaintenance() {
    setCompleting(true);
    try {
      const payload: any = {
        status: 'COMPLETED',
        completedDate: new Date().toISOString(),
      };
      if (costInput.trim()) {
        payload.costSar = parseFloat(costInput);
      }
      if (odometerInput.trim()) {
        payload.odometerAtService = parseFloat(odometerInput);
      }
      await api.patch(`/maintenance/${maintenanceId}`, payload);
      setCompleteModalOpen(false);
      await load();
    } catch {}
    setCompleting(false);
  }

  async function deleteMaintenance() {
    Alert.alert(i18n.deleteLabel, i18n.deleteMaintenanceConfirm, [
      { text: i18n.cancel, style: 'cancel' },
      {
        text: i18n.deleteLabel,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/maintenance/${maintenanceId}`);
            onDeleted();
          } catch {}
        },
      },
    ]);
  }

  function statusColors(status: string) {
    switch (status) {
      case 'PENDING':
        return { bg: '#FFF8E1', color: '#F57F17' };
      case 'IN_PROGRESS':
        return { bg: '#E3F2FD', color: '#1565C0' };
      case 'COMPLETED':
        return { bg: '#E8F5E9', color: '#2E7D32' };
      case 'CANCELLED':
        return { bg: Colors.borderLight, color: Colors.textMuted };
      default:
        return { bg: Colors.borderLight, color: Colors.textMuted };
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'PENDING':
        return i18n.maintenancePending;
      case 'IN_PROGRESS':
        return i18n.maintenanceInProgress;
      case 'COMPLETED':
        return i18n.maintenanceCompleted;
      case 'CANCELLED':
        return i18n.maintenanceCancelled;
      default:
        return status;
    }
  }

  function typeLabel(type: string) {
    switch (type) {
      case 'SCHEDULED':
        return i18n.maintenanceTypeScheduled;
      case 'UNSCHEDULED':
        return i18n.maintenanceTypeUnscheduled;
      case 'EMERGENCY':
        return i18n.maintenanceTypeEmergency;
      default:
        return type;
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!log) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.couldNotLoad}</Text>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{i18n.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sc = statusColors(log.status);
  const canStart = log.status === 'PENDING';
  const canComplete = log.status === 'IN_PROGRESS';
  const canCancel = log.status === 'PENDING' || log.status === 'IN_PROGRESS';
  const canEdit = log.status !== 'CANCELLED' && log.status !== 'COMPLETED';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ height: SB_HEIGHT }} />
        <View
          style={[
            styles.headerRow,
            { flexDirection: !rtl ? 'row-reverse' : 'row' },
          ]}
        >
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <AppIcon
              name={rtl ? 'arrow-right' : 'arrow-left'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.viewMaintenance}</Text>
          <View style={styles.headerRight}>
            {canEdit && (
              <TouchableOpacity onPress={onEdit} style={styles.iconBtn}>
                <AppIcon name="pencil" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={deleteMaintenance}
              style={styles.iconBtn}
            >
              <AppIcon name="trash-can-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusBannerText, { color: sc.color }]}>
            {statusLabel(log.status)}
          </Text>
        </View>

        {/* Vehicle */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{i18n.vehicleSection}</Text>
          <View style={styles.vehicleRow}>
            <AppIcon name="truck-outline" size={20} color={Colors.primary} />
            <View style={{ marginStart: 10, flex: 1 }}>
              <Text style={styles.plateText}>
                {log.vehicle?.plateNumber ?? '—'}
              </Text>
              {log.vehicle && (
                <Text style={styles.subText}>
                  {log.vehicle.make} {log.vehicle.model}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Main info */}
        <View style={styles.card}>
          <Row label={i18n.maintenanceType} value={typeLabel(log.type)} />
          <Divider />
          <Row label={i18n.maintenanceDescription} value={log.description} />
          <Divider />
          <Row
            label={i18n.scheduledDateLabel}
            value={fmtDate(log.scheduledDate)}
          />
          {log.completedDate && (
            <>
              <Divider />
              <Row
                label={i18n.completedDateLabel}
                value={fmtDate(log.completedDate)}
              />
            </>
          )}
          {log.costSar != null && (
            <>
              <Divider />
              <Row
                label={i18n.costSarLabel}
                value={`${log.costSar} ${i18n.sarUnit}`}
              />
            </>
          )}
          {log.odometerAtService != null && (
            <>
              <Divider />
              <Row
                label={i18n.odometerAtServiceLabel}
                value={`${log.odometerAtService} ${i18n.kmUnit}`}
              />
            </>
          )}
        </View>

        {/* Next service */}
        {(log.nextServiceKm != null || log.nextServiceDate) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{i18n.nextServiceSection}</Text>
            {log.nextServiceKm != null && (
              <>
                <Row
                  label={i18n.nextServiceKmLabel}
                  value={`${log.nextServiceKm} ${i18n.kmUnit}`}
                />
              </>
            )}
            {log.nextServiceDate && (
              <>
                {log.nextServiceKm != null && <Divider />}
                <Row
                  label={i18n.nextServiceDateLabel}
                  value={fmtDate(log.nextServiceDate)}
                />
              </>
            )}
          </View>
        )}

        {/* Actions */}
        {actionLoading && (
          <ActivityIndicator
            color={Colors.primary}
            style={{ marginVertical: 8 }}
          />
        )}
        {!actionLoading && (
          <View style={styles.actionsRow}>
            {canStart && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#1565C0' }]}
                onPress={startWork}
              >
                <AppIcon name="wrench" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {i18n.maintenanceStartWork}
                </Text>
              </TouchableOpacity>
            )}
            {canComplete && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                onPress={() => setCompleteModalOpen(true)}
              >
                <AppIcon name="check-circle-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {i18n.maintenanceComplete}
                </Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.danger }]}
                onPress={cancelMaintenance}
              >
                <AppIcon name="close-circle-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {i18n.cancelMaintenance}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Complete modal */}
      <Modal
        visible={completeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCompleteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.maintenanceComplete}</Text>
              <TouchableOpacity onPress={() => setCompleteModalOpen(false)}>
                <AppIcon name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>{i18n.maintenanceCompleteHint}</Text>
            <Text style={styles.fieldLabel}>{i18n.costSarLabel}</Text>
            <TextInput
              style={styles.input}
              value={costInput}
              onChangeText={setCostInput}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.fieldLabel}>{i18n.odometerAtServiceLabel}</Text>
            <TextInput
              style={styles.input}
              value={odometerInput}
              onChangeText={setOdometerInput}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.confirmBtn, completing && { opacity: 0.6 }]}
              onPress={completeMaintenance}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>{i18n.confirm}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRight: { flexDirection: 'row' },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  statusBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  statusBannerText: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  plateText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  subText: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 14, color: Colors.textMuted, flex: 1 },
  rowValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: Colors.borderLight },
  actionsRow: { gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorText: { color: Colors.textMuted, fontSize: 15, marginBottom: 12 },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontWeight: '700' },
  // complete modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalSub: { fontSize: 14, color: Colors.textMuted, marginBottom: 20 },
  fieldLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
