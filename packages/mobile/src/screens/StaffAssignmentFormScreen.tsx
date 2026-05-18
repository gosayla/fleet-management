/**
 * StaffAssignmentFormScreen
 * - mode='assign' → POST /staff-assignments
 * - mode='return' → POST /staff-assignments/:assignmentId/return
 */
import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { Alert } from '../lib/alert';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { ensureCameraPermission, ensureMediaPermission } from '../lib/permissions';
import { api } from '../lib/api';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { SignaturePad } from '../components/ui/SignaturePad';
import { DateWheelModal } from '../components/ui/DateWheelModal';
import { Locale, t, isRTL } from '../lib/i18n';

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

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  mode: 'assign' | 'return';
  vehicleId: string;
  assignmentId?: string;
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

// ── Form state ───────────────────────────────────────────────────────────────

interface AssignForm {
  assigneeName: string;
  assigneeTitle: string;
  assigneePhone: string;
  assigneeNationalId: string;
  assignedAt: string;
  odometerOut: string;
  notes: string;
}

interface ReturnForm {
  returnedAt: string;
  odometerIn: string;
  notes: string;
}

const EMPTY_ASSIGN: AssignForm = {
  assigneeName: '',
  assigneeTitle: '',
  assigneePhone: '',
  assigneeNationalId: '',
  assignedAt: '',
  odometerOut: '',
  notes: '',
};

const EMPTY_RETURN: ReturnForm = {
  returnedAt: '',
  odometerIn: '',
  notes: '',
};

// ── Component ────────────────────────────────────────────────────────────────

export function StaffAssignmentFormScreen({
  mode,
  vehicleId,
  assignmentId,
  locale,
  onBack,
  onSuccess,
}: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);

  const [assignForm, setAssignForm] = useState<AssignForm>({ ...EMPTY_ASSIGN });
  const [returnForm, setReturnForm] = useState<ReturnForm>({ ...EMPTY_RETURN });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssignedAtPicker, setShowAssignedAtPicker] = useState(false);
  const [showReturnedAtPicker, setShowReturnedAtPicker] = useState(false);

  // Handover state
  const [fuelLevel, setFuelLevel] = useState<number | null>(null);
  const [conditionRating, setConditionRating] = useState<'GOOD' | 'FAIR' | 'POOR' | null>(null);
  const [conditionPhotos, setConditionPhotos] = useState<{ localUri: string; serverUrl: string }[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [sigUrl, setSigUrl] = useState('');
  const [managerSigUrl, setManagerSigUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  // ── RTL (same pattern as VehicleFormScreen) ──────────────────────────────

  const alignedInputStyle = rtl ? styles.inputRtl : styles.inputLtr;
  const headerRowDirectionStyle = rtl ? styles.headerRowRtl : styles.headerRowLtr;

  // ── Setters ──────────────────────────────────────────────────────────────

  const setA = (field: keyof AssignForm, value: string) =>
    setAssignForm((prev) => ({ ...prev, [field]: value }));

  const setR = (field: keyof ReturnForm, value: string) =>
    setReturnForm((prev) => ({ ...prev, [field]: value }));

  // ── Photo upload ─────────────────────────────────────────────────────────

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

  const handleAddConditionPhoto = () => {
    Alert.alert((i18n as any).addConditionPhoto ?? 'Add Photo', '', [
      {
        text: (i18n as any).camera ?? 'Camera',
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
        text: (i18n as any).gallery ?? 'Gallery',
        onPress: async () => {
          const granted = await ensureMediaPermission();
          if (!granted) return;
          launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (result) => {
            const asset = result.assets?.[0];
            if (asset?.uri) uploadConditionPhotoAsset(asset);
          });
        },
      },
      { text: (i18n as any).cancel ?? 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);
    if (mode === 'assign') {
      if (!assignForm.assigneeName.trim()) {
        setError((i18n as any).staffAssigneeName ?? 'Assignee name is required');
        return;
      }
      setSubmitting(true);
      try {
        await api.post('/staff-assignments', {
          vehicleId,
          assigneeName: assignForm.assigneeName.trim(),
          assigneeTitle: assignForm.assigneeTitle.trim() || undefined,
          assigneePhone: assignForm.assigneePhone.trim() || undefined,
          assigneeNationalId: assignForm.assigneeNationalId.trim() || undefined,
          assignedAt: assignForm.assignedAt || undefined,
          odometerOut: assignForm.odometerOut ? Number(assignForm.odometerOut) : undefined,
          notes: assignForm.notes.trim() || undefined,
          ...(fuelLevel !== null && { fuelLevel }),
          ...(conditionRating && { conditionRating }),
          ...(conditionPhotos.length > 0 && { conditionPhotos: conditionPhotos.map((p) => p.serverUrl) }),
          ...(checklistItems.length > 0 && { checklistItems }),
          ...(sigUrl && { signatureUrl: sigUrl }),
          ...(managerSigUrl && { managerSignatureUrl: managerSigUrl }),
        });
        onSuccess();
      } catch {
        setError((i18n as any).failedToSaveAssignment ?? 'Failed to save');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!assignmentId) return;
      setSubmitting(true);
      try {
        await api.post(`/staff-assignments/${assignmentId}/return`, {
          returnedAt: returnForm.returnedAt || undefined,
          odometerIn: returnForm.odometerIn ? Number(returnForm.odometerIn) : undefined,
          notes: returnForm.notes.trim() || undefined,
        });
        onSuccess();
      } catch {
        setError((i18n as any).failedToSaveAssignment ?? 'Failed to save');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const isAssign = mode === 'assign';
  const screenTitle = isAssign
    ? ((i18n as any).assignStaff ?? 'Assign Staff')
    : ((i18n as any).returnStaffVehicle ?? 'Return Vehicle');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ height: SB_H }} />
        <View style={[styles.headerRow, headerRowDirectionStyle]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onBack} activeOpacity={0.8}>
            <AppIcon name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{i18n.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* White curved panel */}
      <KeyboardAvoidingView
        style={styles.panel}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!!error && (
            <View style={styles.errorBanner}>
              <AppIcon name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isAssign ? (
            <>
              <SectionTitle title={(i18n as any).staffAssignmentSection ?? 'Staff Assignment'} />
              <View style={styles.card}>
                <FormField label={(i18n as any).staffAssigneeName ?? 'Assignee Name'} required>
                  <TextInput
                    style={[styles.input, alignedInputStyle]}
                    value={assignForm.assigneeName}
                    onChangeText={(v) => setA('assigneeName', v)}
                    placeholder={(i18n as any).staffAssigneeName ?? 'Full name'}
                    placeholderTextColor={Colors.textMuted}
                  />
                </FormField>
                <FieldDivider />
                <FormField label={(i18n as any).staffAssigneeTitle ?? 'Title / Role'}>
                  <TextInput
                    style={[styles.input, alignedInputStyle]}
                    value={assignForm.assigneeTitle}
                    onChangeText={(v) => setA('assigneeTitle', v)}
                    placeholder={(i18n as any).staffAssigneeTitle ?? 'e.g. Manager'}
                    placeholderTextColor={Colors.textMuted}
                  />
                </FormField>
                <FieldDivider />
                <FormField label={i18n.phone}>
                  <TextInput
                    style={[styles.input, alignedInputStyle]}
                    value={assignForm.assigneePhone}
                    onChangeText={(v) => setA('assigneePhone', v)}
                    placeholder="+966 5x xxx xxxx"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                  />
                </FormField>
                <FieldDivider />
                <FormField label={i18n.nationalIdField}>
                  <TextInput
                    style={[styles.input, alignedInputStyle]}
                    value={assignForm.assigneeNationalId}
                    onChangeText={(v) => setA('assigneeNationalId', v.replace(/[^0-9]/g, ''))}
                    placeholder="1234567890"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </FormField>
              </View>

              <SectionTitle title={i18n.tripDetails} />
              <View style={styles.card}>
                <FormField label={(i18n as any).staffAssignedAt ?? 'Assigned At'}>
                  <DateInputRow
                    value={assignForm.assignedAt}
                    placeholder={i18n.staffAssignedAt ?? 'Select date'}
                    onChange={(v) => setA('assignedAt', v)}
                    onOpenPicker={() => setShowAssignedAtPicker(true)}
                    rtl={rtl}
                  />
                </FormField>
                <FieldDivider />
                <FormField label={`${(i18n as any).staffOdometerOut ?? 'Odometer Out'} (km)`}>
                  <TextInput
                    style={[styles.input, alignedInputStyle]}
                    value={assignForm.odometerOut}
                    onChangeText={(v) => setA('odometerOut', v.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </FormField>
                <FieldDivider />
                <FormField label={i18n.notesLabel}>
                  <TextInput
                    style={[styles.input, styles.multilineInput, alignedInputStyle]}
                    value={assignForm.notes}
                    onChangeText={(v) => setA('notes', v)}
                    placeholder={i18n.notesLabel}
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </FormField>
              </View>

              {/* ── Handover Section ─────────────────────────────────────── */}
              <SectionTitle title={(i18n as any).handoverSection ?? 'Vehicle State at Handover'} />
              <View style={styles.card}>
                {/* Fuel Level */}
                <FormField label={(i18n as any).fuelLevelLabel ?? 'Fuel Level'}>
                  <View style={[styles.fuelRow, rtl && { flexDirection: 'row-reverse' }]}>
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
                  <View style={[styles.ratingRow, rtl && { flexDirection: 'row-reverse' }]}>
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
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 10 }}
                    >
                      {conditionPhotos.map((p, idx) => (
                        <View key={idx} style={styles.photoThumbWrap}>
                          <Image source={{ uri: p.localUri }} style={styles.photoThumb} />
                          <TouchableOpacity
                            style={styles.removePhotoBtn}
                            onPress={() =>
                              setConditionPhotos((prev) => prev.filter((_, i) => i !== idx))
                            }
                          >
                            <AppIcon name="close" size={10} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <TouchableOpacity
                    style={[styles.addPhotoBtn, rtl && { flexDirection: 'row-reverse' }]}
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
                  <View style={[styles.checklistHeader, rtl && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity
                      onPress={() => setChecklistItems(HANDOVER_CHECKLIST.map((c) => c.id))}
                    >
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
                      const label =
                        locale === 'ar' || locale === 'ur' ? item.ar : item.en;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.checkItem,
                            checked && styles.checkItemActive,
                            rtl && { flexDirection: 'row-reverse' },
                          ]}
                          onPress={() =>
                            setChecklistItems((prev) =>
                              checked
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id]
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

              {/* Driver Signature */}
              <SectionTitle title={(i18n as any).driverSignatureLabel ?? 'Driver Signature'} />
              <View style={styles.card}>
                <View style={styles.sigWrap}>
                  <SignaturePad
                    label={(i18n as any).driverSignatureLabel ?? 'Driver Signature'}
                    locale={locale}
                    rtl={rtl}
                    onSave={(url) => setSigUrl(url)}
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
                    rtl={rtl}
                    onSave={(url) => setManagerSigUrl(url)}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <SectionTitle title={(i18n as any).returnStaffVehicle ?? 'Return Details'} />
              <View style={styles.card}>
                <FormField label={i18n.returnTime}>
                  <DateInputRow
                    value={returnForm.returnedAt}
                    placeholder={i18n.returnTime ?? 'Select date'}
                    onChange={(v) => setR('returnedAt', v)}
                    onOpenPicker={() => setShowReturnedAtPicker(true)}
                    rtl={rtl}
                  />
                </FormField>
                <FieldDivider />
                <FormField label={`${(i18n as any).staffOdometerIn ?? 'Odometer In'} (km)`}>
                  <TextInput
                    style={[styles.input, alignedInputStyle]}
                    value={returnForm.odometerIn}
                    onChangeText={(v) => setR('odometerIn', v.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </FormField>
                <FieldDivider />
                <FormField label={i18n.notesLabel}>
                  <TextInput
                    style={[styles.input, styles.multilineInput, alignedInputStyle]}
                    value={returnForm.notes}
                    onChangeText={(v) => setR('notes', v)}
                    placeholder={i18n.notesLabel}
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </FormField>
              </View>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date pickers */}
      <DateWheelModal
        visible={showAssignedAtPicker}
        value={assignForm.assignedAt}
        onConfirm={(d) => { setA('assignedAt', d); setShowAssignedAtPicker(false); }}
        onClose={() => setShowAssignedAtPicker(false)}
        locale={locale}
      />
      <DateWheelModal
        visible={showReturnedAtPicker}
        value={returnForm.returnedAt}
        onConfirm={(d) => { setR('returnedAt', d); setShowReturnedAtPicker(false); }}
        onClose={() => setShowReturnedAtPicker(false)}
        locale={locale}
      />
    </View>
  );
}

// ── Sub-components (mirrors VehicleFormScreen) ────────────────────────────────

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
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
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
  onChange: _onChange,
  onOpenPicker,
  rtl,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onOpenPicker: () => void;
  rtl?: boolean;
}) {
  const rowDir = rtl ? styles.dateInputRowRtl : styles.dateInputRowLtr;
  const textAlign = rtl ? styles.dateFieldTextRtl : styles.dateFieldTextLtr;
  return (
    <TouchableOpacity
      onPress={onOpenPicker}
      style={[styles.dateInputRow, rowDir]}
      activeOpacity={0.75}
    >
      <Text style={[styles.dateFieldText, textAlign, !value && styles.dateFieldPlaceholder]}>
        {value || placeholder}
      </Text>
      <View style={styles.dateIconBtn}>
        <AppIcon name="calendar-outline" size={18} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ── Styles (mirrors VehicleFormScreen) ────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },

  header: { paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  headerRowLtr: { flexDirection: 'row-reverse' },
  headerRowRtl: { flexDirection: 'row' },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: '#fff' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },

  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    overflow: 'hidden',
  },
  formContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626' },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
  },
  divider: { height: 1, backgroundColor: Colors.borderLight },

  fieldWrap: { paddingVertical: 12 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  requiredMark: { color: '#ef4444' },
  input: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500' as const,
    paddingVertical: 0,
    minHeight: 28,
  },
  inputLtr: { textAlign: 'left' },
  inputRtl: { textAlign: 'right' },
  multilineInput: { minHeight: 64, textAlignVertical: 'top' },

  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInputRowLtr: { flexDirection: 'row-reverse' },
  dateInputRowRtl: { flexDirection: 'row' },
  dateFieldText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500' as const,
    paddingVertical: 0,
    minHeight: 28,
    flex: 1,
  },
  dateFieldTextLtr: { textAlign: 'right' },
  dateFieldTextRtl: { textAlign: 'left' },
  dateFieldPlaceholder: { color: Colors.textMuted },
  dateIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

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

