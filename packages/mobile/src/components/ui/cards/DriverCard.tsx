import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {Locale, isRTL} from '../../../lib/i18n';
import {Colors, Spacing} from '../../../lib/theme';
import {AppIcon} from '../AppIcon';
import {resolvePhotoUrl} from '../../../lib/api';

export interface DriverCardData {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  licenseNumber: string;
  status: string;
  photoUrl?: string;
}

interface Props {
  driver: DriverCardData;
  locale: Locale;
  isLast?: boolean;
  onPress?: () => void;
}

// Status maps to a teal badge (ACTIVE) or muted badge
const STATUS_BADGE: Record<string, {bg: string; text: string; label: Record<Locale, string>}> = {
  ACTIVE:     {bg: Colors.primary,     text: '#fff',            label: {en: 'Active',     ar: 'نشط',           hi: 'सक्रिय',       bn: 'সক্রিয়',      ur: 'فعال'}},
  OFF_DUTY:   {bg: Colors.borderLight, text: Colors.textMuted,  label: {en: 'Off Duty',   ar: 'خارج الخدمة',   hi: 'ड्यूटी से बाहर', bn: 'ড্যুটি থেকে বাইরে', ur: 'ڈیوٹی سے باہر'}},
  ON_LEAVE:   {bg: Colors.warningLight,text: Colors.warning,    label: {en: 'On Leave',   ar: 'إجازة',         hi: 'छुट्टी पर',     bn: 'ছুটিতে',      ur: 'چھٹی پر'}},
  SUSPENDED:  {bg: Colors.dangerLight, text: Colors.danger,     label: {en: 'Suspended',  ar: 'موقوف',         hi: 'निलंबित',      bn: 'স্থগিত',      ur: 'معطل'}},
  TERMINATED: {bg: Colors.dangerLight, text: Colors.danger,     label: {en: 'Terminated', ar: 'منتهي',         hi: 'समाप्त',       bn: 'সমাপ্ত',      ur: 'ختم'}},
};

export function DriverCard({driver, locale, onPress}: Props) {
  const badge = STATUS_BADGE[driver.status] ?? STATUS_BADGE.OFF_DUTY;
  const initials = (driver.fullName ?? '?')
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const subtitle = driver.phone ?? '—';
  const label = badge.label[locale];
  const photoUrl = resolvePhotoUrl(driver.photoUrl);

  const rtl = isRTL(locale);

  return (
    <TouchableOpacity style={[styles.card, !rtl && {flexDirection: 'row-reverse'}]} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.avatar}>
        {photoUrl ? (
          <Image source={{uri: photoUrl}} style={styles.photo} />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{driver.fullName}</Text>
        <Text style={[styles.subtitle, {textAlign: !rtl ? 'right' : 'left'}]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={[styles.badge, {backgroundColor: badge.bg}]}>
        <AppIcon name="star" size={11} color={badge.text} />
        <Text style={[styles.badgeText, {color: badge.text}]}>{label}</Text>
      </View>
      <AppIcon name={rtl ? "arrow-left" : "arrow-right"} size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    gap: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photo: {width: 48, height: 48, borderRadius: 24},
  avatarText: {fontSize: 17, fontWeight: '700' as const, color: Colors.primary},
  body: {flex: 1},
  name: {fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary},
  subtitle: {fontSize: 13, color: Colors.textMuted, marginTop: 2},
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {fontSize: 12, fontWeight: '700' as const},
});