import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Locale} from '../../../lib/i18n';
import {Colors, Spacing} from '../../../lib/theme';
import {AppIcon} from '../AppIcon';

export interface DriverCardData {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  licenseNumber: string;
  status: string;
}

interface Props {
  driver: DriverCardData;
  locale: Locale;
  isLast?: boolean;
}

// Status maps to a teal badge (ACTIVE) or muted badge
const STATUS_BADGE: Record<string, {bg: string; text: string; label: {en: string; ar: string}}> = {
  ACTIVE:     {bg: Colors.primary,     text: '#fff',            label: {en: 'Active',    ar: 'نشط'}},
  OFF_DUTY:   {bg: Colors.borderLight, text: Colors.textMuted,  label: {en: 'Off Duty',  ar: 'خارج الخدمة'}},
  ON_LEAVE:   {bg: Colors.warningLight,text: Colors.warning,    label: {en: 'On Leave',  ar: 'إجازة'}},
  SUSPENDED:  {bg: Colors.dangerLight, text: Colors.danger,     label: {en: 'Suspended', ar: 'موقوف'}},
  TERMINATED: {bg: Colors.dangerLight, text: Colors.danger,     label: {en: 'Terminated',ar: 'منتهي'}},
};

export function DriverCard({driver, locale}: Props) {
  const badge = STATUS_BADGE[driver.status] ?? STATUS_BADGE.OFF_DUTY;
  const initials = (driver.fullName ?? '?')
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const subtitle = driver.phone ?? driver.licenseNumber;
  const label = badge.label[locale === 'ar' ? 'ar' : 'en'];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{driver.fullName}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={[styles.badge, {backgroundColor: badge.bg}]}>
        <AppIcon name="star" size={11} color={badge.text} />
        <Text style={[styles.badgeText, {color: badge.text}]}>{label}</Text>
      </View>
      <AppIcon name="arrow-right" size={20} color={Colors.textMuted} />
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
  },
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