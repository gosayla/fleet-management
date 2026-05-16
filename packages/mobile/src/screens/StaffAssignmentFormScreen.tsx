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
} from 'react-native';
import { api } from '../lib/api';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { DateWheelModal } from '../components/ui/DateWheelModal';
import { Locale, t, isRTL } from '../lib/i18n';

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

interface Props {
  mode: 'assign' | 'return';
  vehicleId: string;
  assignmentId?: string; // required for return mode
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

// ── Form state ──────────────────────────────────────────────────────────────

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

// ── Component ───────────────────────────────────────────────────────────────

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

  // date pickers
  const [showAssignedAtPicker, setShowAssignedAtPicker] = useState(false);
  const [showReturnedAtPicker, setShowReturnedAtPicker] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const setA = (field: keyof AssignForm, value: string) =>
    setAssignForm((prev) => ({ ...prev, [field]: value }));

  const setR = (field: keyof ReturnForm, value: string) =>
    setReturnForm((prev) => ({ ...prev, [field]: value }));

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
        });
        onSuccess();
      } catch (e: any) {
        setError((i18n as any).failedToSaveAssignment ?? 'Failed to save assignment');
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
      } catch (e: any) {
        setError((i18n as any).failedToSaveAssignment ?? 'Failed to save');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // ── Derived styles ───────────────────────────────────────────────────────

  const headerRowStyle = { flexDirection: (rtl ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
  const inputAlignStyle = { textAlign: (rtl ? 'right' : 'left') as 'right' | 'left' };

  const isAssign = mode === 'assign';
  const screenTitle = isAssign
    ? ((i18n as any).assignStaff ?? 'Assign Staff')
    : ((i18n as any).returnStaffVehicle ?? 'Return Vehicle');

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={{ height: SB_H }} />
        <View style={[styles.headerRow, headerRowStyle]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onBack}
            activeOpacity={0.8}
          >
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
          {/* Error banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <AppIcon name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isAssign ? (
            <>
              {/* ── Assign: Employee Info ── */}
              <Text style={styles.sectionTitle}>
                {(i18n as any).staffAssignmentSection ?? 'Staff Assignment'}
              </Text>
              <View style={styles.card}>
                {/* Assignee Name */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {(i18n as any).staffAssigneeName ?? 'Assignee Name'}
                    <Text style={styles.required}> *</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, inputAlignStyle]}
                    value={assignForm.assigneeName}
                    onChangeText={(v) => setA('assigneeName', v)}
                    placeholder={(i18n as any).staffAssigneeName ?? 'Full name'}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.divider} />
                {/* Title */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {(i18n as any).staffAssigneeTitle ?? 'Title / Role'}
                  </Text>
                  <TextInput
                    style={[styles.input, inputAlignStyle]}
                    value={assignForm.assigneeTitle}
                    onChangeText={(v) => setA('assigneeTitle', v)}
                    placeholder={(i18n as any).staffAssigneeTitle ?? 'e.g. Manager'}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.divider} />
                {/* Phone */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {i18n.driverPhone ?? 'Phone'}
                  </Text>
                  <TextInput
                    style={[styles.input, inputAlignStyle]}
                    value={assignForm.assigneePhone}
                    onChangeText={(v) => setA('assigneePhone', v)}
                    placeholder="+966 5x xxx xxxx"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.divider} />
                {/* National ID */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {i18n.nationalId ?? 'National ID'}
                  </Text>
                  <TextInput
                    style={[styles.input, inputAlignStyle]}
                    value={assignForm.assigneeNationalId}
                    onChangeText={(v) => setA('assigneeNationalId', v)}
                    placeholder="1234567890"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* ── Assign: Trip Details ── */}
              <Text style={styles.sectionTitle}>
                {i18n.tripDetails ?? 'Trip Details'}
              </Text>
              <View style={styles.card}>
                {/* Assigned At */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {(i18n as any).staffAssignedAt ?? 'Assigned At'}
                  </Text>
                  <TouchableOpacity
                    style={styles.dateField}
                    onPress={() => setShowAssignedAtPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={assignForm.assignedAt ? styles.dateText : styles.datePlaceholder}>
                      {assignForm.assignedAt || (i18n.selectDate ?? 'Select date')}
                    </Text>
                    <AppIcon name="calendar-outline" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                {/* Odometer Out */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {(i18n as any).staffOdometerOut ?? 'Odometer Out'} (km)
                  </Text>
                  <TextInput
                    style={[styles.input, inputAlignStyle]}
                    value={assignForm.odometerOut}
                    onChangeText={(v) => setA('odometerOut', v.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.divider} />
                {/* Notes */}
                <View style={styles.field}>
                  <Text style={styles.label}>{i18n.notes ?? 'Notes'}</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput, inputAlignStyle]}
                    value={assignForm.notes}
                    onChangeText={(v) => setA('notes', v)}
                    placeholder={i18n.notes ?? 'Optional notes'}
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              {/* ── Return: Details ── */}
              <Text style={styles.sectionTitle}>
                {(i18n as any).returnStaffVehicle ?? 'Return Details'}
              </Text>
              <View style={styles.card}>
                {/* Returned At */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {i18n.returnDate ?? 'Return Date'}
                  </Text>
                  <TouchableOpacity
                    style={styles.dateField}
                    onPress={() => setShowReturnedAtPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={returnForm.returnedAt ? styles.dateText : styles.datePlaceholder}>
                      {returnForm.returnedAt || (i18n.selectDate ?? 'Select date')}
                    </Text>
                    <AppIcon name="calendar-outline" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                {/* Odometer In */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {(i18n as any).staffOdometerIn ?? 'Odometer In'} (km)
                  </Text>
                  <TextInput
                    style={[styles.input, inputAlignStyle]}
                    value={returnForm.odometerIn}
                    onChangeText={(v) => setR('odometerIn', v.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.divider} />
                {/* Notes */}
                <View style={styles.field}>
                  <Text style={styles.label}>{i18n.notes ?? 'Notes'}</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput, inputAlignStyle]}
                    value={returnForm.notes}
                    onChangeText={(v) => setR('notes', v)}
                    placeholder={i18n.notes ?? 'Optional notes'}
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </View>
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
        onCancel={() => setShowAssignedAtPicker(false)}
        locale={locale}
      />
      <DateWheelModal
        visible={showReturnedAtPicker}
        value={returnForm.returnedAt}
        onConfirm={(d) => { setR('returnedAt', d); setShowReturnedAtPicker(false); }}
        onCancel={() => setShowReturnedAtPicker(false)}
        locale={locale}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // header
  header: {
    backgroundColor: Colors.primary,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  closeBtn: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // panel
  panel: {
    flex: 1,
    backgroundColor: '#f4f6f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  formContent: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: Spacing.md,
    gap: 0,
  },

  // error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626' },

  // section
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },

  // card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  // field
  field: {
    paddingVertical: 10,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  required: { color: '#dc2626' },
  input: {
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },

  // date field
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  dateText: { fontSize: 14, color: '#1f2937' },
  datePlaceholder: { fontSize: 14, color: Colors.textMuted },
});
