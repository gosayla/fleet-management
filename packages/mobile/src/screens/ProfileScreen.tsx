import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Locale, t} from '../lib/i18n';

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
  onBack: () => void;
}

export function ProfileScreen({locale, onToggleLocale, onBack}: Props) {
  const {user, logout} = useAuth();
  const i18n = t(locale);
  const isRTL = locale === 'ar';

  function confirmLogout() {
    Alert.alert(i18n.logoutTitle, i18n.logoutConfirm, [
      {text: i18n.cancel, style: 'cancel'},
      {text: i18n.logout, style: 'destructive', onPress: logout},
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>{i18n.profile}</Text>
        <TouchableOpacity style={styles.langBtn} onPress={onToggleLocale}>
          <Text style={styles.langText}>{i18n.languageLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>

        <Text style={[styles.name, isRTL && styles.rtlText]}>{user?.name}</Text>
        <Text style={[styles.email, isRTL && styles.rtlText]}>{user?.email}</Text>
        <Text style={[styles.role, isRTL && styles.rtlText]}>{user?.role}</Text>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutText}>{i18n.logout}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  headerRtl: {flexDirection: 'row-reverse'},
  backBtn: {padding: 4},
  backText: {fontSize: 20, color: '#2563eb', fontWeight: '700'},
  heading: {flex: 1, fontSize: 20, fontWeight: '700', color: '#111827'},
  langBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langText: {color: '#374151', fontSize: 12, fontWeight: '600'},
  body: {flex: 1, alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8},
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {color: '#fff', fontSize: 32, fontWeight: '700'},
  name: {fontSize: 22, fontWeight: '700', color: '#111827'},
  email: {fontSize: 15, color: '#6b7280'},
  role: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rtlText: {textAlign: 'right'},
  divider: {width: '100%', height: 1, backgroundColor: '#f3f4f6', marginVertical: 24},
  logoutBtn: {
    width: '100%',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {color: '#dc2626', fontWeight: '700', fontSize: 16},
});
