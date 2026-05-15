/**
 * DocumentFormScreen — Create (POST /documents) or Edit (PATCH /documents/:id)
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
import { api } from '../lib/api';
import { Colors, Radius, Shadow, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Locale, t, isRTL as isRTLFn } from '../lib/i18n';
import { DocumentType } from '@fleet/shared';
import { DateWheelModal } from '../components/ui/DateWheelModal';
import { Alert } from '../lib/alert';

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

const ALL_DOC_TYPES = Object.values(DocumentType);
const DRIVER_DOC_TYPES = [
  DocumentType.DRIVER_LICENSE,
  DocumentType.DRIVER_CARD,
];
const VEHICLE_DOC_TYPES = ALL_DOC_TYPES.filter(
  (type) => !DRIVER_DOC_TYPES.includes(type as DocumentType)
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface VehicleOption {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}
interface DriverOption {
  id: string;
  fullName: string;
}

interface FormState {
  type: DocumentType;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
  issuingAuthority: string;
  referenceNumber: string;
  notes: string;
  vehicleIds: string[];
  driverIds: string[];
}

const EMPTY: FormState = {
  type: DocumentType.VEHICLE_REGISTRATION,
  issueDate: '',
  expiryDate: '',
  fileUrl: '',
  issuingAuthority: '',
  referenceNumber: '',
  notes: '',
  vehicleIds: [],
  driverIds: [],
};

interface Props {
  documentId?: string; // undefined = create, string = edit
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
  driverOnly?: boolean; // restrict doc types to driver-relevant ones
}

type DocumentScope = 'vehicle' | 'driver';

// ── Helpers ───────────────────────────────────────────────────────────────────

function docTypeLabel(type: string, i18n: ReturnType<typeof t>): string {
  const map: Record<string, string> = {
    DRIVER_LICENSE: i18n.docTypeDriverLicense,
    DRIVER_CARD: i18n.docTypeDriverCard,
    VEHICLE_INSURANCE: i18n.docTypeVehicleInsurance,
    PERIODIC_INSPECTION: i18n.docTypePeriodicInspection,
    VEHICLE_REGISTRATION: i18n.docTypeVehicleRegistration,
    OPERATION_CARD: i18n.docTypeOperationCard,
    TRANSPORT_PERMIT: i18n.docTypeTransportPermit,
    OWNERSHIP_DEED: i18n.docTypeOwnershipDeed,
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function FieldDivider() {
  return <View style={styles.fieldDivider} />;
}

function FormField({
  label,
  required,
  children,
  isRTL,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  isRTL?: boolean;
}) {
  const fieldLabelAlignmentStyle = isRTL ? styles.rtlText : styles.ltrText;

  return (
    <View style={styles.formField}>
      <Text style={[styles.fieldLabel, fieldLabelAlignmentStyle]}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
}

// ── Multi-select picker modal ─────────────────────────────────────────────────

interface PickerModalProps<T extends { id: string }> {
  visible: boolean;
  title: string;
  items: T[];
  selectedIds: string[];
  getLabel: (item: T) => string;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  locale: Locale;
  searchPlaceholder: string;
  loading?: boolean;
}

function MultiSelectModal<T extends { id: string }>({
  visible,
  title,
  items,
  selectedIds,
  getLabel,
  onClose,
  onConfirm,
  locale,
  searchPlaceholder,
  loading,
}: PickerModalProps<T>) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const isRTL = isRTLFn(locale);
  const modalRowDirectionStyle = isRTL ? styles.rowRtl : styles.rowReverse;
  const modalRowOppositeDirectionStyle = isRTL
    ? styles.rowReverse
    : styles.rowRtl;
  const modalInputAlignmentStyle = isRTL ? styles.rtlText : styles.ltrText;
  const modalLabelAlignmentStyle = isRTL ? styles.ltrText : styles.rtlText;

  useEffect(() => {
    if (visible) {
      setSelected(selectedIds);
    }
  }, [selectedIds, visible]);

  const filtered = items.filter(
    (it) =>
      !query.trim() || getLabel(it).toLowerCase().includes(query.toLowerCase())
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.modalSheet}>
        <View style={[styles.modalHeader, modalRowOppositeDirectionStyle]}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <AppIcon name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.modalSearch, modalRowOppositeDirectionStyle]}>
          <AppIcon name="magnify" size={16} color={Colors.textMuted} />
          <TextInput
            style={[styles.modalSearchInput, modalInputAlignmentStyle]}
            placeholder={searchPlaceholder}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          style={styles.modalList}
          contentContainerStyle={
            filtered.length === 0 ? styles.emptyList : undefined
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator
                size="large"
                color={Colors.primary}
                style={styles.modalLoader}
              />
            ) : (
              <Text style={styles.emptyText}>{t(locale).noDocuments}</Text>
            )
          }
          renderItem={({ item }) => {
            const checked = selected.includes(item.id);
            return (
              <TouchableOpacity
                style={[styles.modalRow, modalRowDirectionStyle]}
                onPress={() => toggle(item.id)}
                activeOpacity={0.75}
              >
                <AppIcon
                  name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={checked ? Colors.primary : Colors.textMuted}
                />
                <Text style={[styles.modalRowText, modalLabelAlignmentStyle]}>
                  {getLabel(item)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => {
            onConfirm(selected);
            onClose();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>
            {t(locale).save} ({selected.length})
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function DocumentFormScreen({
  documentId,
  locale,
  onBack,
  onSuccess,
  driverOnly,
}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);
  const isEdit = !!documentId;
  const rowDirectionStyle = isRTL ? styles.rowRtl : styles.rowReverse;
  const oppositeRowDirectionStyle = isRTL ? styles.rowReverse : styles.rowRtl;
  const textAlignmentStyle = isRTL ? styles.rtlText : styles.ltrText;
  const oppositeTextAlignmentStyle = isRTL ? styles.ltrText : styles.rtlText;

  const [form, setForm] = useState<FormState>(
    driverOnly ? { ...EMPTY, type: DocumentType.DRIVER_LICENSE } : EMPTY
  );
  const [scopeTab, setScopeTab] = useState<DocumentScope>(
    driverOnly ? 'driver' : 'vehicle'
  );
  const [loadingDoc, setLoadingDoc] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [datePicker, setDatePicker] = useState<
    'issueDate' | 'expiryDate' | null
  >(null);
  const saveButtonStateStyle = submitting ? styles.saveBtnDisabled : null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function switchScope(scope: DocumentScope) {
    if (driverOnly || scope === scopeTab) {
      return;
    }
    setScopeTab(scope);
    if (scope === 'vehicle') {
      setForm((prev) => ({
        ...prev,
        type: VEHICLE_DOC_TYPES.includes(prev.type)
          ? prev.type
          : DocumentType.VEHICLE_REGISTRATION,
        driverIds: [],
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      type: DRIVER_DOC_TYPES.includes(prev.type)
        ? prev.type
        : DocumentType.DRIVER_LICENSE,
      vehicleIds: [],
    }));
  }

  // ── Load options + existing doc on edit ────────────────────────────────────
  useEffect(() => {
    if (driverOnly) {
      // For driver-only form: just get the driver's own record to auto-link themselves
      api
        .get<{ id: string }>('/drivers/me')
        .then((me) => {
          if (me?.id) {
            setForm((prev) => ({ ...prev, driverIds: [me.id] }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingOptions(false));
    } else {
      api
        .get<any>('/vehicles?limit=100')
        .then((vs) => {
          const vehicleList: VehicleOption[] = Array.isArray(vs)
            ? vs
            : vs?.data ?? [];
          setVehicles(vehicleList);
        })
        .catch(() => {});

      api
        .get<DriverOption[]>('/drivers')
        .then((ds) => {
          setDrivers(Array.isArray(ds) ? ds : []);
        })
        .catch(() => {})
        .finally(() => setLoadingOptions(false));
    }

    if (!isEdit) {
      return;
    }
    api
      .get<any>(`/documents/${documentId}`)
      .then((doc) => {
        const loadedType = doc.type ?? DocumentType.VEHICLE_REGISTRATION;
        setForm({
          type: loadedType,
          issueDate: doc.issueDate ? doc.issueDate.slice(0, 10) : '',
          expiryDate: doc.expiryDate ? doc.expiryDate.slice(0, 10) : '',
          fileUrl: doc.fileUrl ?? '',
          issuingAuthority: doc.issuingAuthority ?? '',
          referenceNumber: doc.referenceNumber ?? '',
          notes: doc.notes ?? '',
          vehicleIds: (doc.vehicles ?? []).map((v: any) => v.id),
          driverIds: (doc.drivers ?? []).map((d: any) => d.id),
        });
        if (!driverOnly) {
          setScopeTab(
            DRIVER_DOC_TYPES.includes(loadedType) ? 'driver' : 'vehicle'
          );
        }
      })
      .catch(() => setError(i18n.failedToLoadDoc))
      .finally(() => setLoadingDoc(false));
  }, [documentId, driverOnly, i18n.failedToLoadDoc, isEdit]);

  useEffect(() => {
    if (driverOnly) {
      return;
    }
    if (scopeTab === 'vehicle' && DRIVER_DOC_TYPES.includes(form.type)) {
      set('type', DocumentType.VEHICLE_REGISTRATION);
      return;
    }
    if (scopeTab === 'driver' && VEHICLE_DOC_TYPES.includes(form.type)) {
      set('type', DocumentType.DRIVER_LICENSE);
      return;
    }
  }, [scopeTab, form.type, driverOnly]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    if (!form.issueDate.trim()) {
      setError(`${i18n.requiredField}${i18n.issueDateLabel}`);
      return;
    }
    if (!form.expiryDate.trim()) {
      setError(`${i18n.requiredField}${i18n.expiryLabel}`);
      return;
    }
    if (!form.fileUrl.trim()) {
      setError(`${i18n.requiredField}${i18n.fileUrlLabel}`);
      return;
    }

    const payload: Record<string, unknown> = {
      type: form.type,
      issueDate: form.issueDate.trim(),
      expiryDate: form.expiryDate.trim(),
      fileUrl: form.fileUrl.trim(),
      ...(form.issuingAuthority.trim() && {
        issuingAuthority: form.issuingAuthority.trim(),
      }),
      ...(form.referenceNumber.trim() && {
        referenceNumber: form.referenceNumber.trim(),
      }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
      vehicleIds: form.vehicleIds,
      driverIds: form.driverIds,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/documents/${documentId}`, payload);
      } else {
        await api.post('/documents', payload);
      }
      onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? i18n.error;
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived labels ─────────────────────────────────────────────────────────
  const selectedVehicleLabels = vehicles
    .filter((v) => form.vehicleIds.includes(v.id))
    .map((v) => v.plateNumber)
    .join(', ');
  const selectedDriverLabels = drivers
    .filter((d) => form.driverIds.includes(d.id))
    .map((d) => d.fullName)
    .join(', ');

  if (loadingDoc) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.statusBarSpacer} />
        <View style={[styles.headerRow, rowDirectionStyle]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <AppIcon
              name={isRTL ? 'arrow-right' : 'arrow-left'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? i18n.editDocument : i18n.addDocument}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, saveButtonStateStyle]}
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error */}
          {!!error && (
            <View style={[styles.errorBanner, rowDirectionStyle]}>
              <AppIcon
                name="alert-circle-outline"
                size={16}
                color={Colors.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Document Type ── */}
          <SectionTitle title={i18n.docTypeSection} />
          {!driverOnly && (
            <View style={[styles.scopeTabs, rowDirectionStyle]}>
              <TouchableOpacity
                style={[
                  styles.scopeTabBtn,
                  scopeTab === 'vehicle' && styles.scopeTabBtnActive,
                ]}
                onPress={() => switchScope('vehicle')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.scopeTabText,
                    scopeTab === 'vehicle' && styles.scopeTabTextActive,
                  ]}
                >
                  {isRTL ? 'وثائق المركبات' : 'Vehicle Documents'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scopeTabBtn,
                  scopeTab === 'driver' && styles.scopeTabBtnActive,
                ]}
                onPress={() => switchScope('driver')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.scopeTabText,
                    scopeTab === 'driver' && styles.scopeTabTextActive,
                  ]}
                >
                  {isRTL ? 'وثائق السائقين' : 'Driver Documents'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typePillRow}
          >
            {(driverOnly
              ? DRIVER_DOC_TYPES
              : scopeTab === 'driver'
              ? DRIVER_DOC_TYPES
              : VEHICLE_DOC_TYPES
            ).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typePill,
                  form.type === type && styles.typePillActive,
                ]}
                onPress={() => set('type', type)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typePillText,
                    form.type === type && styles.typePillTextActive,
                  ]}
                >
                  {docTypeLabel(type, i18n)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── File Upload ── */}
          <SectionTitle title={i18n.fileUrlLabel} />
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.uploadBtn, oppositeRowDirectionStyle]}
              onPress={async () => {
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
                        name: asset.fileName ?? 'document.jpg',
                        type: asset.type ?? 'image/jpeg',
                      } as any);
                      const res = await api.upload<{ fileUrl: string }>(
                        '/documents/files',
                        fd
                      );
                      set('fileUrl', res.fileUrl);
                      setUploadedFileName(
                        asset.fileName ?? res.fileUrl.split('/').pop() ?? 'file'
                      );
                    } catch (e: any) {
                      Alert.alert(i18n.error, e?.message ?? 'Upload failed');
                    } finally {
                      setUploading(false);
                    }
                  }
                );
              }}
              disabled={uploading}
              activeOpacity={0.8}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <AppIcon
                  name={form.fileUrl ? 'file-check-outline' : 'upload-outline'}
                  size={20}
                  color={Colors.primary}
                />
              )}
              <View style={styles.uploadTextWrap}>
                <Text style={[styles.uploadLabel, oppositeTextAlignmentStyle]}>
                  {uploading
                    ? i18n.uploading ?? 'Uploading...'
                    : form.fileUrl
                    ? i18n.changeFile ?? 'Change file'
                    : i18n.chooseFile ?? 'Choose file'}
                </Text>
                {!!uploadedFileName && !uploading && (
                  <Text
                    style={[styles.uploadFileName, oppositeTextAlignmentStyle]}
                    numberOfLines={1}
                  >
                    {uploadedFileName}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            {!!form.fileUrl && !uploading && (
              <TouchableOpacity
                style={[styles.removeFileRow, oppositeRowDirectionStyle]}
                onPress={() => {
                  set('fileUrl', '');
                  setUploadedFileName('');
                }}
                activeOpacity={0.7}
              >
                <AppIcon
                  name="close-circle-outline"
                  size={16}
                  color={Colors.danger}
                />
                <Text style={styles.removeFileText}>
                  {i18n.removeFile ?? 'Remove'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Document Info ── */}
          <SectionTitle title={i18n.docInfoSection} />
          <View style={styles.card}>
            <FormField label={i18n.issueDateLabel} required isRTL={!isRTL}>
              <TouchableOpacity
                style={[styles.dateBtn, rowDirectionStyle]}
                onPress={() => setDatePicker('issueDate')}
                activeOpacity={0.8}
              >
                <AppIcon
                  name="calendar-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text
                  style={[
                    styles.dateBtnText,
                    !form.issueDate && { color: Colors.textMuted },
                  ]}
                >
                  {form.issueDate || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
            </FormField>
            <FieldDivider />
            <FormField label={i18n.expiryLabel} required isRTL={!isRTL}>
              <TouchableOpacity
                style={[styles.dateBtn, rowDirectionStyle]}
                onPress={() => setDatePicker('expiryDate')}
                activeOpacity={0.8}
              >
                <AppIcon
                  name="calendar-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text
                  style={[
                    styles.dateBtnText,
                    !form.expiryDate && { color: Colors.textMuted },
                  ]}
                >
                  {form.expiryDate || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
            </FormField>
            <FieldDivider />
            <FormField label={i18n.issuingAuthorityLabel} isRTL={!isRTL}>
              <TextInput
                style={[styles.input, textAlignmentStyle]}
                value={form.issuingAuthority}
                onChangeText={(v) => set('issuingAuthority', v)}
                placeholder={i18n.issuingAuthorityLabel}
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.referenceNumberLabel} isRTL={!isRTL}>
              <TextInput
                style={[styles.input, textAlignmentStyle]}
                value={form.referenceNumber}
                onChangeText={(v) => set('referenceNumber', v)}
                placeholder="REF-2026-001"
                placeholderTextColor={Colors.textMuted}
              />
            </FormField>
            <FieldDivider />
            <FormField label={i18n.notesLabel} isRTL={!isRTL}>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  textAlignmentStyle,
                ]}
                value={form.notes}
                onChangeText={(v) => set('notes', v)}
                placeholder={i18n.notesLabel}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </FormField>
          </View>

          {/* ── Linked Vehicles ── */}
          {!driverOnly && scopeTab === 'vehicle' && (
            <>
              <SectionTitle title={i18n.linkedVehicles} />
              <View style={styles.card}>
                <TouchableOpacity
                  style={[styles.pickerRow, rowDirectionStyle]}
                  onPress={() => setVehiclePickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      oppositeTextAlignmentStyle,
                      !selectedVehicleLabels && { color: Colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedVehicleLabels || i18n.noneSelected}
                  </Text>
                  <AppIcon
                    name="chevron-down"
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Linked Drivers ── */}
          {!driverOnly && scopeTab === 'driver' && (
            <>
              <SectionTitle title={i18n.linkedDrivers} />
              <View style={styles.card}>
                <TouchableOpacity
                  style={[styles.pickerRow, rowDirectionStyle]}
                  onPress={() => setDriverPickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      oppositeTextAlignmentStyle,
                      !selectedDriverLabels && { color: Colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedDriverLabels || i18n.noneSelected}
                  </Text>
                  <AppIcon
                    name="chevron-down"
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Vehicle multi-select ── */}
      {!driverOnly && scopeTab === 'vehicle' && (
        <MultiSelectModal
          visible={vehiclePickerOpen}
          title={i18n.selectVehicles}
          items={vehicles}
          selectedIds={form.vehicleIds}
          getLabel={(v) => `${v.plateNumber} — ${v.make} ${v.model}`}
          onClose={() => setVehiclePickerOpen(false)}
          onConfirm={(ids) => set('vehicleIds', ids)}
          locale={locale}
          searchPlaceholder={i18n.searchVehicles}
          loading={loadingOptions}
        />
      )}

      {/* ── Driver multi-select ── */}
      {!driverOnly && scopeTab === 'driver' && (
        <MultiSelectModal
          visible={driverPickerOpen}
          title={i18n.selectDrivers}
          items={drivers}
          selectedIds={form.driverIds}
          getLabel={(d) => d.fullName}
          onClose={() => setDriverPickerOpen(false)}
          onConfirm={(ids) => set('driverIds', ids)}
          locale={locale}
          searchPlaceholder={i18n.searchDrivers}
          loading={loadingOptions}
        />
      )}

      {/* ── Date Wheel Picker ── */}
      <DateWheelModal
        visible={datePicker !== null}
        value={datePicker ? form[datePicker] : ''}
        label={
          datePicker === 'issueDate' ? i18n.issueDateLabel : i18n.expiryLabel
        }
        doneLabel={i18n.save}
        cancelLabel={i18n.cancel}
        locale={locale}
        onConfirm={(dateStr) => {
          if (datePicker) {
            set(datePicker, dateStr);
          }
        }}
        onClose={() => setDatePicker(null)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  container: { flex: 1, backgroundColor: Colors.bg },
  rowRtl: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  ltrText: { textAlign: 'left' },
  header: { backgroundColor: Colors.primary, paddingBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statusBarSpacer: { height: SB_H },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: 4 },
  bottomSpacer: { height: 40 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  errorText: { flex: 1, color: Colors.danger, fontSize: 13 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  formField: { paddingHorizontal: Spacing.md, paddingVertical: 12 },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.md,
  },
  input: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  multilineInput: { minHeight: 70, paddingTop: 0 },
  typePillRow: { paddingVertical: 4, gap: 8, paddingRight: Spacing.md },
  scopeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  scopeTabBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scopeTabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  scopeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scopeTabTextActive: { color: '#fff' },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typePillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  typePillText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  typePillTextActive: { color: Colors.primary, fontWeight: '700' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: 8,
  },
  pickerText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  // Date button
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  dateBtnText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  // (date wheel modal styles are in wheelStyles below)
  // Upload button
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    margin: Spacing.sm,
    backgroundColor: Colors.primaryLight,
  },
  uploadTextWrap: { flex: 1 },
  uploadLabel: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  uploadFileName: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  removeFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  removeFileText: { fontSize: 13, color: Colors.danger, fontWeight: '500' },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginVertical: 10,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  modalLoader: { marginTop: 24 },
  modalList: { flex: 1 },
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalRowText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  confirmBtn: {
    marginHorizontal: Spacing.md,
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
