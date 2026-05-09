import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, StatusBar, Platform, ActivityIndicator} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Locale, t, isRTL as getIsRTL} from '../lib/i18n';
import {Colors, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

interface Props {
  locale: Locale;
  onSetLocale: (locale: Locale) => void;
  onBack: () => void;
}

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const LANGUAGE_OPTIONS = [
  {value: 'ar', label: 'العربية'},
  {value: 'en', label: 'English'},
  {value: 'hi', label: 'हिन्दी'},
  {value: 'bn', label: 'বাংলা'},
  {value: 'ur', label: 'اردو'},
] as const;

export function ProfileScreen({locale, onSetLocale, onBack}: Props) {
  const {user, logout, updateLanguage} = useAuth();
  const i18n = t(locale);
  const isRTL = getIsRTL(locale);
  const [savingLanguage, setSavingLanguage] = useState<string | null>(null);

  function confirmLogout() {
    Alert.alert(i18n.logoutTitle, i18n.logoutConfirm, [
      {text: i18n.cancel, style: 'cancel'},
      {text: i18n.logout, style: 'destructive', onPress: logout},
    ]);
  }

  const initials = ((user as any)?.fullName ?? user?.email ?? '?')[0].toUpperCase();
  const displayName = (user as any)?.fullName ?? user?.email ?? '';
  const preferredLanguage = (user as any)?.language ?? 'ar';

  async function handleLanguageChange(language: 'ar' | 'en' | 'hi' | 'bn' | 'ur') {
    if (language === locale) return;
    // Change UI immediately (optimistic)
    onSetLocale(language);
    setSavingLanguage(language);
    // Sync to backend in background — don't block or show error if offline
    updateLanguage(language).catch(() => {}).finally(() => setSavingLanguage(null));
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      {/* White curved panel */}
      <View style={styles.panel}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Info section */}
        <View style={styles.section}>
          <InfoRow icon="email-outline" label={locale === 'ar' ? 'البريد الإلكتروني' : 'Email'} value={user?.email ?? ''} />
          <InfoRow icon="shield-account-outline" label={locale === 'ar' ? 'الدور' : 'Role'} value={user?.role ?? ''} />
          <InfoRow icon="office-building-outline" label={locale === 'ar' ? 'الشركة' : 'Company'} value={(user as any)?.companyId ?? ''} last />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{i18n.appLanguage}</Text>
          <View style={styles.languageGrid}>
            {LANGUAGE_OPTIONS.map((option) => {
              const active = locale === option.value;
              const loading = savingLanguage === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.languageChip, active && styles.languageChipActive]}
                  onPress={() => handleLanguageChange(option.value)}
                  activeOpacity={0.8}
                  disabled={!!savingLanguage}
                >
                  {loading ? <ActivityIndicator size="small" color={active ? '#fff' : Colors.primary} /> : (
                    <Text style={[styles.languageChipText, active && styles.languageChipTextActive]}>{option.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
          <AppIcon name="logout" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>{i18n.logout}</Text>
        </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

function InfoRow({icon, label, value, last}: {icon: string; label: string; value: string; last?: boolean}) {
  return (
    <View style={[row.wrap, !last && row.border]}>
      <View style={row.iconWrap}>
        <AppIcon name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={row.content}>
        <Text style={row.label}>{label}</Text>
        <Text style={row.value} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14},
  border: {borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  content: {flex: 1},
  label: {fontSize: 11, fontWeight: '600' as const, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2},
  value: {...Typography.bodyMd, color: Colors.textPrimary},
});

const SB = SB_HEIGHT;
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingTop: SB + 8,
    paddingBottom: Spacing.xl + 20,  // extra so panel overlaps nicely
    paddingHorizontal: Spacing.md,
  },
  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    overflow: 'hidden',
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: Spacing.sm,
  },
  avatarText: {fontSize: 34, fontWeight: '700' as const, color: Colors.white},
  name: {...Typography.h2, color: Colors.white, marginBottom: 4, textAlign: 'center'},
  email: {fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center'},
  roleBadge: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  roleText: {fontSize: 12, fontWeight: '600' as const, color: Colors.white, textTransform: 'uppercase', letterSpacing: 1},
  body: {padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl},
  sectionLabel: {fontSize: 12, fontWeight: '700' as const, color: Colors.textMuted, marginBottom: 12, textTransform: 'uppercase'},
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  languageGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  languageChip: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.bg,
    minWidth: 86,
    alignItems: 'center',
  },
  languageChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  languageChipText: {fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary},
  languageChipTextActive: {color: '#fff'},
  logoutBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: {fontSize: 15, fontWeight: '700' as const, color: Colors.danger},
});