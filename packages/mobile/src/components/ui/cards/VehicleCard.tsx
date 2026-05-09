import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {Locale} from '../../../lib/i18n';
import {Colors, Spacing} from '../../../lib/theme';
import {AppIcon} from '../AppIcon';
import {resolvePhotoUrl} from '../../../lib/api';

export interface VehicleCardData {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  type: string;
  status: string;
  mileage: number;
  companyName?: string;
  photos?: {url: string; isProfile: boolean}[];
}

interface Props {
  vehicle: VehicleCardData;
  locale: Locale;
  isLast?: boolean;
  onPress?: () => void;
}

const STATUS_BADGE: Record<string, {bg: string; text: string; label: Record<Locale, string>}> = {
  ACTIVE:      {bg: Colors.primary,     text: '#fff',           label: {en: 'In Use',      ar: 'نشطة',      hi: 'उपयोग में',  bn: 'ব্যবহারে',  ur: 'استعمال میں'}},
  MAINTENANCE: {bg: Colors.warningLight,text: Colors.warning,   label: {en: 'Maintenance', ar: 'صيانة',     hi: 'रखरखाव',     bn: 'রক্ষণাবেক্ষণ', ur: 'دیکھ بھال'}},
  INACTIVE:    {bg: Colors.borderLight, text: Colors.textMuted, label: {en: 'Inactive',    ar: 'غير نشطة',  hi: 'निष्क्रिय',  bn: 'নিষ্ক্রিয়',  ur: 'غیر فعال'}},
  RETIRED:     {bg: Colors.dangerLight, text: Colors.danger,    label: {en: 'Retired',     ar: 'متقاعدة',   hi: 'सेवानिवृत्त', bn: 'অবসরপ্রাপ্ত', ur: 'ریٹائرڈ'}},
};

const TYPE_ICONS: Record<string, string> = {
  SEDAN: 'car-outline',
  SUV: 'car-outline',
  TRUCK: 'truck-outline',
  VAN: 'van-utility',
  BUS: 'bus-outline',
  MOTORCYCLE: 'motorbike',
  HEAVY_EQUIPMENT: 'excavator',
};

export function VehicleCard({vehicle, locale, onPress}: Props) {
  const badge = STATUS_BADGE[vehicle.status] ?? STATUS_BADGE.INACTIVE;
  const subtitle = `${vehicle.make}-${vehicle.model}`;
  const label = badge.label[locale];

  // Abbreviate plate: take up to 4 chars (handles both Arabic & alphanumeric plates)
  const plateAbbr = vehicle.plateNumber.replace(/\s+/g, '').slice(-4);
  const profilePhoto = vehicle.photos?.find(p => p.isProfile) ?? vehicle.photos?.[0];
  const photoUrl = resolvePhotoUrl(profilePhoto?.url);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.iconWrap}>
        {photoUrl ? (
          <Image source={{uri: photoUrl}} style={styles.photo} />
        ) : (
          <Text style={styles.plateAbbr} numberOfLines={1} adjustsFontSizeToFit>{plateAbbr}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.plate}>{vehicle.plateNumber}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={[styles.badge, {backgroundColor: badge.bg}]}>
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
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photo: {width: 48, height: 48, borderRadius: 24},
  body: {flex: 1},
  plateAbbr: {fontSize: 12, fontWeight: '800' as const, color: Colors.primary, textAlign: 'center', letterSpacing: 0.3},
  plate: {fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: 0.5},
  subtitle: {fontSize: 13, color: Colors.textMuted, marginTop: 2},
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {fontSize: 12, fontWeight: '700' as const},
});