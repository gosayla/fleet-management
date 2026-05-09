import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Modal,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Locale, t, isRTL as getIsRTL} from '../lib/i18n';
import {Colors, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {api} from '../lib/api';

interface Props {
  locale: Locale;
  onSetLocale: (locale: Locale) => void;
}

export function LoginScreen({locale, onSetLocale}: Props) {
  const {login} = useAuth();
  const i18n = t(locale);
  const isRTL = getIsRTL(locale);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'phone' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetCrNumber, setResetCrNumber] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin() {
    if (!phone || !password) {
      Alert.alert(i18n.formErrorTitle, i18n.formErrorMessage);
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch {
      Alert.alert(i18n.loginErrorTitle, i18n.loginErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!resetIdentifier.trim() || !resetCrNumber.trim() || !resetPassword || !resetConfirmPassword) {
      Alert.alert(i18n.formErrorTitle, i18n.fillAllFields);
      return;
    }

    if (resetPassword.length < 8) {
      Alert.alert(i18n.formErrorTitle, i18n.passwordMinLength);
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      Alert.alert(i18n.formErrorTitle, i18n.passwordMismatch);
      return;
    }

    setResetLoading(true);
    try {
      await api.post('/auth/reset-password', {
        identifier: resetIdentifier.trim(),
        crNumber: resetCrNumber.trim(),
        newPassword: resetPassword,
      });

      Alert.alert(i18n.resetSuccess, i18n.resetSuccessMsg);
      setResetVisible(false);
      setResetIdentifier('');
      setResetCrNumber('');
      setResetPassword('');
      setResetConfirmPassword('');
    } catch (e: any) {
      const message = String(e?.message ?? '');
      Alert.alert(
        i18n.resetFailed,
        message.includes('401') || message.includes('403')
          ? i18n.resetFailedVerify
          : i18n.resetFailedGeneric,
      );
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      enabled={Platform.OS === 'ios'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#eaf3f2" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scroll} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEnabled
        showsVerticalScrollIndicator={false}
      >

        {/* Hero Section */}
        <View style={styles.hero}>
          {/* Gradient overlay effect */}
          <View style={styles.heroGradient} />

          {/* Logo Row */}
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <AppIcon name="truck" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.brand}>eLEET</Text>
          </View>

          <Text style={[styles.welcome, isRTL && styles.rtl]}>
            {i18n.welcome}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.rtl]}>
            {i18n.loginSubtitle}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Phone Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isRTL && styles.rtl]}>
              {i18n.phone}
            </Text>
            <View style={[
              styles.inputWrap,
              focusedField === 'phone' && styles.inputWrapFocused,
              phone && styles.inputWrapFilled,
            ]}>
              <AppIcon 
                name="phone-outline" 
                size={20} 
                color={focusedField === 'phone' ? Colors.primary : (phone ? Colors.primary : Colors.textMuted)} 
              />
              <TextInput
                style={[styles.input, isRTL && styles.rtl]}
                placeholder="05xxxxxxxx"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                textAlign={isRTL ? 'right' : 'left'}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isRTL && styles.rtl]}>
              {i18n.password}
            </Text>
            <View style={[
              styles.inputWrap,
              focusedField === 'password' && styles.inputWrapFocused,
              password && styles.inputWrapFilled,
            ]}>
              <AppIcon 
                name="lock-outline" 
                size={20} 
                color={focusedField === 'password' ? Colors.primary : (password ? Colors.primary : Colors.textMuted)} 
              />
              <TextInput
                style={[styles.input, isRTL && styles.rtl]}
                placeholder={i18n.password}
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign={isRTL ? 'right' : 'left'}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              >
                <AppIcon 
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                  size={20} 
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.6} onPress={() => setResetVisible(true)}>
            <Text style={[styles.forgotText, isRTL && {textAlign: 'right'}]}>
              {i18n.forgotPassword}
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color={Colors.white} size="small" />
              : (
                <View style={styles.btnContent}>
                  <Text style={styles.btnText}>{i18n.signIn}</Text>
                  <AppIcon name="arrow-right" size={18} color={Colors.white} />
                </View>
              )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Info Text */}
          <Text style={[styles.infoText, isRTL && styles.rtl]}>
            {i18n.loginInfo}
          </Text>
        </View>

        {/* Language Selector */}
        <View style={styles.langRow}>
          {(['ar', 'en', 'hi', 'bn', 'ur'] as Locale[]).map(lang => {
            const labels: Record<Locale, string> = {ar: 'العربية', en: 'EN', hi: 'हिन्दी', bn: 'বাংলা', ur: 'اردو'};
            const active = locale === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.langChip, active && styles.langChipActive]}
                onPress={() => onSetLocale(lang)}
                activeOpacity={0.7}>
                <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                  {labels[lang]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomSection}>
          <Text style={[styles.bottomHeadline, isRTL && styles.rtl]}>
            {i18n.managingFleets}
          </Text>
          <Text style={[styles.bottomHeadline, isRTL && styles.rtl]}>
            {i18n.dayToDay}
          </Text>
        </View>

      </ScrollView>

      <Modal visible={resetVisible} transparent animationType="fade" onRequestClose={() => setResetVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
              {i18n.resetTitle}
            </Text>
            <Text style={[styles.modalSubTitle, isRTL && styles.rtl]}>
              {i18n.resetSubtitle}
            </Text>

            <TextInput
              style={[styles.modalInput, isRTL && styles.rtl]}
              placeholder={i18n.resetIdentifierPlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={resetIdentifier}
              onChangeText={setResetIdentifier}
              autoCapitalize="none"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <TextInput
              style={[styles.modalInput, isRTL && styles.rtl]}
              placeholder={i18n.resetCrPlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={resetCrNumber}
              onChangeText={setResetCrNumber}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <TextInput
              style={[styles.modalInput, isRTL && styles.rtl]}
              placeholder={i18n.resetNewPassword}
              placeholderTextColor={Colors.textMuted}
              value={resetPassword}
              onChangeText={setResetPassword}
              secureTextEntry
              textAlign={isRTL ? 'right' : 'left'}
            />

            <TextInput
              style={[styles.modalInput, isRTL && styles.rtl]}
              placeholder={i18n.resetConfirmPassword}
              placeholderTextColor={Colors.textMuted}
              value={resetConfirmPassword}
              onChangeText={setResetConfirmPassword}
              secureTextEntry
              textAlign={isRTL ? 'right' : 'left'}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setResetVisible(false)} disabled={resetLoading}>
                <Text style={styles.modalCancelText}>{i18n.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, resetLoading && styles.btnDisabled]} onPress={handleResetPassword} disabled={resetLoading}>
                {resetLoading
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.modalConfirmText}>{i18n.resetConfirmBtn}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#eaf3f2'},
  scrollView: {flex: 1, backgroundColor: '#eaf3f2'},
  scroll: {flexGrow: 1, minHeight: '100%', justifyContent: 'space-between', paddingTop: Spacing.lg, paddingBottom: Spacing.lg},

  /* Hero Section */
  hero: {
    alignItems: 'stretch',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    top: -36,
    right: -36,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(31, 130, 120, 0.08)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(31, 130, 120, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1f8278',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  brand: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: '#2d8f87',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  welcome: {
    ...Typography.h2,
    color: '#202a2a',
    textAlign: 'left',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#46585a',
    textAlign: 'left',
    marginTop: 4,
    marginBottom: Spacing.md,
  },

  /* Form Card */
  card: {
    backgroundColor: '#eef6f5',
    marginHorizontal: 0,
    borderRadius: 0,
    padding: Spacing.md,
    gap: Spacing.md,
  },

  /* Form Fields */
  fieldGroup: {gap: Spacing.sm},
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#36494a',
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#edf4f4',
    borderWidth: 1.2,
    borderColor: '#95cac4',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  inputWrapFocused: {
    borderColor: '#4aa89f',
    backgroundColor: '#f4fbfa',
  },
  inputWrapFilled: {
    borderColor: '#7ec2ba',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
    padding: 0,
  },
  rtl: {textAlign: 'right' as const},

  /* Forgot Password */
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#3d9690',
  },

  /* Login Button */
  btn: {
    backgroundColor: '#4ea6a0',
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    shadowColor: '#4ea6a0',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#d9e8e6',
    marginVertical: Spacing.xs,
  },

  /* Info Text */
  infoText: {
    fontSize: 11,
    color: '#7f9496',
    textAlign: 'center',
    lineHeight: 16,
  },

  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  langChip: {
    borderWidth: 1.5,
    borderColor: '#b7d8d4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  langChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  langChipTextActive: {
    color: '#fff',
  },

  bottomSection: {
    backgroundColor: 'transparent',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomHeadline: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: '#2f3538',
    lineHeight: 38,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  modalSubTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  modalConfirmBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  modalConfirmText: {
    color: Colors.white,
    fontWeight: '700' as const,
  },
});