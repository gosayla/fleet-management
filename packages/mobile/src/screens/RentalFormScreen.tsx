/**
 * RentalFormScreen — Create (POST /rentals) or Edit (PATCH /rentals/:id)
 */
import React, { useEffect, useState } from 'react';
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
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { Alert } from '../lib/alert';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { ensureCameraPermission, ensureMediaPermission } from '../lib/permissions';
import { api } from '../lib/api';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Locale, t, isRTL as isRTLFn } from '../lib/i18n';
import { DateWheelModal } from '../components/ui/DateWheelModal';
import { SignaturePad } from '../components/ui/SignaturePad';

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

// ── Handover checklist ───────────────────────────────────────────────────────

const HANDOVER_CHECKLIST = [
  { id: 'vehicle_keys',      en: 'Vehicle Keys',     ar: 'مفاتيح المركبة' },
  { id: 'spare_tire',        en: 'Spare Tire',        ar: 'الإطار الاحتياطي' },
  { id: 'jack',              en: 'Jack',              ar: 'الرافعة' },
  { id: 'toolkit',           en: 'Toolkit',           ar: 'حقيبة الأدوات' },
  { id: 'warning_triangle',  en: 'Warning Triangle',  ar: 'مثلث التحذير' },
  { id: 'fire_extinguisher', en: 'Fire Extinguisher', ar: 'طفاية الحريق' },
  { id: 'first_aid_kit',     en: 'First Aid Kit',     ar: 'حقيبة الإسعافات' },
  { id: 'front_camera',      en: 'Front Camera',      ar: 'كاميرا أمامية' },
  { id: 'rear_camera',       en: 'Rear Camera',       ar: 'كاميرا خلفية' },
  { id: 'dashboard_screen',  en: 'Dashboard Screen',  ar: 'شاشة لوحة القيادة' },
  { id: 'registration_card', en: 'Registration Card', ar: 'وثيقة التسجيل' },
  { id: 'insurance_card',    en: 'Insurance Card',    ar: 'وثيقة التأمين' },
  { id: 'fuel_card',         en: 'Fuel Card',         ar: 'بطاقة الوقود' },
  { id: 'floor_mats',        en: 'Floor Mats',        ar: 'سجادة المركبة' },
] as const;

interface VehicleOption {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

interface FormState {
  vehicleId: string;
  clientName: string;
  clientPhone: string;
  clientNationalId: string;
  contractNumber: string;
  rentalStart: string;
  rentalEnd: string;
  odometerOut: string;
  dailyRateSar: string;
  contractFileUrl: string;
  notes: string;
}

const EMPTY: FormState = {
  vehicleId: '',
  clientName: '',
  clientPhone: '',
  clientNationalId: '',
  contractNumber: '',
  rentalStart: '',
  rentalEnd: '',
  odometerOut: '',
  dailyRateSar: '',
  contractFileUrl: '',
  notes: '',
};

interface Props {
  rentalId?: string;
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

export function RentalFormScreen({
  rentalId,
  locale,
  onBack,
  onSuccess,
}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);
  const isEdit = !!rentalId;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [datePickerField, setDatePickerField] = useState<
    'rentalStart' | 'rentalEnd' | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');

  // Handover state
  const [fuelLevel, setFuelLevel] = useState<number | null>(null);
  const [conditionRating, setConditionRating] = useState<'GOOD' | 'FAIR' | 'POOR' | null>(null);
  const [conditionPhotos, setConditionPhotos] = useState<{ localUri: string; serverUrl: string }[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [clientSigUrl, setClientSigUrl] = useState('');
  const [managerSigUrl, setManagerSigUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const filteredVehicles = vehicles.filter(
    (v) =>
      !vehicleQuery.trim() ||
      v.plateNumber.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
      `${v.make} ${v.model}`.toLowerCase().includes(vehicleQuery.toLowerCase())
  );
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadConditionPhotoAsset(asset: { uri: string; fileName?: string | null; type?: string | null }) {
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        type: asset.type ?? 'image/jpeg',
      } as any);
      const res = await api.upload<{ fileUrl: string }>('/documents/files', fd);
      setConditionPhotos((prev) => [...prev, { localUri: asset.uri, serverUrl: res.fileUrl }]);
    } catch {
      // silently ignore
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleAddConditionPhoto() {
    Alert.alert(i18n.addConditionPhoto ?? 'Add Photo', '', [
      {
        text: i18n.camera ?? 'Camera',
        onPress: async () => {
          const granted = await ensureCameraPermission();
          if (!granted) return;
          launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false }, (result) => {
            const asset = result.assets?.[0];
            if (asset?.uri) uploadConditionPhotoAsset(asset);
          });
        },
      },
      {
        text: i18n.gallery ?? 'Gallery',
        onPress: async () => {
          const granted = await ensureMediaPermission();
          if (!granted) return;
          launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (result) => {
            const asset = result.assets?.[0];
            if (asset?.uri) uploadConditionPhotoAsset(asset);
          });
        },
      },
      { text: i18n.cancel ?? 'Cancel', style: 'cancel' },
    ]);
  }

  useEffect(() => {
    api
      .get<any>('/vehicles?limit=100')
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.data ?? [];
        setVehicles(items);
      })
      .catch(() => {});

    if (isEdit) {
      api
        .get<any>(`/rentals/${rentalId}`)
        .then((r) => {
          setForm({
            vehicleId: r.vehicleId ?? '',
            clientName: r.clientName ?? '',
            clientPhone: r.clientPhone ?? '',
            clientNationalId: r.clientNationalId ?? '',
            contractNumber: r.contractNumber ?? '',
            rentalStart: r.rentalStart ? r.rentalStart.slice(0, 10) : '',
            rentalEnd: r.rentalEnd ? r.rentalEnd.slice(0, 10) : '',
            odometerOut: r.odometerOut != null ? String(r.odometerOut) : '',
            dailyRateSar: r.dailyRateSar != null ? String(r.dailyRateSar) : '',
            contractFileUrl: r.contractFileUrl ?? '',
            notes: r.notes ?? '',
          });
        })
        .catch(() => setError(i18n.failedToLoadRental))
        .finally(() => setLoading(false));
    }
  }, [i18n.failedToLoadRental, isEdit, rentalId]);

  async function handleSubmit() {
    setError('');
    if (!form.clientName.trim()) {
      setError(i18n.requiredField + i18n.rentalClientName);
      return;
    }
    if (!form.rentalStart || !form.rentalEnd) {
      setError(i18n.requiredField + i18n.rentalStart);
      return;
    }

    const payload: Record<string, unknown> = {
      clientName: form.clientName.trim(),
      rentalStart: form.rentalStart,
      rentalEnd: form.rentalEnd,
      ...(form.vehicleId && { vehicleId: form.vehicleId }),
      ...(form.clientPhone.trim() && { clientPhone: form.clientPhone.trim() }),
      ...(form.clientNationalId.trim() && {
        clientNationalId: form.clientNationalId.trim(),
      }),
      ...(form.contractNumber.trim() && {
        contractNumber: form.contractNumber.trim(),
      }),
      ...(form.odometerOut.trim() && { odometerOut: Number(form.odometerOut) }),
      ...(form.dailyRateSar.trim() && {
        dailyRateSar: Number(form.dailyRateSar),
      }),
      ...(form.contractFileUrl.trim() && {
        contractFileUrl: form.contractFileUrl.trim(),
      }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
      // Handover fields
      ...(fuelLevel !== null && { fuelLevel }),
      ...(conditionRating && { conditionRating }),
      ...(conditionPhotos.length > 0 && { conditionPhotos: conditionPhotos.map((p) => p.serverUrl) }),
      ...(checklistItems.length > 0 && { checklistItems }),
      ...(clientSigUrl && { signatureUrl: clientSigUrl }),
      ...(managerSigUrl && { managerSignatureUrl: managerSigUrl }),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/rentals/${rentalId}`, payload);
      } else {
        await api.post('/rentals', payload);
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ height: SB_H }} />
        <View
          style={[
            styles.headerRow,
            { flexDirection: isRTL ? 'row' : 'row-reverse' },
          ]}
        >
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <AppIcon
              name={isRTL ? 'arrow-right' : 'arrow-left'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? i18n.editRental : i18n.addRental}
          </Text>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{i18n.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Vehicle */}
        <SectionTitle title={i18n.rentalVehicle} />
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setVehiclePickerOpen(true)}
            style={[
              styles.pickerBtn,
              { flexDirection: !isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Text
              style={[
                styles.pickerBtnText,
                !selectedVehicle && styles.pickerPlaceholder,
                { textAlign: !isRTL ? 'right' : 'left' },
              ]}
            >
              {selectedVehicle
                ? `${selectedVehicle.plateNumber} — ${selectedVehicle.make} ${selectedVehicle.model}`
                : i18n.selectVehiclePicker}
            </Text>
            <AppIcon name="chevron-down" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Client Info */}
        <SectionTitle title={i18n.basicInfo} />
        <View style={styles.card}>
          <FormField label={i18n.rentalClientName} required>
            <TextInput
              style={styles.input}
              value={form.clientName}
              onChangeText={(v) => set('clientName', v)}
              placeholder={i18n.rentalClientName}
              placeholderTextColor={Colors.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          <FieldDivider />
          <FormField label={i18n.rentalClientPhone}>
            <TextInput
              style={styles.input}
              value={form.clientPhone}
              onChangeText={(v) => set('clientPhone', v)}
              placeholder={i18n.rentalClientPhone}
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          <FieldDivider />
          <FormField label={i18n.rentalClientNationalId}>
            <TextInput
              style={styles.input}
              value={form.clientNationalId}
              onChangeText={(v) => set('clientNationalId', v)}
              placeholder={i18n.rentalClientNationalId}
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          <FieldDivider />
          <FormField label={i18n.rentalContractNumber}>
            <TextInput
              style={styles.input}
              value={form.contractNumber}
              onChangeText={(v) => set('contractNumber', v)}
              placeholder={i18n.rentalContractNumber}
              placeholderTextColor={Colors.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
        </View>

        {/* Dates */}
        <SectionTitle
          title={locale === 'ar' ? 'فترة الإيجار' : 'Rental Period'}
        />
        <View style={styles.card}>
          <FormField label={i18n.rentalStart} required>
            <TouchableOpacity
              style={[
                styles.datePickerBtn,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => setDatePickerField('rentalStart')}
            >
              <Text
                style={[
                  form.rentalStart
                    ? styles.datePickerText
                    : styles.datePickerPlaceholder,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {form.rentalStart || 'YYYY-MM-DD'}
              </Text>
              <AppIcon name="calendar" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </FormField>
          <FieldDivider />
          <FormField label={i18n.rentalEnd} required>
            <TouchableOpacity
              style={[
                styles.datePickerBtn,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => setDatePickerField('rentalEnd')}
            >
              <Text
                style={[
                  form.rentalEnd
                    ? styles.datePickerText
                    : styles.datePickerPlaceholder,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {form.rentalEnd || 'YYYY-MM-DD'}
              </Text>
              <AppIcon name="calendar" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </FormField>
        </View>

        {/* Vehicle Details */}
        <SectionTitle
          title={locale === 'ar' ? 'تفاصيل المركبة' : 'Vehicle Details'}
        />
        <View style={styles.card}>
          <FormField label={i18n.rentalOdometerOut}>
            <TextInput
              style={styles.input}
              value={form.odometerOut}
              onChangeText={(v) => set('odometerOut', v)}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          <FieldDivider />
          <FormField label={i18n.rentalDailyRate}>
            <TextInput
              style={styles.input}
              value={form.dailyRateSar}
              onChangeText={(v) => set('dailyRateSar', v)}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </FormField>
          <FieldDivider />
          <FormField label={i18n.rentalContractFile}>
            <TouchableOpacity
              style={[
                styles.uploadBtn,
                { flexDirection: !isRTL ? 'row-reverse' : 'row' },
              ]}
              activeOpacity={0.8}
              disabled={uploading}
              onPress={async () => {
                const granted = await ensureMediaPermission();
                if (!granted) return;
                launchImageLibrary(
                  { mediaType: 'mixed', quality: 0.9, selectionLimit: 1 },
                  async (result) => {
                    const asset = result.assets?.[0];
                    if (!asset?.uri) {
                      return;
                    }
                    setUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append('file', {
                        uri: asset.uri,
                        name: asset.fileName ?? 'contract.jpg',
                        type: asset.type ?? 'image/jpeg',
                      } as any);
                      const res = await api.upload<{ fileUrl: string }>(
                        '/documents/files',
                        fd
                      );
                      set('contractFileUrl', res.fileUrl);
                      setUploadedFileName(
                        asset.fileName ?? res.fileUrl.split('/').pop() ?? 'file'
                      );
                    } catch (e: any) {
                      Alert.alert('Error', e?.message ?? 'Upload failed');
                    } finally {
                      setUploading(false);
                    }
                  }
                );
              }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <AppIcon
                  name={
                    form.contractFileUrl
                      ? 'file-check-outline'
                      : 'upload-outline'
                  }
                  size={20}
                  color={Colors.primary}
                />
              )}
              <View style={styles.uploadTextWrap}>
                <Text
                  style={[
                    styles.uploadLabel,
                    { textAlign: !isRTL ? 'right' : 'left' },
                  ]}
                >
                  {uploading
                    ? i18n.uploading
                    : form.contractFileUrl
                    ? i18n.changeFile
                    : i18n.chooseFile}
                </Text>
                {!!uploadedFileName && !uploading && (
                  <Text
                    style={[
                      styles.uploadFileName,
                      { textAlign: !isRTL ? 'right' : 'left' },
                    ]}
                    numberOfLines={1}
                  >
                    {uploadedFileName}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </FormField>
        </View>

        {/* Notes */}
        <SectionTitle title={i18n.rentalNotesLabel} />
        <View style={styles.card}>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            placeholder={i18n.rentalNotesLabel}
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        {/* ── Handover Section ──────────────────────────────────────────────── */}
        <SectionTitle title={(i18n as any).handoverSection ?? 'Vehicle State at Handover'} />
        <View style={styles.card}>
          {/* Fuel Level */}
          <FormField label={(i18n as any).fuelLevelLabel ?? 'Fuel Level'}>
            <View style={[styles.fuelRow, !isRTL && { flexDirection: 'row-reverse' }]}>
              {([0, 25, 50, 75, 100] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.fuelBtn, fuelLevel === v && styles.fuelBtnActive]}
                  onPress={() => setFuelLevel(v)}
                >
                  <Text style={[styles.fuelBtnText, fuelLevel === v && styles.fuelBtnTextActive]}>
                    {v === 0 ? 'E' : v === 100 ? 'F' : `${v}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>
          <FieldDivider />
          {/* Condition Rating */}
          <FormField label={(i18n as any).conditionRatingLabel ?? 'Vehicle Condition'}>
            <View style={[styles.ratingRow, !isRTL && { flexDirection: 'row-reverse' }]}>
              {(['GOOD', 'FAIR', 'POOR'] as const).map((r) => {
                const cfg =
                  r === 'GOOD'
                    ? { text: (i18n as any).conditionGood ?? 'Good', active: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
                    : r === 'FAIR'
                    ? { text: (i18n as any).conditionFair ?? 'Fair', active: '#d97706', bg: '#fffbeb', border: '#fde68a' }
                    : { text: (i18n as any).conditionPoor ?? 'Poor', active: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
                const isActive = conditionRating === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.ratingBtn,
                      isActive && { backgroundColor: cfg.bg, borderColor: cfg.border },
                    ]}
                    onPress={() => setConditionRating(r)}
                  >
                    <Text
                      style={[
                        styles.ratingBtnText,
                        isActive && { color: cfg.active, fontWeight: '700' as const },
                      ]}
                    >
                      {cfg.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormField>
        </View>

        {/* Condition Photos */}
        <SectionTitle title={(i18n as any).conditionPhotosSection ?? 'Condition Photos'} />
        <View style={styles.card}>
          <View style={styles.photosWrap}>
            {conditionPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {conditionPhotos.map((p, idx) => (
                  <View key={idx} style={styles.photoThumbWrap}>
                    <Image source={{ uri: p.localUri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => setConditionPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <AppIcon name="close" size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.addPhotoBtn, !isRTL && { flexDirection: 'row-reverse' }]}
              onPress={handleAddConditionPhoto}
              disabled={photoUploading}
            >
              {photoUploading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <AppIcon name="camera-plus-outline" size={20} color={Colors.primary} />
              )}
              <Text style={styles.addPhotoBtnText}>
                {(i18n as any).addConditionPhoto ?? 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Handover Checklist */}
        <SectionTitle title={(i18n as any).handoverChecklist ?? 'Handover Checklist'} />
        <View style={styles.card}>
          <View style={styles.checklistWrap}>
            <View style={[styles.checklistHeader, !isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity onPress={() => setChecklistItems(HANDOVER_CHECKLIST.map((c) => c.id))}>
                <Text style={styles.checklistHeaderBtn}>
                  {(i18n as any).selectAllItems ?? 'Select All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setChecklistItems([])}>
                <Text style={[styles.checklistHeaderBtn, { color: Colors.textMuted }]}>
                  {(i18n as any).clearAllItems ?? 'Clear All'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.checklistGrid}>
              {HANDOVER_CHECKLIST.map((item) => {
                const checked = checklistItems.includes(item.id);
                const label = locale === 'ar' || locale === 'ur' ? item.ar : item.en;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.checkItem,
                      checked && styles.checkItemActive,
                      !isRTL && { flexDirection: 'row-reverse' },
                    ]}
                    onPress={() =>
                      setChecklistItems((prev) =>
                        checked ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                      )
                    }
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <AppIcon name="check" size={11} color="#fff" />}
                    </View>
                    <Text
                      style={[styles.checkItemText, checked && { color: Colors.primary }]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Client Signature */}
        <SectionTitle title={(i18n as any).clientSignatureLabel ?? 'Client Signature'} />
        <View style={styles.card}>
          <View style={styles.sigWrap}>
            <SignaturePad
              label={(i18n as any).clientSignatureLabel ?? 'Client Signature'}
              locale={locale}
              rtl={isRTL}
              onSave={(url) => setClientSigUrl(url)}
            />
          </View>
        </View>

        {/* Manager Signature */}
        <SectionTitle title={(i18n as any).managerSignatureLabel ?? 'Manager Signature'} />
        <View style={styles.card}>
          <View style={styles.sigWrap}>
            <SignaturePad
              label={(i18n as any).managerSignatureLabel ?? 'Manager Signature'}
              locale={locale}
              rtl={isRTL}
              onSave={(url) => setManagerSigUrl(url)}
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Vehicle Picker Modal */}
      <Modal
        visible={vehiclePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVehiclePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View
              style={[
                styles.modalHeader,
                { flexDirection: !isRTL ? 'row-reverse' : 'row' },
              ]}
            >
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
              textAlign={isRTL ? 'right' : 'left'}
            />
            <FlatList
              data={filteredVehicles}
              keyExtractor={(v) => v.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    form.vehicleId === item.id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    set('vehicleId', item.id);
                    setVehiclePickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      form.vehicleId === item.id && styles.modalItemTextActive,
                      { textAlign: !isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {item.plateNumber} — {item.make} {item.model}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>{i18n.noVehicles}</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      <DateWheelModal
        visible={datePickerField !== null}
        value={datePickerField ? form[datePickerField] : ''}
        locale={locale}
        cancelLabel={i18n.cancel}
        doneLabel={i18n.done}
        label={
          datePickerField === 'rentalStart' ? i18n.rentalStart : i18n.rentalEnd
        }
        onClose={() => setDatePickerField(null)}
        onConfirm={(date) => {
          if (datePickerField) {
            set(datePickerField, date);
          }
          setDatePickerField(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
}
function FieldDivider() {
  return <View style={styles.divider} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  header: { backgroundColor: Colors.primary },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 12,
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
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
  body: { flex: 1, backgroundColor: Colors.bg },
  bodyContent: { padding: Spacing.md, paddingTop: Spacing.sm, gap: 6 },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    padding: 12,
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  fieldWrap: { paddingHorizontal: 14, paddingVertical: 10 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: { fontSize: 15, color: Colors.textPrimary, paddingVertical: 2 },
  notesInput: { minHeight: 80, paddingHorizontal: 14, paddingVertical: 10 },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 14,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  datePickerText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  datePickerPlaceholder: { fontSize: 15, color: Colors.textMuted, flex: 1 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
  },
  uploadTextWrap: { flex: 1 },
  uploadLabel: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  uploadFileName: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  pickerBtnText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder: { color: Colors.textMuted },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
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
  modalSearch: {
    margin: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalItemActive: { backgroundColor: Colors.primaryLight },
  modalItemText: { fontSize: 15, color: Colors.textPrimary },
  modalItemTextActive: { color: Colors.primary, fontWeight: '700' as const },
  modalEmpty: { padding: 24, textAlign: 'center', color: Colors.textMuted },

  // ── Handover ─────────────────────────────────────────────────────────────
  fuelRow: { flexDirection: 'row', gap: 6 },
  fuelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  fuelBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  fuelBtnText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' as const },
  fuelBtnTextActive: { color: Colors.primary },

  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  ratingBtnText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' as const },

  photosWrap: { padding: 12 },
  photoThumbWrap: { marginRight: 8, position: 'relative' as const },
  photoThumb: { width: 68, height: 68, borderRadius: 8, backgroundColor: Colors.borderLight },
  removePhotoBtn: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed' as any,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  addPhotoBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' as const },

  checklistWrap: { padding: 10 },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginBottom: 10,
  },
  checklistHeaderBtn: { fontSize: 12, color: Colors.primary, fontWeight: '600' as const },
  checklistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bg,
  },
  checkItemActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkItemText: { fontSize: 12, color: Colors.textMuted },

  sigWrap: { padding: 12 },
});
