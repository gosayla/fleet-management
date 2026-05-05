import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Locale, t} from '../lib/i18n';

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
}

export function LoginScreen({locale, onToggleLocale}: Props) {
  const {login} = useAuth();
  const i18n = t(locale);
  const isRTL = locale === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert(i18n.formErrorTitle, i18n.formErrorMessage);
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      Alert.alert(i18n.loginErrorTitle, i18n.loginErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={[styles.topBar, isRTL && styles.topBarRtl]}>
          <TouchableOpacity style={styles.langBtn} onPress={onToggleLocale}>
            <Text style={styles.langText}>{i18n.languageLabel}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, isRTL && styles.rtlText]}>{i18n.appName}</Text>
        <Text style={[styles.subtitle, isRTL && styles.rtlText]}>{i18n.subtitle}</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={i18n.email}
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign={isRTL ? 'right' : 'left'}
          />
          <TextInput
            style={styles.input}
            placeholder={i18n.password}
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textAlign={isRTL ? 'right' : 'left'}
          />
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{i18n.signIn}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#1e40af'},
  inner: {flex: 1, justifyContent: 'center', padding: 24},
  topBar: {alignItems: 'flex-end', marginBottom: 14},
  topBarRtl: {alignItems: 'flex-start'},
  langBtn: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langText: {color: '#dbeafe', fontSize: 12, fontWeight: '700'},
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 40,
  },
  rtlText: {textAlign: 'center'},
  form: {gap: 12},
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  btn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  btnDisabled: {opacity: 0.6},
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},
});
