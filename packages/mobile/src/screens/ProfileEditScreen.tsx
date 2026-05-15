import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Locale, t, isRTL } from '../lib/i18n';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

interface Props {
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

export function ProfileEditScreen({ locale, onBack, onSuccess }: Props) {
  const { user, updateProfile } = useAuth();
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError('');

    if (!fullName.trim()) {
      setError(i18n.requiredField + i18n.fullName);
      return;
    }

    if (!phone.trim()) {
      setError(i18n.requiredField + i18n.phoneFieldLabel);
      return;
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setError(i18n.requiredField + i18n.currentPasswordLabel);
        return;
      }
      if (!newPassword) {
        setError(i18n.requiredField + i18n.resetNewPassword);
        return;
      }
      if (newPassword.length < 8) {
        setError(i18n.passwordMinLength);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(i18n.passwordMismatch);
        return;
      }
    }

    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      onSuccess();
    } catch (e: any) {
      const message =
        e?.response?.data?.message ?? e?.message ?? i18n.failedToUpdateProfile;
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <View style={{ height: SB_H }} />
        <View
          style={[
            styles.headerRow,
            { flexDirection: rtl ? 'row' : 'row-reverse' },
          ]}
        >
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onBack}
            activeOpacity={0.8}
          >
            <AppIcon
              name={rtl ? 'arrow-right' : 'arrow-left'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {i18n.editProfile}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Field
              label={i18n.fullName}
              value={fullName}
              onChangeText={setFullName}
              placeholder={i18n.fullName}
              rtl={rtl}
            />
            <Field
              label={i18n.phoneFieldLabel}
              value={phone}
              onChangeText={setPhone}
              placeholder={i18n.phoneFieldLabel}
              keyboardType="phone-pad"
              autoCapitalize="none"
              rtl={rtl}
            />
            <Field
              label={i18n.email}
              value={user?.email ?? ''}
              editable={false}
              placeholder={i18n.email}
              rtl={rtl}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, rtl && styles.rtlText]}>
              {i18n.changePassword}
            </Text>
            <Field
              label={i18n.currentPasswordLabel}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={i18n.currentPasswordLabel}
              secureTextEntry={!showCurrentPassword}
              showSecureToggle
              secureVisible={showCurrentPassword}
              onToggleSecure={() => setShowCurrentPassword((value) => !value)}
              autoCapitalize="none"
              rtl={rtl}
            />
            <Field
              label={i18n.resetNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={i18n.resetNewPassword}
              secureTextEntry={!showNewPassword}
              showSecureToggle
              secureVisible={showNewPassword}
              onToggleSecure={() => setShowNewPassword((value) => !value)}
              autoCapitalize="none"
              rtl={rtl}
            />
            <Field
              label={i18n.resetConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={i18n.resetConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              showSecureToggle
              secureVisible={showConfirmPassword}
              onToggleSecure={() => setShowConfirmPassword((value) => !value)}
              autoCapitalize="none"
              rtl={rtl}
            />
          </View>

          {!!error && (
            <Text style={[styles.errorText, rtl && styles.rtlText]}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>{i18n.save}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  editable = true,
  autoCapitalize,
  rtl,
  showSecureToggle,
  secureVisible,
  onToggleSecure,
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  rtl?: boolean;
  showSecureToggle?: boolean;
  secureVisible?: boolean;
  onToggleSecure?: () => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, rtl && styles.rtlText]}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[
            styles.input,
            styles.inputInner,
            rtl && styles.rtlInput,
            !editable && styles.inputDisabled,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoCapitalize={autoCapitalize}
        />
        {showSecureToggle && onToggleSecure ? (
          <TouchableOpacity
            onPress={onToggleSecure}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon
              name={secureVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { backgroundColor: Colors.primary, paddingBottom: 16 },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: { width: 38, height: 38 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  inputWrap: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bg,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    borderRadius: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  inputInner: { flex: 1, minHeight: 48 },
  inputDisabled: { opacity: 0.7 },
  rtlText: { textAlign: 'right' },
  rtlInput: { textAlign: 'right' },
  errorText: { fontSize: 13, color: Colors.danger },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },
});
