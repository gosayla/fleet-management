import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Locale, t } from '../../lib/i18n';
import { Colors } from '../../lib/theme';
import { AppIcon } from './AppIcon';

type TripLegValue = 'OUTBOUND' | 'RETURN';

interface Props {
  leg?: TripLegValue | string | null;
  locale: Locale;
}

const LEG_META: Record<
  TripLegValue,
  { bg: string; color: string; icon: string }
> = {
  OUTBOUND: { bg: '#E8F4FD', color: '#1D4ED8', icon: 'arrow-top-right' },
  RETURN: { bg: '#F3E8FF', color: '#9333EA', icon: 'arrow-u-left-top' },
};

export function TripLegBadge({ leg, locale }: Props) {
  if (leg !== 'OUTBOUND' && leg !== 'RETURN') {
    return null;
  }

  const i18n = t(locale);
  const meta = LEG_META[leg];
  const label = leg === 'OUTBOUND' ? i18n.legOutbound : i18n.legReturn;

  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <AppIcon name={meta.icon} size={12} color={meta.color} />
      <Text style={[styles.text, { color: meta.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  text: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
});
