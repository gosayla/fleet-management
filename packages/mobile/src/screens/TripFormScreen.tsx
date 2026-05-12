import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t, isRTL} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {DateTimeWheelModal} from '../components/ui/DateTimeWheelModal';

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const TRIP_TYPES = ['ONE_TIME', 'DAILY', 'MONTHLY_CONTRACT'] as const;
type TripType = (typeof TRIP_TYPES)[number];
const TRIP_TYPE_LABELS: Record<TripType, Record<string, string>> = {
  ONE_TIME:         {en: 'One Time',         ar: 'مرة واحدة',    hi: 'एक बार',       bn: 'একবার',        ur: 'ایک بار'},
  DAILY:            {en: 'Daily',            ar: 'يومية',            hi: 'दैनिक',          bn: 'প্রতিদিন',         ur: 'روزانہ'},
  MONTHLY_CONTRACT: {en: 'Monthly Contract', ar: 'عقد شهري', hi: 'मासिक अनुबंध', bn: 'মাসিক চুক্তি', ur: 'ماہانہ معاہدہ'},
};

const TRIP_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
type TripStatus = (typeof TRIP_STATUSES)[number];
const TRIP_STATUS_LABELS: Record<TripStatus, Record<string, string>> = {
  SCHEDULED:   {en: 'Scheduled',   ar: 'مجدولة',  hi: 'निर्धारिت',    bn: 'নির্ধারিত',     ur: 'طے شدہ'},
  IN_PROGRESS: {en: 'In Progress', ar: 'جارية',    hi: 'जारी',         bn: 'চলতি',          ur: 'جاری'},
  COMPLETED:   {en: 'Completed',   ar: 'مكتملة',  hi: 'पूर्ण',          bn: 'সম্পন্ন',         ur: 'مکمل'},
  CANCELLED:   {en: 'Cancelled',   ar: 'ملغاة',    hi: 'रद्द',          bn: 'বাতিল',          ur: 'منسوخ'},
};

interface DriverOption {id: string; fullName: string; phone: string; licenseNumber: string}
interface VehicleOption {id: string; plateNumber: string; make: string; model: string}

interface FormState {
  name: string;
  origin: string;
  destination: string;
  tripType: TripType;
  scheduledStart: string; // 'YYYY-MM-DD HH:MM'
  scheduledEnd: string;
  notes: string;
  clientName: string;
  contractNumber: string;
  driverId: string;
  vehicleId: string;
  status: TripStatus;
}

const EMPTY: FormState = {
  name: '',
  origin: '',
  destination: '',
  tripType: 'ONE_TIME',
  scheduledStart: '',
  scheduledEnd: '',
  notes: '',
  clientName: '',
  contractNumber: '',
  driverId: '',
  vehicleId: '',
  status: 'SCHEDULED',
};

interface Props {
  locale: Locale;
  tripId?: string;   // undefined = create mode
  onBack: () => void;
  onSuccess: () => void;
}

export function TripFormScreen({locale, tripId, onBack, onSuccess}: Props) {
  const i18n = t(locale);
  const isEdit = !!tripId;
  const rtl = isRTL(locale);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loadingTrip, setLoadingTrip] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [dtPicker, setDtPicker] = useState<'scheduledStart' | 'scheduledEnd' | null>(null);

  const selectedDriver = drivers.find(d => d.id === form.driverId);
  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({...prev, [key]: value}));
  }

  // Load drivers + vehicles for pickers
  useEffect(() => {
    api.get<DriverOption[]>('/drivers').then(d => setDrivers(Array.isArray(d) ? d : [])).catch(() => {});
    api.get<any>('/vehicles?limit=100').then(res => {
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      setVehicles(items);
    }).catch(() => {});
  }, []);

  // Pre-fill when editing
  useEffect(() => {
    if (!tripId) return;
    api.get<any>(`/trips/${tripId}`)
      .then(t => {
        setForm({
          name: t.name ?? '',
          origin: t.origin ?? '',
          destination: t.destination ?? '',
          tripType: (t.tripType as TripType) ?? 'ONE_TIME',
          scheduledStart: t.scheduledStart ? toLocalInput(t.scheduledStart) : '',
          scheduledEnd: t.scheduledEnd ? toLocalInput(t.scheduledEnd) : '',
          notes: t.notes ?? '',
          clientName: t.clientName ?? '',
          contractNumber: t.contractNumber ?? '',
          driverId: t.driverId ?? '',
          vehicleId: t.vehicleId ?? '',
          status: (t.status as TripStatus) ?? 'SCHEDULED',
        });
      })
      .catch(() => setError(i18n.failedToLoadTrip))
      .finally(() => setLoadingTrip(false));
  }, [tripId]);

  async function handleSubmit() {
    setError('');

    if (!form.origin.trim() || !form.destination.trim()) {
      setError(i18n.originRequired);
      return;
    }
    if (!form.driverId) {
      setError(i18n.driverRequiredMsg);
      return;
    }
    if (!form.vehicleId) {
      setError(i18n.vehicleRequiredMsg);
      return;
    }
    if (!form.scheduledStart.trim() || !form.scheduledEnd.trim()) {
      setError(i18n.datesRequiredMsg);
      return;
    }

    const start = parseLocalInput(form.scheduledStart);
    const end   = parseLocalInput(form.scheduledEnd);
    if (!start || !end) {
      setError(i18n.dateFormatError);
      return;
    }
    if (end <= start) {
      setError(i18n.endAfterStart);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        driverId: form.driverId,
        vehicleId: form.vehicleId,
        tripType: form.tripType,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        ...(form.name.trim() ? {name: form.name.trim()} : {}),
        ...(form.notes.trim() ? {notes: form.notes.trim()} : {}),
        ...(form.clientName.trim() ? {clientName: form.clientName.trim()} : {}),
        ...(form.contractNumber.trim() ? {contractNumber: form.contractNumber.trim()} : {}),
      };

      try {
        if (isEdit) {
          await api.patch(`/trips/${tripId}`, {...payload, status: form.status});
        } else {
          await api.post('/trips', payload);
        }
      } catch (e: any) {
        if (!shouldRetryWithoutName(e, payload)) throw e;

        const {name: _name, ...fallbackPayload} = payload;
        if (isEdit) {
          await api.patch(`/trips/${tripId}`, {...fallbackPayload, status: form.status});
        } else {
          await api.post('/trips', fallbackPayload);
        }

        Alert.alert(
          i18n.saved,
          i18n.tripSavedNameMsg,
        );
      }

      onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingTrip) {
    return (
      <View style={styles.loaderWrap}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_H}} />
        <View style={[styles.headerRow, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.8}>
            <AppIcon name="close" size={21} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
          {isEdit ? i18n.editTrip : i18n.addTrip}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, submitting && {opacity: 0.6}]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}>
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveText}>{i18n.save}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.panel} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {!!error && (
            <View style={styles.errorBanner}>
              <AppIcon name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Basic Info */}
          <SectionLabel text={i18n.tripInfoSection} />
          <View style={styles.card}>
            <Field label={i18n.tripNameField}>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => set('name', v)}
                placeholder={i18n.tripNameField}
                placeholderTextColor={Colors.textMuted}
              />
            </Field>
            <Divider />
            <Field label={i18n.originField} required>
              <TextInput
                style={styles.input}
                value={form.origin}
                onChangeText={v => set('origin', v)}
                placeholder={i18n.originField}
                placeholderTextColor={Colors.textMuted}
              />
            </Field>
            <Divider />
            <Field label={i18n.destinationField} required>
              <TextInput
                style={styles.input}
                value={form.destination}
                onChangeText={v => set('destination', v)}
                placeholder={i18n.destinationField}
                placeholderTextColor={Colors.textMuted}
              />
            </Field>
            <Divider />
            <Field label={i18n.tripTypeField}>
              <View style={[styles.pillsRow, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
                {TRIP_TYPES.map(tt => (
                  <TouchableOpacity
                    key={tt}
                    style={[styles.pill, form.tripType === tt && styles.pillActive]}
                    onPress={() => set('tripType', tt)}
                    activeOpacity={0.8}>
                    <Text style={[styles.pillText, form.tripType === tt && styles.pillTextActive]}>
                      {TRIP_TYPE_LABELS[tt][locale] ?? TRIP_TYPE_LABELS[tt].en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
          </View>

          {/* Schedule */}
          <SectionLabel text={i18n.scheduleSection} />
          <View style={styles.card}>
            <Field label={i18n.startDateTimeLabel} required>
              <TouchableOpacity
                style={[styles.dateBtn, {flexDirection: rtl ? 'row' : 'row-reverse'}]}
                onPress={() => setDtPicker('scheduledStart')}
                activeOpacity={0.8}>
                <AppIcon name="calendar-clock" size={18} color={Colors.primary} />
                <Text style={[styles.dateBtnText, !form.scheduledStart && {color: Colors.textMuted}]}>
                  {form.scheduledStart || '2026-05-10 08:00'}
                </Text>
              </TouchableOpacity>
            </Field>
            <Divider />
            <Field label={i18n.endDateTimeLabel} required>
              <TouchableOpacity
                style={[styles.dateBtn, {flexDirection: rtl ? 'row' : 'row-reverse'}]}
                onPress={() => setDtPicker('scheduledEnd')}
                activeOpacity={0.8}>
                <AppIcon name="calendar-clock" size={18} color={Colors.primary} />
                <Text style={[styles.dateBtnText, !form.scheduledEnd && {color: Colors.textMuted}]}>
                  {form.scheduledEnd || '2026-05-10 20:00'}
                </Text>
              </TouchableOpacity>
            </Field>
          </View>

          {/* Driver picker */}
          <SectionLabel text={i18n.driverSection} required />
          <TouchableOpacity
            style={[styles.pickerBtn, {flexDirection: rtl ? 'row' : 'row-reverse'}]}
            onPress={() => setDriverModalOpen(true)}
            activeOpacity={0.8}>
            {selectedDriver ? (
              <View style={[styles.pickerSelected, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
                <View style={styles.pickerAvatar}>
                  <Text style={[styles.pickerAvatarText, {textAlign: rtl ? 'right' : 'left'}]}>
                    {selectedDriver.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={[styles.pickerName, {textAlign: !rtl ? 'right' : 'left'}]}>{selectedDriver.fullName}</Text>
                  <Text style={[styles.pickerSub, {textAlign: !rtl ? 'right' : 'left'}]}>{selectedDriver.phone}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.pickerPlaceholder, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
                <AppIcon name="account-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.pickerPlaceholderText}>
                  {i18n.selectDriverPicker}
                </Text>
              </View>
            )}
            <AppIcon name={rtl ? "chevron-left" : "chevron-right"} size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Vehicle picker */}
          <SectionLabel text={i18n.vehicleSection} required />
          <TouchableOpacity
            style={[styles.pickerBtn, {flexDirection: rtl ? 'row' : 'row-reverse'}]}
            onPress={() => setVehicleModalOpen(true)}
            activeOpacity={0.8}>
            {selectedVehicle ? (
              <View style={[styles.pickerSelected, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
                <View style={[styles.pickerAvatar, {backgroundColor: '#e8f5f4'}]}>
                  <AppIcon name="truck" size={18} color={Colors.primary} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={[styles.pickerName, {textAlign: !rtl ? 'right' : 'left'}]}>{selectedVehicle.plateNumber}</Text>
                  <Text style={[styles.pickerSub, {textAlign: !rtl ? 'right' : 'left'}]}>{selectedVehicle.make} {selectedVehicle.model}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.pickerPlaceholder, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
                <AppIcon name="truck-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.pickerPlaceholderText}>
                  {i18n.selectVehiclePicker}
                </Text>
              </View>
            )}
            <AppIcon name={rtl ? "chevron-left" : "chevron-right"} size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Optional fields */}
          <SectionLabel text={i18n.additionalInfoOpt} />
          <View style={styles.card}>
            <Field label={i18n.clientName}>
              <TextInput
                style={styles.input}
                value={form.clientName}
                onChangeText={v => set('clientName', v)}
                placeholder={i18n.clientName}
                placeholderTextColor={Colors.textMuted}
              />
            </Field>
            <Divider />
            <Field label={i18n.contractNo}>
              <TextInput
                style={styles.input}
                value={form.contractNumber}
                onChangeText={v => set('contractNumber', v)}
                placeholder="CON-2026-001"
                placeholderTextColor={Colors.textMuted}
              />
            </Field>
            <Divider />
            <Field label={i18n.notes}>
              <TextInput
                style={[styles.input, {minHeight: 60}]}
                value={form.notes}
                onChangeText={v => set('notes', v)}
                placeholder={i18n.notes}
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </Field>
          </View>

          {/* Status (edit only) */}
          {isEdit && (
            <>
              <SectionLabel text={i18n.statusSection} />
              <View style={styles.card}>
                {TRIP_STATUSES.map((s, idx) => {
                  const isActive = form.status === s;
                  return (
                    <React.Fragment key={s}>
                      {idx > 0 && <Divider />}
                      <TouchableOpacity
                        style={styles.statusRow}
                        onPress={() => set('status', s)}
                        activeOpacity={0.7}>
                        <Text style={[styles.statusLabel, isActive && {color: Colors.primary, fontWeight: '700' as const}]}>
                          {TRIP_STATUS_LABELS[s][locale] ?? TRIP_STATUS_LABELS[s].en}
                        </Text>
                        {isActive && <AppIcon name="check-circle" size={20} color={Colors.primary} />}
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            </>
          )}

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Driver picker modal */}
      <PickerModal
        visible={driverModalOpen}
        onClose={() => setDriverModalOpen(false)}
        title={i18n.selectDriver}
        isAr={locale === 'ar'}
        items={drivers.map(d => ({
          id: d.id,
          primary: d.fullName,
          secondary: d.phone,
          initials: d.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        }))}
        selectedId={form.driverId}
        onSelect={id => {set('driverId', id); setDriverModalOpen(false);}}
        rtl={rtl}
      />

      {/* Vehicle picker modal */}
      <PickerModal
        visible={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        title={i18n.selectVehicle}
        isAr={locale === 'ar'}
        items={vehicles.map(v => ({
          id: v.id,
          primary: v.plateNumber,
          secondary: `${v.make} ${v.model}`,
        }))}
        selectedId={form.vehicleId}
        onSelect={id => {set('vehicleId', id); setVehicleModalOpen(false);}}
        rtl={rtl}
      />

      {/* Date+Time wheel picker */}
      <DateTimeWheelModal
        visible={dtPicker !== null}
        value={dtPicker ? form[dtPicker] : ''}
        label={dtPicker === 'scheduledStart' ? i18n.startDateTimeLabel : i18n.endDateTimeLabel}
        confirmLabel={i18n.done}
        cancelLabel={i18n.cancel}
        locale={locale}
        onConfirm={val => { if (dtPicker) set(dtPicker, val); }}
        onClose={() => setDtPicker(null)}
      />
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalInput(val: string): Date | null {
  const clean = val.trim().replace('T', ' ');
  // Accepts "YYYY-MM-DD HH:MM" or "YYYY-MM-DD"
  const m = clean.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?$/);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2] ?? '00:00'}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function shouldRetryWithoutName(error: any, payload: Record<string, any>): boolean {
  if (!payload.name) return false;
  const message = error?.response?.data?.message ?? error?.message;
  const text = Array.isArray(message) ? message.join(' ') : String(message ?? '');
  return text.includes('name') && (text.includes('non-whitelisted') || text.includes('غير مسموح بالحقل'));
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({text, required}: {text: string; required?: boolean}) {
  return (
    <Text style={styles.section}>
      {text}
      {required ? <Text style={{color: '#ef4444'}}> *</Text> : null}
    </Text>
  );
}

function Field({label, required, children}: {label: string; required?: boolean; children: React.ReactNode}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? <Text style={{color: '#ef4444'}}> *</Text> : null}</Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

interface PickerItem {id: string; primary: string; secondary: string; initials?: string; rtl?: boolean}
function PickerModal({visible, onClose, title, isAr, items, selectedId, onSelect, rtl}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  isAr: boolean;
  items: PickerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  rtl: boolean;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={[styles.modalHeader, {flexDirection: !rtl ? 'row-reverse' : 'row'}]}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <AppIcon name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            renderItem={({item}) => {
              const isSelected = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, {flexDirection: !rtl ? 'row-reverse' : 'row'}, isSelected && styles.modalItemActive]}
                  onPress={() => onSelect(item.id)}
                  activeOpacity={0.75}>
                  {item.initials ? (
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>{item.initials}</Text>
                    </View>
                  ) : (
                    <View style={[styles.modalAvatar, {backgroundColor: '#e8f5f4'}]}>
                      <AppIcon name="truck" size={18} color={Colors.primary} />
                    </View>
                  )}
                  <View style={{flex: 1}}>
                    <Text style={[styles.modalItemPrimary, {textAlign: !rtl ? 'right' : 'left'}, isSelected && {color: Colors.primary}]}>
                      {item.primary}
                    </Text>
                    <Text style={[styles.modalItemSecondary, {textAlign: !rtl ? 'right' : 'left'}]}>{item.secondary}</Text>
                  </View>
                  {isSelected && <AppIcon name="check-circle" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>{isAr ? 'لا توجد عناصر' : 'No items'}</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loaderWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg},
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {paddingBottom: 24},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  headerTitle: {fontSize: 18, fontWeight: '700' as const, color: '#fff'},
  iconBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)'},
  saveBtn: {minWidth: 62, alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.24)'},
  saveText: {color: '#fff', fontWeight: '700' as const, fontSize: 14},
  panel: {flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20, overflow: 'hidden'},
  content: {paddingHorizontal: Spacing.md, paddingTop: Spacing.md},

  errorBanner: {flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', padding: 12, marginBottom: 12},
  errorText: {flex: 1, fontSize: 13, color: '#dc2626'},

  section: {fontSize: 13, color: Colors.textMuted, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 18, marginBottom: 8},
  card: {backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight, paddingHorizontal: Spacing.md},
  field: {paddingVertical: 12},
  label: {fontSize: 11, color: Colors.textMuted, marginBottom: 6, fontWeight: '600' as const, letterSpacing: 0.3, textTransform: 'uppercase'},
  input: {minHeight: 28, paddingVertical: 0, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' as const},
  divider: {height: 1, backgroundColor: Colors.borderLight},

  dateBtn: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6},
  dateBtnText: {fontSize: 15, color: Colors.textPrimary, fontWeight: '500' as const},

  pillsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4},
  pill: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: '#fff'},
  pillActive: {borderColor: Colors.primary, backgroundColor: Colors.primary},
  pillText: {fontSize: 12, color: Colors.textMuted, fontWeight: '600' as const},
  pillTextActive: {color: '#fff'},

  pickerBtn: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight, paddingHorizontal: Spacing.md, paddingVertical: 14, gap: 12},
  pickerSelected: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12},
  pickerAvatar: {width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center'},
  pickerAvatarText: {fontSize: 14, fontWeight: '700' as const, color: Colors.primary},
  pickerName: {fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary},
  pickerSub: {fontSize: 12, color: Colors.textMuted, marginTop: 1},
  pickerPlaceholder: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10},
  pickerPlaceholderText: {fontSize: 15, color: Colors.textMuted},

  statusRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14},
  statusLabel: {fontSize: 15, color: Colors.textPrimary, fontWeight: '500' as const},

  // Modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%'},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  modalTitle: {fontSize: 17, fontWeight: '700' as const, color: Colors.textPrimary},
  modalClose: {width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center'},
  modalItem: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  modalItemActive: {backgroundColor: Colors.primaryLight},
  modalAvatar: {width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center'},
  modalAvatarText: {fontSize: 14, fontWeight: '700' as const, color: Colors.primary},
  modalItemPrimary: {fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary},
  modalItemSecondary: {fontSize: 12, color: Colors.textMuted, marginTop: 1},
  modalEmpty: {padding: 32, alignItems: 'center'},
  modalEmptyText: {fontSize: 14, color: Colors.textMuted},
});
