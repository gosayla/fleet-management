/**
 * VehicleFormScreen — Create (POST /vehicles) or Edit (PATCH /vehicles/:id)
 * Mirrors the web app's vehicle-form.tsx fields exactly.
 */
import React, {useEffect, useRef, useState} from 'react';
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
} from 'react-native';
import {api} from '../lib/api';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {DateWheelModal} from '../components/ui/DateWheelModal';
import {Locale, t} from '../lib/i18n';
import {VehicleType, VehicleStatus} from '@fleet/shared';

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const VEHICLE_TYPES = Object.values(VehicleType);
const VEHICLE_STATUSES = Object.values(VehicleStatus);

const TYPE_LABELS: Record<VehicleType, Record<string, string>> = {
  SEDAN:           {en: 'Sedan',           ar: 'سيدان',             hi: 'सेडान',      bn: 'সেডান',      ur: 'سیڈان'},
  SUV:             {en: 'SUV',             ar: 'دفع رباعي',         hi: 'एसुवी',       bn: 'এসয়ুভি',       ur: 'ایس یو وی'},
  TRUCK:           {en: 'Truck',           ar: 'شاحنة',             hi: 'ट्रक',      bn: 'ট্রাক',      ur: 'ٹرک'},
  VAN:             {en: 'Van',             ar: 'فان',                hi: 'वैन',        bn: 'ভ্যান',        ur: 'وین'},
  BUS:             {en: 'Bus',             ar: 'حافلة',              hi: 'बस',         bn: 'বাস',         ur: 'بس'},
  MOTORCYCLE:      {en: 'Motorcycle',      ar: 'دراجة',          hi: 'मोटरसाइकिल', bn: 'মোটরসাইকেল', ur: 'موٹرسائیکل'},
  HEAVY_EQUIPMENT: {en: 'Heavy Equipment', ar: 'معدات ثقيلة',  hi: 'भारी उपकरण', bn: 'ভারী যন্ত্রপাতি', ur: 'بھاری آلات'},
};

const STATUS_LABELS: Record<VehicleStatus, Record<string, string>> = {
  ACTIVE:      {en: 'Active',      ar: 'نشط',      hi: 'सक्रिय',  bn: 'সক্রিয়',  ur: 'فعال'},
  MAINTENANCE: {en: 'Maintenance', ar: 'صيانة',  hi: 'रखरखाव', bn: 'রক্ষণাবেক্ষণ', ur: 'دیکھ بھال'},
  INACTIVE:    {en: 'Inactive',    ar: 'غير نشط',  hi: 'निष्क्रिय', bn: 'নিষ্ক্রিয়', ur: 'غیر فعال'},
  RETIRED:     {en: 'Retired',     ar: 'متقاعد',  hi: 'सेवानिवृत्त', bn: 'অবসরপ্রাপ্ত', ur: 'ریٹائرڈ'},
};

interface DriverOption {id: string; fullName: string}

interface Props {
  /** undefined = create mode, string = edit mode */
  vehicleId?: string;
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

interface FormState {
  plateNumber: string;
  vin: string;
  make: string;
  model: string;
  year: string;
  color: string;
  sequenceNumber: string;
  plateType: string;
  bodyType: string;
  type: VehicleType;
  odometer: string;
  fuelCapacity: string;
  // Operation Card
  operationCardNumber: string;
  operationCardIssueDate: string;
  operationCardExpiryDate: string;
  operationCardRenewDate: string;
  // Tamm
  ownershipDate: string;
  licenseIssuanceDate: string;
  inspectionExpiryDate: string;
  licenseExpiryDate: string;
  insuranceExpiryDate: string;
  restrictionStatus: string;
  // Edit only
  status: VehicleStatus;
  assignedDriverId: string;
}

const EMPTY: FormState = {
  plateNumber: '', vin: '', make: '', model: '',
  year: String(new Date().getFullYear()), color: '',
  sequenceNumber: '', plateType: '', bodyType: '',
  type: VehicleType.SEDAN,
  odometer: '0', fuelCapacity: '50',
  operationCardNumber: '', operationCardIssueDate: '', operationCardExpiryDate: '', operationCardRenewDate: '',
  ownershipDate: '', licenseIssuanceDate: '', inspectionExpiryDate: '',
  licenseExpiryDate: '', insuranceExpiryDate: '',
  restrictionStatus: '',
  status: VehicleStatus.ACTIVE, assignedDriverId: '',
};

const EXTRA_LABELS = {
  sequenceNumber: {
    en: 'Sequence Number', ar: 'الرقم التسلسلي', hi: 'सीक्वेंस नंबर', bn: 'সিকোয়েন্স নম্বর', ur: 'سیکوئنس نمبر',
  },
  plateType: {
    en: 'Plate Type', ar: 'نوع اللوحة', hi: 'प्लेट प्रकार', bn: 'প্লেট টাইপ', ur: 'پلیٹ کی قسم',
  },
  bodyType: {
    en: 'Body Type', ar: 'نوع الهيكل', hi: 'बॉडी टाइप', bn: 'বডি টাইপ', ur: 'باڈی ٹائپ',
  },
  ownershipDate: {
    en: 'Ownership Date (Hijri)', ar: 'تاريخ الملكية (هجري)', hi: 'स्वामित्व तिथि (हिजरी)', bn: 'মালিকানা তারিখ (হিজরি)', ur: 'ملکیت کی تاریخ (ہجری)',
  },
  licenseIssuanceDate: {
    en: 'License Issuance Date (Hijri)', ar: 'تاريخ إصدار الرخصة (هجري)', hi: 'लाइसेंस जारी तिथि (हिजरी)', bn: 'লাইসেন্স ইস্যু তারিখ (হিজরি)', ur: 'لائسنس اجراء تاریخ (ہجری)',
  },
  inspectionExpiryDate: {
    en: 'Inspection Expiry Date', ar: 'تاريخ انتهاء الفحص', hi: 'निरीक्षण समाप्ति तिथि', bn: 'ইন্সপেকশন মেয়াদ শেষের তারিখ', ur: 'معائنہ میعاد ختم تاریخ',
  },
  restrictionStatus: {
    en: 'Restriction Status', ar: 'حالة القيود', hi: 'प्रतिबंध स्थिति', bn: 'নিষেধাজ্ঞার অবস্থা', ur: 'پابندی کی حالت',
  },
} as const;

export function VehicleFormScreen({vehicleId, locale, onBack, onSuccess}: Props) {
  const i18n = t(locale);
  const isEdit = !!vehicleId;
  const L = (k: keyof typeof EXTRA_LABELS) => EXTRA_LABELS[k][locale] ?? EXTRA_LABELS[k].en;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loadingVehicle, setLoadingVehicle] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [datePickerField, setDatePickerField] = useState<
    'operationCardIssueDate' |
    'operationCardExpiryDate' |
    'operationCardRenewDate' |
    'inspectionExpiryDate' |
    'insuranceExpiryDate' |
    null
  >(null);
  const [hijriDatePickerField, setHijriDatePickerField] = useState<
    'ownershipDate' |
    'licenseIssuanceDate' |
    'licenseExpiryDate' |
    null
  >(null);

  // Driver search (edit only)
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverQuery, setDriverQuery] = useState('');
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const filteredDrivers = drivers.filter(d =>
    !driverQuery.trim() || d.fullName.toLowerCase().includes(driverQuery.toLowerCase()),
  );
  const selectedDriver = drivers.find(d => d.id === form.assignedDriverId);

  function set(key: keyof FormState, value: string) {
    setForm(prev => ({...prev, [key]: value}));
  }

  // ── Load existing vehicle for edit ───────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    Promise.all([
      api.get<any>(`/vehicles/${vehicleId}`),
      api.get<DriverOption[]>('/drivers'),
    ]).then(([v, d]) => {
      setDrivers(Array.isArray(d) ? d : []);
      const driverName = d.find((dr: DriverOption) => dr.id === v.assignedDriverId)?.fullName ?? '';
      setDriverQuery(driverName);
      setForm({
        plateNumber: v.plateNumber ?? '',
        vin: v.vin ?? '',
        make: v.make ?? '',
        model: v.model ?? '',
        year: String(v.year ?? new Date().getFullYear()),
        color: v.color ?? '',
        sequenceNumber: v.sequenceNumber ?? '',
        plateType: v.plateType ?? '',
        bodyType: v.bodyType ?? '',
        type: v.type ?? VehicleType.SEDAN,
        odometer: String(v.odometer ?? 0),
        fuelCapacity: String(v.fuelCapacity ?? 50),
        operationCardNumber: v.operationCardNumber ?? '',
        operationCardIssueDate: v.operationCardIssueDate ?? '',
        operationCardExpiryDate: v.operationCardExpiryDate ?? '',
        operationCardRenewDate: v.operationCardRenewDate ?? '',
        ownershipDate: v.ownershipDate ?? '',
        licenseIssuanceDate: v.licenseIssuanceDate ?? '',
        inspectionExpiryDate: v.inspectionExpiryDate ?? '',
        licenseExpiryDate: v.licenseExpiryDate ?? '',
        insuranceExpiryDate: v.insuranceExpiryDate ?? '',
        restrictionStatus: v.restrictionStatus ?? '',
        status: v.status ?? VehicleStatus.ACTIVE,
        assignedDriverId: v.assignedDriverId ?? '',
      });
    }).catch(() => setError(i18n.failedToLoadVehicle))
      .finally(() => setLoadingVehicle(false));
  }, [vehicleId]);

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    // Required field validation
    const required: [string, string][] = [
      [form.plateNumber, i18n.plateNumber],
      [form.vin,         i18n.vinField],
      [form.make,        i18n.makeField],
      [form.model,       i18n.modelField],
      [form.year,        i18n.yearField],
      [form.color,       i18n.colorField],
      [form.odometer,    i18n.odometerKm],
      [form.fuelCapacity,i18n.fuelCapacityL],
    ];
    for (const [val, label] of required) {
      if (!val.trim()) {
        setError(i18n.requiredField + ': ' + label);
        return;
      }
    }

    const payload: Record<string, unknown> = {
      plateNumber: form.plateNumber.trim(),
      vin: form.vin.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      color: form.color.trim(),
      ...(form.sequenceNumber.trim() && {sequenceNumber: form.sequenceNumber.trim()}),
      ...(form.plateType.trim() && {plateType: form.plateType.trim()}),
      ...(form.bodyType.trim() && {bodyType: form.bodyType.trim()}),
      type: form.type,
      odometer: Number(form.odometer),
      fuelCapacity: Number(form.fuelCapacity),
      ...(form.operationCardNumber && {operationCardNumber: form.operationCardNumber}),
      ...(form.operationCardIssueDate && {operationCardIssueDate: form.operationCardIssueDate}),
      ...(form.operationCardExpiryDate && {operationCardExpiryDate: form.operationCardExpiryDate}),
      ...(form.operationCardRenewDate && {operationCardRenewDate: form.operationCardRenewDate}),
      ...(form.ownershipDate && {ownershipDate: form.ownershipDate}),
      ...(form.licenseIssuanceDate && {licenseIssuanceDate: form.licenseIssuanceDate}),
      ...(form.inspectionExpiryDate && {inspectionExpiryDate: form.inspectionExpiryDate}),
      ...(form.licenseExpiryDate && {licenseExpiryDate: form.licenseExpiryDate}),
      ...(form.insuranceExpiryDate && {insuranceExpiryDate: form.insuranceExpiryDate}),
      ...(form.restrictionStatus.trim() && {restrictionStatus: form.restrictionStatus.trim()}),
      ...(isEdit && {status: form.status}),
      ...(isEdit && {assignedDriverId: form.assignedDriverId || null}),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/vehicles/${vehicleId}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadingVehicle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const title = isEdit ? i18n.editVehicle : i18n.addVehicle;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={{height: SB_H}} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={onBack} activeOpacity={0.8}>
            <AppIcon name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, submitting && {opacity: 0.6}]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}>
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveBtnText}>{i18n.save}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* White curved panel */}
      <KeyboardAvoidingView
        style={styles.panel}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Error banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <AppIcon name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Section: Basic Info ── */}
          <SectionTitle title={i18n.basicInfo} />
          <View style={styles.card}>
            <FormField label={i18n.plateNumber} required>
              <TextInput
                style={styles.input}
                value={form.plateNumber}
                onChangeText={v => set('plateNumber', v)}
                placeholder="ABC 1234"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.vinField} required>
              <TextInput
                style={styles.input}
                value={form.vin}
                onChangeText={v => set('vin', v)}
                placeholder="ABC123VIN456789"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.makeField} required>
              <TextInput
                style={styles.input}
                value={form.make}
                onChangeText={v => set('make', v)}
                placeholder="Toyota"
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.modelField} required>
              <TextInput
                style={styles.input}
                value={form.model}
                onChangeText={v => set('model', v)}
                placeholder="Hilux"
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.yearField} required>
              <TextInput
                style={styles.input}
                value={form.year}
                onChangeText={v => set('year', v)}
                placeholder="2024"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.colorField} required>
              <TextInput
                style={styles.input}
                value={form.color}
                onChangeText={v => set('color', v)}
                placeholder={i18n.colorField}
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
            <FieldDivider />
            <FormField label={L('sequenceNumber')}>
              <TextInput
                style={styles.input}
                value={form.sequenceNumber}
                onChangeText={v => set('sequenceNumber', v)}
                placeholder="12345678"
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
            <FieldDivider />
            <FormField label={L('plateType')}>
              <TextInput
                style={styles.input}
                value={form.plateType}
                onChangeText={v => set('plateType', v)}
                placeholder={L('plateType')}
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
            <FieldDivider />
            <FormField label={L('bodyType')}>
              <TextInput
                style={styles.input}
                value={form.bodyType}
                onChangeText={v => set('bodyType', v)}
                placeholder={L('bodyType')}
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
          </View>

          {/* ── Section: Vehicle Type ── */}
          <SectionTitle title={i18n.vehicleTypeSection} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typePillRow}>
            {VEHICLE_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typePill, form.type === type && styles.typePillActive]}
                onPress={() => setForm(prev => ({...prev, type}))}
                activeOpacity={0.75}>
                <Text style={[styles.typePillText, form.type === type && styles.typePillTextActive]}>
                  {TYPE_LABELS[type][locale] ?? TYPE_LABELS[type].en}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Section: Measurements ── */}
          <SectionTitle title={i18n.measurementsSection} />
          <View style={styles.card}>
            <FormField label={i18n.odometerKm} required>
              <TextInput
                style={styles.input}
                value={form.odometer}
                onChangeText={v => set('odometer', v)}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.fuelCapacityL} required>
              <TextInput
                style={styles.input}
                value={form.fuelCapacity}
                onChangeText={v => set('fuelCapacity', v)}
                placeholder="70"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </FormField>
          </View>

          {/* ── Section: Operation Card ── */}
          <SectionTitle title={i18n.operationCardSection} />
          <View style={styles.card}>
            <FormField label={i18n.cardNumber}>
              <TextInput
                style={styles.input}
                value={form.operationCardNumber}
                onChangeText={v => set('operationCardNumber', v)}
                placeholder="35-00044426"
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.issueDate}>
              <DateInputRow
                value={form.operationCardIssueDate}
                placeholder="YYYY-MM-DD"
                onChange={v => set('operationCardIssueDate', v)}
                onOpenPicker={() => setDatePickerField('operationCardIssueDate')}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.expiryDateLabel}>
              <DateInputRow
                value={form.operationCardExpiryDate}
                placeholder="YYYY-MM-DD"
                onChange={v => set('operationCardExpiryDate', v)}
                onOpenPicker={() => setDatePickerField('operationCardExpiryDate')}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.renewDate}>
              <DateInputRow
                value={form.operationCardRenewDate}
                placeholder="YYYY-MM-DD"
                onChange={v => set('operationCardRenewDate', v)}
                onOpenPicker={() => setDatePickerField('operationCardRenewDate')}
              />
            </FormField>
          </View>

          {/* ── Section: Tamm / License ── */}
          <SectionTitle title="Tamm" />
          <View style={styles.card}>
            <FormField label={L('ownershipDate')}>
              <DateInputRow
                value={form.ownershipDate}
                onChange={v => set('ownershipDate', v)}
                placeholder="1446-01-01"
                onOpenPicker={() => setHijriDatePickerField('ownershipDate')}
              />
            </FormField>
            <FieldDivider />
            <FormField label={L('licenseIssuanceDate')}>
              <DateInputRow
                value={form.licenseIssuanceDate}
                onChange={v => set('licenseIssuanceDate', v)}
                placeholder="1446-01-01"
                onOpenPicker={() => setHijriDatePickerField('licenseIssuanceDate')}
              />
            </FormField>
            <FieldDivider />
            <FormField label={L('inspectionExpiryDate')}>
              <DateInputRow
                value={form.inspectionExpiryDate}
                placeholder="YYYY-MM-DD"
                onChange={v => set('inspectionExpiryDate', v)}
                onOpenPicker={() => setDatePickerField('inspectionExpiryDate')}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.licenseExpiryVehicle}>
              <DateInputRow
                value={form.licenseExpiryDate}
                onChange={v => set('licenseExpiryDate', v)}
                placeholder="1446-01-01"
                onOpenPicker={() => setHijriDatePickerField('licenseExpiryDate')}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.insuranceExpiry}>
              <DateInputRow
                value={form.insuranceExpiryDate}
                placeholder="YYYY-MM-DD"
                onChange={v => set('insuranceExpiryDate', v)}
                onOpenPicker={() => setDatePickerField('insuranceExpiryDate')}
              />
            </FormField>
            <FieldDivider />
            <FormField label={L('restrictionStatus')}>
              <TextInput
                style={styles.input}
                value={form.restrictionStatus}
                onChangeText={v => set('restrictionStatus', v)}
                placeholder={L('restrictionStatus')}
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
          </View>

          {/* ── Section: Status & Driver (edit only) ── */}
          {isEdit && (
            <>
              <SectionTitle title={i18n.statusAndDriverSection} />
              <View style={styles.card}>
                {/* Status picker */}
                <FormField label={i18n.vehicleStatusLabel}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{marginTop: 6}}>
                    <View style={{flexDirection: 'row', gap: 8, paddingBottom: 4}}>
                      {VEHICLE_STATUSES.map(s => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.statusPill, form.status === s && styles.statusPillActive]}
                          onPress={() => setForm(prev => ({...prev, status: s}))}
                          activeOpacity={0.75}>
                          <Text style={[styles.statusPillText, form.status === s && styles.statusPillTextActive]}>
                            {STATUS_LABELS[s][locale] ?? STATUS_LABELS[s].en}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </FormField>

                <FieldDivider />

                {/* Driver searchable picker */}
                <FormField label={i18n.assignedDriverLabel}>
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() => setDriverPickerOpen(true)}
                    activeOpacity={0.75}>
                    <Text style={[styles.pickerText, !selectedDriver && {color: Colors.textMuted}]}>
                      {selectedDriver?.fullName ?? i18n.unassigned}
                    </Text>
                    <AppIcon name="chevron-down" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </FormField>
              </View>
            </>
          )}

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Driver picker modal ── */}
      <Modal
        visible={driverPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDriverPickerOpen(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDriverPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{i18n.selectDriver}</Text>
            <TextInput
              style={styles.modalSearch}
              value={driverQuery}
              onChangeText={setDriverQuery}
              placeholder={i18n.searchPlaceholder}
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <FlatList
              data={filteredDrivers}
              keyExtractor={d => d.id}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <TouchableOpacity
                  style={styles.driverItem}
                  onPress={() => {
                    setForm(prev => ({...prev, assignedDriverId: ''}));
                    setDriverQuery('');
                    setDriverPickerOpen(false);
                  }}>
                  <Text style={[styles.driverItemText, {color: Colors.textMuted}]}>
                    {i18n.unassigned}
                  </Text>
                </TouchableOpacity>
              }
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.driverItem, form.assignedDriverId === item.id && styles.driverItemActive]}
                  onPress={() => {
                    setForm(prev => ({...prev, assignedDriverId: item.id}));
                    setDriverQuery(item.fullName);
                    setDriverPickerOpen(false);
                  }}>
                  <Text style={[styles.driverItemText, form.assignedDriverId === item.id && {color: Colors.primary, fontWeight: '700' as const}]}>
                    {item.fullName}
                  </Text>
                  {form.assignedDriverId === item.id && (
                    <AppIcon name="check" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.driverEmpty}>{i18n.noDriversFound}</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <DateWheelModal
        visible={datePickerField !== null}
        value={datePickerField ? form[datePickerField] : ''}
        locale={locale}
        cancelLabel={i18n.cancel}
        doneLabel={i18n.done}
        label={
          datePickerField === 'operationCardIssueDate' ? i18n.issueDate :
          datePickerField === 'operationCardExpiryDate' ? i18n.expiryDateLabel :
          datePickerField === 'operationCardRenewDate' ? i18n.renewDate :
          datePickerField === 'inspectionExpiryDate' ? L('inspectionExpiryDate') :
          i18n.insuranceExpiry
        }
        onClose={() => setDatePickerField(null)}
        onConfirm={(date) => {
          if (datePickerField) set(datePickerField, date);
          setDatePickerField(null);
        }}
      />

      <DateWheelModal
        visible={hijriDatePickerField !== null}
        value={hijriDatePickerField ? form[hijriDatePickerField] : ''}
        locale={locale}
        cancelLabel={i18n.cancel}
        doneLabel={i18n.done}
        label={
          hijriDatePickerField === 'ownershipDate' ? L('ownershipDate') :
          hijriDatePickerField === 'licenseIssuanceDate' ? L('licenseIssuanceDate') :
          i18n.licenseExpiryVehicle
        }
        calendar="hijri"
        minYear={1400}
        maxYear={1600}
        onClose={() => setHijriDatePickerField(null)}
        onConfirm={(date) => {
          if (hijriDatePickerField) set(hijriDatePickerField, date);
          setHijriDatePickerField(null);
        }}
      />
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({title}: {title: string}) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function FormField({label, required, children}: {label: string; required?: boolean; children: React.ReactNode}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={{color: '#ef4444'}}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function FieldDivider() {
  return <View style={styles.divider} />;
}

function DateInputRow({
  value,
  placeholder,
  onChange,
  onOpenPicker,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onOpenPicker: () => void;
}) {
  return (
    <View style={styles.dateInputRow}>
      <TextInput
        style={[styles.input, {flex: 1}]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType="numbers-and-punctuation"
      />
      <TouchableOpacity onPress={onOpenPicker} style={styles.dateIconBtn} activeOpacity={0.75}>
        <AppIcon name="calendar-outline" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg},

  // Header
  header: {paddingBottom: 24},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  headerTitle: {fontSize: 18, fontWeight: '700' as const, color: '#fff'},
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 7, minWidth: 60, alignItems: 'center',
  },
  saveBtnText: {color: '#fff', fontWeight: '700' as const, fontSize: 14},

  // Panel
  panel: {
    flex: 1, backgroundColor: Colors.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20, overflow: 'hidden',
  },
  formContent: {paddingHorizontal: Spacing.md, paddingTop: Spacing.md},

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 10,
    borderWidth: 1, borderColor: '#fecaca',
    padding: 12, marginBottom: 12,
  },
  errorText: {flex: 1, fontSize: 13, color: '#dc2626'},

  // Section title
  sectionTitle: {
    fontSize: 13, fontWeight: '700' as const, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 20, marginBottom: 8,
  },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
  },
  divider: {height: 1, backgroundColor: Colors.borderLight},

  // Field
  fieldWrap: {paddingVertical: 12},
  fieldLabel: {fontSize: 11, fontWeight: '600' as const, color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3},
  input: {
    fontSize: 15, color: Colors.textPrimary, fontWeight: '500' as const,
    paddingVertical: 0, minHeight: 28,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },

  // Type pills
  typePillRow: {paddingBottom: 4, gap: 8},
  typePill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  typePillActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  typePillText: {fontSize: 13, fontWeight: '600' as const, color: Colors.textMuted},
  typePillTextActive: {color: '#fff'},

  // Status pills
  statusPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  statusPillActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  statusPillText: {fontSize: 13, fontWeight: '600' as const, color: Colors.textMuted},
  statusPillTextActive: {color: '#fff'},

  // Driver picker trigger
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  pickerText: {fontSize: 15, color: Colors.textPrimary, fontWeight: '500' as const},

  // Modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.md, paddingBottom: 32, maxHeight: '70%',
  },
  modalHandle: {width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginTop: 12, marginBottom: 16},
  modalTitle: {fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 12},
  modalSearch: {
    backgroundColor: Colors.bg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.borderLight,
  },
  driverItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  driverItemActive: {backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 8},
  driverItemText: {fontSize: 14, color: Colors.textPrimary},
  driverEmpty: {textAlign: 'center', color: Colors.textMuted, paddingVertical: 24},
});
