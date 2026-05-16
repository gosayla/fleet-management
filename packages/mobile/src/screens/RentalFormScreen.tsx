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
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { ensureMediaPermission } from '../lib/permissions';
import { api } from '../lib/api';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Locale, t, isRTL as isRTLFn } from '../lib/i18n';
import { DateWheelModal } from '../components/ui/DateWheelModal';
import { Alert } from '../lib/alert';

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

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
});
