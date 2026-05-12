import React, {useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Platform, ActivityIndicator, Animated} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {Locale, t, isRTL} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

interface Props {
  locale: Locale;
  onSetLocale: (locale: Locale) => void;
  onBack: () => void;
  onAuditLogPress?: () => void;
}

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const HEADER_FULL = 300;
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
  const isRtl = isRTL(locale);
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
    inputRange: [0, COLLAPSE], outputRange: [20, 15], extrapolate: 'clamp',
  });
  const animTopPad = scrollY.interpolate({
    inputRange: [0, COLLAPSE], outputRange: [SB_HEIGHT + 20, SB_HEIGHT + 14], extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Collapsing teal header ── */}
      <Animated.View style={[styles.header, {height: animHeaderHeight, paddingTop: animTopPad}]}>
        {/* Avatar — fades + shrinks away */}
        <Animated.View style={[styles.avatar, {width: animAvatarSize, height: animAvatarSize, borderRadius: 42, opacity: animAvatarOpacity}]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </Animated.View>

        {/* Name — always visible, shrinks slightly */}
        <Animated.Text style={[styles.name, {fontSize: animNameSize}]} numberOfLines={1}>
          {displayName}
        </Animated.Text>

        {/* Email + role badge — fade away */}
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
          <InfoRow icon="phone-outline" label={i18n.phone} value={(user as any)?.phone ?? ''} isRtl={isRtl} />
          <InfoRow icon="email-outline" label={i18n.email} value={user?.email ?? ''} isRtl={isRtl} />
          <InfoRow icon="shield-account-outline" label={i18n.role} value={user?.role ?? ''} isRtl={isRtl} />
          <InfoRow icon="office-building-outline" label={i18n.company} value={(user as any)?.companyName ?? (user as any)?.companyId ?? ''} last isRtl={isRtl} />
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
          <TouchableOpacity style={[styles.auditBtn, isRtl && {flexDirection: 'row-reverse'}]} onPress={onAuditLogPress} activeOpacity={0.85}>
            <View style={styles.auditIconWrap}>
              <AppIcon name="clipboard-list-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.auditText}>{i18n.auditLog}</Text>
            <AppIcon name={isRtl ? "chevron-right" : "chevron-left"} size={18} color={Colors.textMuted} />
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

function InfoRow({icon, label, value, last, isRtl}: {icon: string; label: string; value: string; last?: boolean; isRtl?: boolean}) {
  return (
    <View style={[row.wrap, !last && row.border, isRtl && {flexDirection: 'row-reverse'}]}>
      <View style={row.iconWrap}>
        <AppIcon name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={row.content}>
        <Text style={[row.label, isRtl && {textAlign: 'left'}]}>{label}</Text>
        <Text style={[row.value, isRtl && {textAlign: 'left'}]} numberOfLines={1}>{value || '—'}</Text>
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
    paddingHorizontal: Spacing.md,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  avatarText: {fontSize: 34, fontWeight: '700' as const, color: Colors.white},
  name: {
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleWrap: {alignItems: 'center', gap: 6},
  email: {fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center'},
  roleBadge: {
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