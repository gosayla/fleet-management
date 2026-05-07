import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Locale, t} from '../lib/i18n';
import {Colors, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

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

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <AppIcon name="truck" size={32} color={Colors.white} />
          </View>
          <Text style={styles.brand}>eLEET</Text>
          <Text style={[styles.welcome, isRTL && styles.rtl]}>
            {locale === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}
          </Text>
          <Text style={[styles.tagline, isRTL && styles.rtl]}>
            {locale === 'ar' ? 'إدارة أساطيلك بكفاءة' : 'Manage your fleet efficiently'}
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* Phone */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, isRTL && styles.rtl]}>{i18n.phone}</Text>
            <View style={[styles.inputWrap, focusedField === 'phone' && styles.inputWrapFocused]}>
              <AppIcon name="phone-outline" size={18} color={focusedField === 'phone' ? Colors.primary : Colors.textMuted} />
              <TextInput
                style={[styles.input, isRTL && styles.rtl]}
                placeholder={i18n.phone}
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

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, isRTL && styles.rtl]}>{i18n.password}</Text>
            <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}>
              <AppIcon name="lock-outline" size={18} color={focusedField === 'password' ? Colors.primary : Colors.textMuted} />
              <TextInput
                style={[styles.input, isRTL && styles.rtl]}
                placeholder={i18n.password}
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign={isRTL ? 'right' : 'left'}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.btnText}>{i18n.signIn}</Text>}
          </TouchableOpacity>
        </View>

        {/* Language toggle */}
        <TouchableOpacity style={styles.langPill} onPress={onToggleLocale} activeOpacity={0.7}>
          <Text style={styles.langText}>{i18n.languageLabel}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.primary},
  scroll: {flexGrow: 1, justifyContent: 'center'},

  hero: {alignItems: 'center', paddingTop: Spacing.xxl, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg},
  logoCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brand: {fontSize: 32, fontWeight: '800' as const, color: Colors.white, letterSpacing: 3, marginBottom: 6},
  welcome: {...Typography.h2, color: Colors.white, textAlign: 'center'},
  tagline: {fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 6, textAlign: 'center'},

  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  field: {gap: 6},
  fieldLabel: {fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, letterSpacing: 0.5},
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bg,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
  },
  inputWrapFocused: {borderColor: Colors.primary, backgroundColor: Colors.primaryLight},
  input: {flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0},
  rtl: {textAlign: 'right' as const},
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {opacity: 0.55},
  btnText: {fontSize: 16, fontWeight: '700' as const, color: Colors.white},

  langPill: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  langText: {fontSize: 13, fontWeight: '600' as const, color: Colors.white},
});