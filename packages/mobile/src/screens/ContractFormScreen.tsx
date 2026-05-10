/**
 * ContractFormScreen — Create (POST /contracts) or Edit (PATCH /contracts/:id)
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import {api} from '../lib/api';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {Locale, t, isRTL as isRTLFn} from '../lib/i18n';
import {DateWheelModal} from '../components/ui/DateWheelModal';

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface DriverOption {id: string; fullName: string; phone: string}
interface VehicleOption {id: string; plateNumber: string; make: string; model: string}

interface FormState {
  vehicleId: string;
  driverId: string;
  clientName: string;
  clientPhone: string;
  contractNumber: string;
  origin: string;
  destination: string;
  contractStart: string;
  contractEnd: string;
  departureTime: string;
  returnTime: string;
  isTwoWay: boolean;
  excludeFridays: boolean;
  excludeSaturdays: boolean;
  notes: string;
}

const EMPTY: FormState = {
  vehicleId: '',
  driverId: '',
  clientName: '',
  clientPhone: '',
  contractNumber: '',
  origin: '',
  destination: '',
  contractStart: '',
  contractEnd: '',
  departureTime: '',
  returnTime: '',
  isTwoWay: true,
  excludeFridays: true,
  excludeSaturdays: false,
  notes: '',
};

interface Props {
  contractId?: string;
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

export function ContractFormScreen({contractId, locale, onBack, onSuccess}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);
  const isEdit = !!contractId;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [datePickerField, setDatePickerField] = useState<'contractStart' | 'contractEnd' | null>(null);

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [driverQuery, setDriverQuery] = useState('');

  const filteredVehicles = vehicles.filter(v =>
    !vehicleQuery.trim() || v.plateNumber.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
    `${v.make} ${v.model}`.toLowerCase().includes(vehicleQuery.toLowerCase()),
  );
  const filteredDrivers = drivers.filter(d =>
    !driverQuery.trim() || d.fullName.toLowerCase().includes(driverQuery.toLowerCase()),
  );

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);
  const selectedDriver = drivers.find(d => d.id === form.driverId);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({...prev, [key]: value}));
  }

  useEffect(() => {
    Promise.all([
      api.get<VehicleOption[]>('/vehicles'),
      api.get<DriverOption[]>('/drivers'),
    ]).then(([v, d]) => {
      setVehicles(Array.isArray(v) ? v : []);
      setDrivers(Array.isArray(d) ? d : []);
    }).catch(() => {});

    if (isEdit) {
      api.get<any>(`/contracts/${contractId}`)
        .then(c => {
          setForm({
            vehicleId: c.vehicleId ?? '',
            driverId: c.driverId ?? '',
            clientName: c.clientName ?? '',
            clientPhone: c.clientPhone ?? '',
            contractNumber: c.contractNumber ?? '',
            origin: c.origin ?? '',
            destination: c.destination ?? '',
            contractStart: c.contractStart ? c.contractStart.slice(0, 10) : '',
            contractEnd: c.contractEnd ? c.contractEnd.slice(0, 10) : '',
            departureTime: c.departureTime ?? '',
            returnTime: c.returnTime ?? '',
            isTwoWay: c.isTwoWay ?? true,
            excludeFridays: c.excludeFridays ?? true,
            excludeSaturdays: c.excludeSaturdays ?? false,
            notes: c.notes ?? '',
          });
        })
        .catch(() => setError(i18n.failedToLoadContract))
        .finally(() => setLoading(false));
    }
  }, [contractId]);

  async function handleSubmit() {
    setError('');
    if (!form.clientName.trim()) { setError(i18n.requiredField + i18n.contractClientName); return; }
    if (!form.origin.trim() || !form.destination.trim()) { setError(i18n.requiredField + i18n.contractOrigin); return; }
    if (!form.contractStart || !form.contractEnd) { setError(i18n.requiredField + i18n.contractStart); return; }
    if (!form.departureTime.trim()) { setError(i18n.requiredField + i18n.departureTime); return; }

    const payload: Record<string, unknown> = {
      clientName: form.clientName.trim(),
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      contractStart: form.contractStart,
      contractEnd: form.contractEnd,
      departureTime: form.departureTime.trim(),
      isTwoWay: form.isTwoWay,
      excludeFridays: form.excludeFridays,
      excludeSaturdays: form.excludeSaturdays,
      ...(form.vehicleId && {vehicleId: form.vehicleId}),
      ...(form.driverId && {driverId: form.driverId}),
      ...(form.clientPhone.trim() && {clientPhone: form.clientPhone.trim()}),
      ...(form.contractNumber.trim() && {contractNumber: form.contractNumber.trim()}),
      ...(form.isTwoWay && form.returnTime.trim() && {returnTime: form.returnTime.trim()}),
      ...(form.notes.trim() && {notes: form.notes.trim()}),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/contracts/${contractId}`, payload);
      } else {
        await api.post('/contracts', payload);
      }
      onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_H}} />
        <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? i18n.editContract : i18n.addContract}
          </Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{i18n.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Client Info */}
        <SectionTitle title={i18n.basicInfo} />
        <View style={styles.card}>
          <FormField label={i18n.contractClientName} required>
            <TextInput
              style={styles.input}
              value={form.clientName}
              onChangeText={v => set('clientName', v)}
              placeholder={i18n.contractClientName}
              placeholderTextColor={Colors.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          <FieldDivider />
          <FormField label={i18n.contractClientPhone}>
            <TextInput
              style={styles.input}
              value={form.clientPhone}
              onChangeText={v => set('clientPhone', v)}
              placeholder={i18n.contractClientPhone}
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          <FieldDivider />
          <FormField label={i18n.contractNumber}>
            <TextInput
              style={styles.input}
              value={form.contractNumber}
              onChangeText={v => set('contractNumber', v)}
              placeholder={i18n.contractNumber}
              placeholderTextColor={Colors.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
        </View>

        {/* Route */}
        <SectionTitle title={locale === 'ar' ? 'المسار' : 'Route'} />
        <View style={styles.card}>
          <FormField label={i18n.contractOrigin} required>
            <TextInput
              style={styles.input}
              value={form.origin}
              onChangeText={v => set('origin', v)}
              placeholder={i18n.contractOrigin}
              placeholderTextColor={Colors.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          <FieldDivider />
          <FormField label={i18n.contractDestination} required>
            <TextInput
              style={styles.input}
              value={form.destination}
              onChangeText={v => set('destination', v)}
              placeholder={i18n.contractDestination}
              placeholderTextColor={Colors.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
        </View>

        {/* Dates & Times */}
        <SectionTitle title={locale === 'ar' ? 'التواريخ والأوقات' : 'Dates & Times'} />
        <View style={styles.card}>
          <FormField label={i18n.contractStart} required>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setDatePickerField('contractStart')}>
              <Text style={form.contractStart ? styles.datePickerText : styles.datePickerPlaceholder}>
                {form.contractStart || 'YYYY-MM-DD'}
              </Text>
              <AppIcon name="calendar" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </FormField>
          <FieldDivider />
          <FormField label={i18n.contractEnd} required>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setDatePickerField('contractEnd')}>
              <Text style={form.contractEnd ? styles.datePickerText : styles.datePickerPlaceholder}>
                {form.contractEnd || 'YYYY-MM-DD'}
              </Text>
              <AppIcon name="calendar" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </FormField>
          <FieldDivider />
          <FormField label={i18n.departureTime} required>
            <TextInput
              style={styles.input}
              value={form.departureTime}
              onChangeText={v => set('departureTime', v)}
              placeholder="HH:MM"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          {form.isTwoWay && (
            <>
              <FieldDivider />
              <FormField label={i18n.returnTime}>
                <TextInput
                  style={styles.input}
                  value={form.returnTime}
                  onChangeText={v => set('returnTime', v)}
                  placeholder="HH:MM"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </FormField>
            </>
          )}
        </View>

        {/* Options */}
        <SectionTitle title={locale === 'ar' ? 'الخيارات' : 'Options'} />
        <View style={styles.card}>
          <View style={[styles.switchRow, isRTL && styles.rowReverse]}>
            <Text style={styles.switchLabel}>{i18n.isTwoWay}</Text>
            <Switch
              value={form.isTwoWay}
              onValueChange={v => set('isTwoWay', v)}
              trackColor={{false: Colors.borderLight, true: Colors.primaryLight}}
              thumbColor={form.isTwoWay ? Colors.primary : '#ccc'}
            />
          </View>
          <FieldDivider />
          <View style={[styles.switchRow, isRTL && styles.rowReverse]}>
            <Text style={styles.switchLabel}>{i18n.excludeFridays}</Text>
            <Switch
              value={form.excludeFridays}
              onValueChange={v => set('excludeFridays', v)}
              trackColor={{false: Colors.borderLight, true: Colors.primaryLight}}
              thumbColor={form.excludeFridays ? Colors.primary : '#ccc'}
            />
          </View>
          <FieldDivider />
          <View style={[styles.switchRow, isRTL && styles.rowReverse]}>
            <Text style={styles.switchLabel}>{i18n.excludeSaturdays}</Text>
            <Switch
              value={form.excludeSaturdays}
              onValueChange={v => set('excludeSaturdays', v)}
              trackColor={{false: Colors.borderLight, true: Colors.primaryLight}}
              thumbColor={form.excludeSaturdays ? Colors.primary : '#ccc'}
            />
          </View>
        </View>

        {/* Vehicle */}
        <SectionTitle title={i18n.contractVehicle} />
        <View style={styles.card}>
          <TouchableOpacity onPress={() => setVehiclePickerOpen(true)} style={styles.pickerBtn}>
            <Text style={[styles.pickerBtnText, !selectedVehicle && styles.pickerPlaceholder]}>
              {selectedVehicle ? `${selectedVehicle.plateNumber} — ${selectedVehicle.make} ${selectedVehicle.model}` : i18n.selectVehiclePicker}
            </Text>
            <AppIcon name="chevron-down" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Driver */}
        <SectionTitle title={i18n.contractDriver} />
        <View style={styles.card}>
          <TouchableOpacity onPress={() => setDriverPickerOpen(true)} style={styles.pickerBtn}>
            <Text style={[styles.pickerBtnText, !selectedDriver && styles.pickerPlaceholder]}>
              {selectedDriver ? selectedDriver.fullName : i18n.selectDriverPicker}
            </Text>
            <AppIcon name="chevron-down" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <SectionTitle title={i18n.contractNotesLabel} />
        <View style={styles.card}>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={form.notes}
            onChangeText={v => set('notes', v)}
            placeholder={i18n.contractNotesLabel}
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        <View style={{height: 40}} />
      </ScrollView>

      {/* Vehicle Picker Modal */}
      <Modal visible={vehiclePickerOpen} transparent animationType="slide" onRequestClose={() => setVehiclePickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.selectVehicle}</Text>
              <TouchableOpacity onPress={() => setVehiclePickerOpen(false)}>
                <AppIcon name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              value={vehicleQuery}
              onChangeText={setVehicleQuery}
              placeholder={i18n.searchVehicles}
              placeholderTextColor={Colors.textMuted}
            />
            <FlatList
              data={filteredVehicles}
              keyExtractor={v => v.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.modalItem, form.vehicleId === item.id && styles.modalItemActive]}
                  onPress={() => { set('vehicleId', item.id); setVehiclePickerOpen(false); }}>
                  <Text style={[styles.modalItemText, form.vehicleId === item.id && styles.modalItemTextActive]}>
                    {item.plateNumber} — {item.make} {item.model}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>{i18n.noVehicles}</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Driver Picker Modal */}
      <Modal visible={driverPickerOpen} transparent animationType="slide" onRequestClose={() => setDriverPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.selectDriver}</Text>
              <TouchableOpacity onPress={() => setDriverPickerOpen(false)}>
                <AppIcon name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              value={driverQuery}
              onChangeText={setDriverQuery}
              placeholder={i18n.searchDrivers}
              placeholderTextColor={Colors.textMuted}
            />
            <FlatList
              data={filteredDrivers}
              keyExtractor={d => d.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.modalItem, form.driverId === item.id && styles.modalItemActive]}
                  onPress={() => { set('driverId', item.id); setDriverPickerOpen(false); }}>
                  <Text style={[styles.modalItemText, form.driverId === item.id && styles.modalItemTextActive]}>
                    {item.fullName}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>{i18n.noDrivers}</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      <DateWheelModal
        visible={datePickerField !== null}
        value={datePickerField ? form[datePickerField] : ''}
        label={datePickerField === 'contractStart' ? i18n.contractStart : i18n.contractEnd}
        onClose={() => setDatePickerField(null)}
        onConfirm={date => {
          if (datePickerField) set(datePickerField, date);
          setDatePickerField(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionTitle({title}: {title: string}) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}
function FormField({label, required, children}: {label: string; required?: boolean; children: React.ReactNode}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      {children}
    </View>
  );
}
function FieldDivider() {
  return <View style={styles.divider} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg},
  header: {backgroundColor: Colors.primary},
  headerRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10, gap: 12},
  rowReverse: {flexDirection: 'row-reverse'},
  headerBtn: {width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center'},
  headerTitle: {flex: 1, fontSize: 18, fontWeight: '700' as const, color: '#fff', textAlign: 'center'},
  saveBtn: {backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8},
  saveBtnText: {color: '#fff', fontWeight: '700' as const, fontSize: 14},
  body: {flex: 1, backgroundColor: Colors.bg},
  bodyContent: {padding: Spacing.md, paddingTop: Spacing.sm, gap: 6},
  errorText: {color: Colors.danger, fontSize: 13, padding: 12, backgroundColor: Colors.dangerLight, borderRadius: 10},
  sectionTitle: {fontSize: 12, fontWeight: '700' as const, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 10, marginBottom: 4, paddingHorizontal: 4},
  card: {backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1},
  fieldWrap: {paddingHorizontal: 14, paddingVertical: 10},
  fieldLabel: {fontSize: 11, fontWeight: '600' as const, color: Colors.textMuted, marginBottom: 4, textTransform: 'uppercase'},
  input: {fontSize: 15, color: Colors.textPrimary, paddingVertical: 2},
  notesInput: {minHeight: 80},
  divider: {height: 1, backgroundColor: Colors.borderLight, marginHorizontal: 14},
  switchRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12},
  switchLabel: {fontSize: 15, color: Colors.textPrimary, flex: 1},
  pickerBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14},
  datePickerBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4},
  datePickerText: {fontSize: 15, color: Colors.textPrimary, flex: 1},
  datePickerPlaceholder: {fontSize: 15, color: Colors.textMuted, flex: 1},
  pickerBtnText: {fontSize: 15, color: Colors.textPrimary, flex: 1},
  pickerPlaceholder: {color: Colors.textMuted},
  // Modals
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 24},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  modalTitle: {fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary},
  modalSearch: {margin: 12, padding: 10, borderRadius: 10, backgroundColor: Colors.bg, fontSize: 14, color: Colors.textPrimary},
  modalItem: {paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  modalItemActive: {backgroundColor: Colors.primaryLight},
  modalItemText: {fontSize: 15, color: Colors.textPrimary},
  modalItemTextActive: {color: Colors.primary, fontWeight: '700' as const},
  modalEmpty: {padding: 24, textAlign: 'center', color: Colors.textMuted},
});
