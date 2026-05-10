import React, {useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Platform, ActivityIndicator, Animated} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Locale, t} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

interface Props {
  locale: Locale;
  onSetLocale: (locale: Locale) => void;
  onBack: () => void;
  onAuditLogPress?: () => void;
}

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const HEADER_FULL = 220;
const HEADER_MIN  = SB_HEIGHT + 56; // compact bar: status bar + row height
const COLLAPSE    = HEADER_FULL - HEADER_MIN;

const LANGUAGE_OPTIONS = [
  {value: 'ar', label: 'العربية'},
  {value: 'en', label: 'English'},
  {value: 'hi', label: 'हिन्दी'},
  {value: 'bn', label: 'বাংলা'},
  {value: 'ur', label: 'اردو'},
] as const;

export function ProfileScreen({locale, onSetLocale, onBack, onAuditLogPress}: Props) {
  const {user, logout, updateLanguage} = useAuth();
  const i18n = t(locale);
  const [savingLanguage, setSavingLanguage] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const canSeeAuditLog = onAuditLogPress && (
    user?.role === 'FLEET_MANAGER' || user?.role === 'DISPATCHER' || user?.role === 'SUPER_ADMIN'
  );

  function confirmLogout() {
    Alert.alert(i18n.logoutTitle, i18n.logoutConfirm, [
      {text: i18n.cancel, style: 'cancel'},
      {text: i18n.logout, style: 'destructive', onPress: logout},
    ]);
  }

  const initials = ((user as any)?.fullName ?? user?.email ?? '?')[0].toUpperCase();
  const displayName = (user as any)?.fullName ?? user?.email ?? '';

  async function handleLanguageChange(language: 'ar' | 'en' | 'hi' | 'bn' | 'ur') {
    if (language === locale) return;
    onSetLocale(language);
    setSavingLanguage(language);
    updateLanguage(language).catch(() => {}).finally(() => setSavingLanguage(null));
  }

  // ── Animated interpolations ───────────────────────────────────────────────
  const animHeaderHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE], outputRange: [HEADER_FULL, HEADER_MIN], extrapolate: 'clamp',
  });
  const animAvatarSize = scrollY.interpolate({
    inputRange: [0, COLLAPSE], outputRange: [84, 0], extrapolate: 'clamp',
  });
  const animAvatarOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE * 0.6], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const animSubtitleOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE * 0.4], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const animNameSize = scrollY.interpolate({
    inputRange: [0, COLLAPSE], outputRange: [20, 16], extrapolate: 'clamp',
  });
  const animTopPad = scrollY.interpolate({
    inputRange: [0, COLLAPSE], outputRange: [SB_HEIGHT + 16, SB_HEIGHT + 12], extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Collapsing teal header ── */}
      <Animated.View style={[styles.header, {height: animHeaderHeight}]}>
        {/* Back button (top-left) */}
        <Animated.View style={[styles.topBar, {paddingTop: animTopPad}]}>
          <TouchableOpacity onPress={onBack} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <AppIcon name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
          {/* Name shown in compact bar */}
          <Animated.Text style={[styles.compactName, {fontSize: animNameSize}]} numberOfLines={1}>
            {displayName}
          </Animated.Text>
          <View style={{width: 32}} />
        </Animated.View>

        {/* Avatar — fades + shrinks away */}
        <Animated.View style={[styles.avatar, {width: animAvatarSize, height: animAvatarSize, borderRadius: 42, opacity: animAvatarOpacity, marginBottom: 8}]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </Animated.View>

        {/* Subtitle: email + role badge — fades away */}
        <Animated.View style={[styles.subtitleWrap, {opacity: animSubtitleOpacity}]}>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role?.replace(/_/g, ' ')}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── White curved panel ── */}
      <Animated.ScrollView
        style={styles.panel}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}
      >
        {/* Info section */}
        <View style={styles.section}>
          <InfoRow icon="phone-outline" label={locale === 'ar' ? 'رقم الجوال' : 'Phone'} value={(user as any)?.phone ?? ''} />
          <InfoRow icon="email-outline" label={locale === 'ar' ? 'البريد الإلكتروني' : 'Email'} value={user?.email ?? ''} />
          <InfoRow icon="shield-account-outline" label={locale === 'ar' ? 'الدور' : 'Role'} value={user?.role ?? ''} />
          <InfoRow icon="office-building-outline" label={locale === 'ar' ? 'الشركة' : 'Company'} value={(user as any)?.companyName ?? (user as any)?.companyId ?? ''} last />
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

        {canSeeAuditLog && (
          <TouchableOpacity style={styles.auditBtn} onPress={onAuditLogPress} activeOpacity={0.85}>
            <View style={styles.auditIconWrap}>
              <AppIcon name="clipboard-list-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.auditText}>{i18n.auditLog}</Text>
            <AppIcon name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
          <AppIcon name="logout" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>{i18n.logout}</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
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
  value: {fontSize: 14, fontWeight: '500' as const, color: Colors.textPrimary},
});

const SB = SB_HEIGHT;
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    overflow: 'hidden',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
  },
  compactName: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700' as const,
    color: '#fff',
    marginHorizontal: 8,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  avatarText: {fontSize: 34, fontWeight: '700' as const, color: Colors.white},
  subtitleWrap: {alignItems: 'center', paddingBottom: 14},
  email: {fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center'},
  roleBadge: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  roleBadgeText: {fontSize: 12, fontWeight: '600' as const, color: Colors.white, textTransform: 'uppercase', letterSpacing: 1},
  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
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
  auditBtn: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  auditIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  auditText: {flex: 1, fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary},
});