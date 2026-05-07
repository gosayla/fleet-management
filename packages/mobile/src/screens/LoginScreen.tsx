import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Modal,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Locale, t} from '../lib/i18n';
import {Colors, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {api} from '../lib/api';

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
}

export function LoginScreen({locale, onToggleLocale}: Props) {
  const {login} = useAuth();
  const i18n = t(locale);
  const isRTL = locale === 'ar';
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
      Alert.alert(i18n.formErrorTitle, locale === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields');
      return;
    }

    if (resetPassword.length < 8) {
      Alert.alert(i18n.formErrorTitle, locale === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      Alert.alert(i18n.formErrorTitle, locale === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setResetLoading(true);
    try {
      await api.post('/auth/reset-password', {
        identifier: resetIdentifier.trim(),
        crNumber: resetCrNumber.trim(),
        newPassword: resetPassword,
      });

      Alert.alert(
        locale === 'ar' ? 'تم بنجاح' : 'Success',
        locale === 'ar' ? 'تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.' : 'Password has been reset. You can log in now.',
      );
      setResetVisible(false);
      setResetIdentifier('');
      setResetCrNumber('');
      setResetPassword('');
      setResetConfirmPassword('');
    } catch (e: any) {
      const message = String(e?.message ?? '');
      Alert.alert(
        locale === 'ar' ? 'فشل إعادة التعيين' : 'Reset failed',
        message.includes('401') || message.includes('403')
          ? (locale === 'ar' ? 'بيانات التحقق غير صحيحة' : 'Verification details are incorrect')
          : (locale === 'ar' ? 'حدث خطأ أثناء إعادة تعيين كلمة المرور' : 'An error occurred while resetting password'),
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView 
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
          
          {/* Logo */}
          <View style={styles.logoCircle}>
            <AppIcon name="truck" size={48} color={Colors.white} />
          </View>
          
          {/* Branding */}
          <Text style={styles.brand}>eLEET</Text>
          <Text style={[styles.welcome, isRTL && styles.rtl]}>
            {locale === 'ar' ? 'أهلا وسهلا' : 'Welcome!'}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.rtl]}>
            {locale === 'ar' ? 'أدخل بيانات تسجيلك أدناه' : 'Enter your login details below'}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Phone Field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isRTL && styles.rtl]}>
              {locale === 'ar' ? 'رقم الجوال' : 'Phone Number'}
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
                placeholder={locale === 'ar' ? '+966 50 ...' : '+966 50 ...'}
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
              {locale === 'ar' ? 'كلمة المرور' : 'Password'}
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
                placeholder={locale === 'ar' ? 'كلمة المرور' : 'Password'}
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
              {locale === 'ar' ? 'هل نسيت كلمة المرور؟' : 'Forgot password?'}
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
            {locale === 'ar' 
              ? 'استخدم رقم هاتفك ورقمك السري للدخول'
              : 'Use your phone number and password to sign in'}
          </Text>
        </View>

        {/* Language Toggle */}
        <TouchableOpacity 
          style={styles.langPill} 
          onPress={onToggleLocale} 
          activeOpacity={0.7}
        >
          <AppIcon name="earth" size={16} color={Colors.white} />
          <Text style={styles.langText}>{locale === 'ar' ? 'English' : 'العربية'}</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={resetVisible} transparent animationType="fade" onRequestClose={() => setResetVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
              {locale === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
            </Text>
            <Text style={[styles.modalSubTitle, isRTL && styles.rtl]}>
              {locale === 'ar' ? 'أدخل رقم الجوال أو البريد مع رقم السجل التجاري' : 'Enter phone or email with company CR number'}
            </Text>

            <TextInput
              style={[styles.modalInput, isRTL && styles.rtl]}
              placeholder={locale === 'ar' ? 'الجوال أو البريد الإلكتروني' : 'Phone or Email'}
              placeholderTextColor={Colors.textMuted}
              value={resetIdentifier}
              onChangeText={setResetIdentifier}
              autoCapitalize="none"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <TextInput
              style={[styles.modalInput, isRTL && styles.rtl]}
              placeholder={locale === 'ar' ? 'رقم السجل التجاري' : 'Company CR Number'}
              placeholderTextColor={Colors.textMuted}
              value={resetCrNumber}
              onChangeText={setResetCrNumber}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <TextInput
              style={[styles.modalInput, isRTL && styles.rtl]}
              placeholder={locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              placeholderTextColor={Colors.textMuted}
              value={resetPassword}
              onChangeText={setResetPassword}
              secureTextEntry
              textAlign={isRTL ? 'right' : 'left'}
            />

            <TextInput
              style={[styles.modalInput, isRTL && styles.rtl]}
              placeholder={locale === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
              placeholderTextColor={Colors.textMuted}
              value={resetConfirmPassword}
              onChangeText={setResetConfirmPassword}
              secureTextEntry
              textAlign={isRTL ? 'right' : 'left'}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setResetVisible(false)} disabled={resetLoading}>
                <Text style={styles.modalCancelText}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, resetLoading && styles.btnDisabled]} onPress={handleResetPassword} disabled={resetLoading}>
                {resetLoading
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.modalConfirmText}>{locale === 'ar' ? 'تأكيد' : 'Reset'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.primary},
  scroll: {flexGrow: 1, justifyContent: 'flex-start', paddingTop: Spacing.xl, paddingBottom: Spacing.lg},

  /* Hero Section */
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  brand: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 3,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  welcome: {
    ...Typography.h2,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  /* Form Card */
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    borderRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
  },

  /* Form Fields */
  fieldGroup: {gap: Spacing.sm},
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  inputWrapFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(45, 156, 137, 0.04)',
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapFilled: {
    borderColor: 'rgba(45, 156, 137, 0.3)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
    padding: 0,
  },
  rtl: {textAlign: 'right' as const},

  /* Forgot Password */
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },

  /* Login Button */
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
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
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: Spacing.xs,
  },

  /* Info Text */
  infoText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Language Toggle */
  langPill: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  langText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.white,
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