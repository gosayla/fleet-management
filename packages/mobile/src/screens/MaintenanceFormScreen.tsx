import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {DateWheelModal} from '../components/ui/DateWheelModal';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface VehicleOption {id: string; plateNumber: string; make: string; model: string}

const MAINTENANCE_TYPES = ['SCHEDULED', 'UNSCHEDULED', 'EMERGENCY'] as const;
const MAINTENANCE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

interface Props {
  maintenanceId?: string;
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

function SectionLabel({text, required}: {text: string; required?: boolean}) {
  return (
    <Text style={styles.sectionLabel}>
      {text}{required ? <Text style={{color: Colors.danger}}> *</Text> : null}
    </Text>
  );
}

export function MaintenanceFormScreen({maintenanceId, locale, onBack, onSuccess}: Props) {
  const i18n = t(locale);
  const isEdit = !!maintenanceId;

  const [form, setForm] = useState({
    vehicleId: '',
    type: 'SCHEDULED' as typeof MAINTENANCE_TYPES[number],
    description: '',
    scheduledDate: '',
    nextServiceKm: '',
    nextServiceDate: '',
    // edit-only
    status: 'PENDING' as typeof MAINTENANCE_STATUSES[number],
    completedDate: '',
    costSar: '',
    odometerAtService: '',
  });

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [datePickerField, setDatePickerField] = useState<'scheduledDate' | 'nextServiceDate' | 'completedDate' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load vehicles
  useEffect(() => {
    api.get<any>('/vehicles?limit=100').then(res => {
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      setVehicles(items);
    }).catch(() => {});
  }, []);

  // Pre-fill when editing
  useEffect(() => {
    if (!isEdit) return;
    api.get<any>(`/maintenance/${maintenanceId}`).then(m => {
      setForm({
        vehicleId: m.vehicleId ?? '',
        type: m.type ?? 'SCHEDULED',
        description: m.description ?? '',
        scheduledDate: m.scheduledDate ? m.scheduledDate.slice(0, 10) : '',
        nextServiceKm: m.nextServiceKm != null ? String(m.nextServiceKm) : '',
        nextServiceDate: m.nextServiceDate ? m.nextServiceDate.slice(0, 10) : '',
        status: m.status ?? 'PENDING',
        completedDate: m.completedDate ? m.completedDate.slice(0, 10) : '',
        costSar: m.costSar != null ? String(m.costSar) : '',
        odometerAtService: m.odometerAtService != null ? String(m.odometerAtService) : '',
      });
    }).catch(() => {});
  }, [maintenanceId]);

  function set(key: string, value: string) {
    setForm(prev => ({...prev, [key]: value}));
  }

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);
  const filteredVehicles = vehicleQuery.trim()
    ? vehicles.filter(v =>
        v.plateNumber.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
        `${v.make} ${v.model}`.toLowerCase().includes(vehicleQuery.toLowerCase())
      )
    : vehicles;

  function typeLabel(type: string) {
    switch (type) {
      case 'SCHEDULED':   return i18n.maintenanceTypeScheduled;
      case 'UNSCHEDULED': return i18n.maintenanceTypeUnscheduled;
      case 'EMERGENCY':   return i18n.maintenanceTypeEmergency;
      default: return type;
    }
  }

  function statusLabel(s: string) {
    switch (s) {
      case 'PENDING':     return i18n.maintenancePending;
      case 'IN_PROGRESS': return i18n.maintenanceInProgress;
      case 'COMPLETED':   return i18n.maintenanceCompleted;
      case 'CANCELLED':   return i18n.maintenanceCancelled;
      default: return s;
    }
  }

  async function save() {
    if (!form.vehicleId) { setError(i18n.vehicleRequiredMsg); return; }
    if (!form.description.trim()) { setError(i18n.maintenanceDescriptionRequired); return; }
    if (!form.scheduledDate) { setError(i18n.scheduledDateRequired); return; }

    setError('');
    setLoading(true);
    try {
      const payload: any = {
        vehicleId: form.vehicleId,
        type: form.type,
        description: form.description.trim(),
        scheduledDate: new Date(form.scheduledDate).toISOString(),
      };
      if (form.nextServiceKm.trim()) payload.nextServiceKm = parseFloat(form.nextServiceKm);
      if (form.nextServiceDate) payload.nextServiceDate = new Date(form.nextServiceDate).toISOString();

      if (isEdit) {
        payload.status = form.status;
        if (form.completedDate) payload.completedDate = new Date(form.completedDate).toISOString();
        if (form.costSar.trim()) payload.costSar = parseFloat(form.costSar);
        if (form.odometerAtService.trim()) payload.odometerAtService = parseFloat(form.odometerAtService);
        await api.patch(`/maintenance/${maintenanceId}`, payload);
      } else {
        await api.post('/maintenance', payload);
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? i18n.error);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <AppIcon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? i18n.editMaintenance : i18n.addMaintenance}</Text>
          <TouchableOpacity onPress={save} style={styles.saveBtn} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>{i18n.save}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!!error && <Text style={styles.errorBanner}>{error}</Text>}

        {/* Vehicle picker */}
        <SectionLabel text={i18n.vehicleSection} required />
        <TouchableOpacity style={styles.pickerRow} onPress={() => setVehiclePickerOpen(true)} activeOpacity={0.7}>
          {selectedVehicle ? (
            <View style={styles.pickerSelected}>
              <View style={styles.plateBadge}>
                <Text style={styles.plateBadgeText}>{selectedVehicle.plateNumber}</Text>
              </View>
              <Text style={styles.pickerName}>{selectedVehicle.make} {selectedVehicle.model}</Text>
            </View>
          ) : (
            <Text style={styles.pickerPlaceholder}>{i18n.selectVehiclePicker}</Text>
          )}
          <AppIcon name="chevron-down" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Type selector */}
        <SectionLabel text={i18n.maintenanceType} required />
        <View style={styles.typeRow}>
          {MAINTENANCE_TYPES.map(tp => (
            <TouchableOpacity
              key={tp}
              style={[styles.typeBtn, form.type === tp && styles.typeBtnActive]}
              onPress={() => set('type', tp)}>
              <Text style={[styles.typeBtnText, form.type === tp && styles.typeBtnTextActive]}>
                {typeLabel(tp)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <SectionLabel text={i18n.maintenanceDescription} required />
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.description}
          onChangeText={v => set('description', v)}
          placeholder={i18n.maintenanceDescriptionPlaceholder}
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
        />

        {/* Scheduled date */}
        <SectionLabel text={i18n.scheduledDateLabel} required />
        <TouchableOpacity style={styles.dateRow} onPress={() => setDatePickerField('scheduledDate')}>
          <Text style={form.scheduledDate ? styles.dateValue : styles.datePlaceholder}>
            {form.scheduledDate || 'YYYY-MM-DD'}
          </Text>
          <AppIcon name="calendar" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* Optional: next service */}
        <SectionLabel text={i18n.nextServiceKmLabel} />
        <TextInput
          style={styles.input}
          value={form.nextServiceKm}
          onChangeText={v => set('nextServiceKm', v)}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />

        <SectionLabel text={i18n.nextServiceDateLabel} />
        <TouchableOpacity style={styles.dateRow} onPress={() => setDatePickerField('nextServiceDate')}>
          <Text style={form.nextServiceDate ? styles.dateValue : styles.datePlaceholder}>
            {form.nextServiceDate || 'YYYY-MM-DD'}
          </Text>
          <AppIcon name="calendar" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* Edit-only: status + completion details */}
        {isEdit && (
          <>
            <SectionLabel text={i18n.maintenanceStatusLabel} />
            <View style={styles.typeRow}>
              {MAINTENANCE_STATUSES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.typeBtn, form.status === s && styles.typeBtnActive]}
                  onPress={() => set('status', s)}>
                  <Text style={[styles.typeBtnText, form.status === s && styles.typeBtnTextActive]}>
                    {statusLabel(s)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <SectionLabel text={i18n.completedDateLabel} />
            <TouchableOpacity style={styles.dateRow} onPress={() => setDatePickerField('completedDate')}>
              <Text style={form.completedDate ? styles.dateValue : styles.datePlaceholder}>
                {form.completedDate || 'YYYY-MM-DD'}
              </Text>
              <AppIcon name="calendar" size={20} color={Colors.primary} />
            </TouchableOpacity>

            <SectionLabel text={i18n.costSarLabel} />
            <TextInput
              style={styles.input}
              value={form.costSar}
              onChangeText={v => set('costSar', v)}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <SectionLabel text={i18n.odometerAtServiceLabel} />
            <TextInput
              style={styles.input}
              value={form.odometerAtService}
              onChangeText={v => set('odometerAtService', v)}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* Vehicle picker modal */}
      {vehiclePickerOpen && (
        <View style={styles.pickerModal}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{i18n.selectVehicle}</Text>
              <TouchableOpacity onPress={() => setVehiclePickerOpen(false)}>
                <AppIcon name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchWrap}>
              <AppIcon name="magnify" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.pickerSearch}
                value={vehicleQuery}
                onChangeText={setVehicleQuery}
                placeholder={i18n.searchVehicles}
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
            </View>
            {filteredVehicles.map(v => (
              <TouchableOpacity
                key={v.id}
                style={[styles.pickerItem, form.vehicleId === v.id && styles.pickerItemActive]}
                onPress={() => { set('vehicleId', v.id); setVehiclePickerOpen(false); setVehicleQuery(''); }}>
                <View style={styles.pickerItemIcon}>
                  <AppIcon name="truck-outline" size={20} color={Colors.primary} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.pickerItemPlate}>{v.plateNumber}</Text>
                  <Text style={styles.pickerItemSub}>{v.make} {v.model}</Text>
                </View>
                {form.vehicleId === v.id && <AppIcon name="check" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
            {filteredVehicles.length === 0 && (
              <Text style={styles.pickerEmpty}>{i18n.noVehicles}</Text>
            )}
          </View>
        </View>
      )}

      {/* Date picker modals */}
      <DateWheelModal
        visible={datePickerField === 'scheduledDate'}
        value={form.scheduledDate}
        label={i18n.scheduledDateLabel}
        onConfirm={d => { set('scheduledDate', d); setDatePickerField(null); }}
        onClose={() => setDatePickerField(null)}
      />
      <DateWheelModal
        visible={datePickerField === 'nextServiceDate'}
        value={form.nextServiceDate}
        label={i18n.nextServiceDateLabel}
        onConfirm={d => { set('nextServiceDate', d); setDatePickerField(null); }}
        onClose={() => setDatePickerField(null)}
      />
      {isEdit && (
        <DateWheelModal
          visible={datePickerField === 'completedDate'}
          value={form.completedDate}
          label={i18n.completedDateLabel}
          onConfirm={d => { set('completedDate', d); setDatePickerField(null); }}
          onClose={() => setDatePickerField(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg},
  headerRow: {flexDirection: 'row', alignItems: 'center', paddingBottom: 14},
  headerTitle: {flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center'},
  iconBtn: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  saveBtn: {backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8},
  saveBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
  scroll: {flex: 1, backgroundColor: '#f5f5f5'},
  scrollContent: {padding: Spacing.lg},
  errorBanner: {backgroundColor: Colors.dangerLight, color: Colors.danger, padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 14},
  sectionLabel: {fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16},
  input: {backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.borderLight},
  multiline: {height: 90, textAlignVertical: 'top'},
  dateRow: {backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.borderLight},
  dateValue: {fontSize: 15, color: Colors.textPrimary},
  datePlaceholder: {fontSize: 15, color: Colors.textMuted},
  pickerRow: {backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight},
  pickerSelected: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10},
  pickerPlaceholder: {flex: 1, fontSize: 15, color: Colors.textMuted},
  pickerName: {fontSize: 15, color: Colors.textPrimary, fontWeight: '600'},
  plateBadge: {backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8},
  plateBadgeText: {fontSize: 13, color: Colors.primary, fontWeight: '700'},
  typeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  typeBtn: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.borderLight},
  typeBtnActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  typeBtnText: {fontSize: 13, color: Colors.textMuted, fontWeight: '600'},
  typeBtnTextActive: {color: '#fff'},
  // vehicle picker modal
  pickerModal: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  pickerSheet: {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 30},
  pickerModalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  pickerModalTitle: {fontSize: 17, fontWeight: '700', color: Colors.textPrimary},
  pickerSearchWrap: {flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8},
  pickerSearch: {flex: 1, marginStart: 8, fontSize: 15, color: Colors.textPrimary},
  pickerItem: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12},
  pickerItemActive: {backgroundColor: Colors.primaryLight},
  pickerItemIcon: {width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  pickerItemPlate: {fontSize: 15, fontWeight: '700', color: Colors.textPrimary},
  pickerItemSub: {fontSize: 12, color: Colors.textMuted},
  pickerEmpty: {padding: 20, textAlign: 'center', color: Colors.textMuted},
});
