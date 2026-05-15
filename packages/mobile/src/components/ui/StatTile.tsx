import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../lib/theme';
import { AppIcon } from './AppIcon';

interface Props {
  icon: string;
  label: string;
  value: number | string;
  sub: string;
  accent: string;
  accentBg: string;
}

export function StatTile({ icon, label, value, sub, accent, accentBg }: Props) {
  return (
    <View style={[styles.card, { borderTopColor: accent }]}>
      <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
        <AppIcon name={icon} size={20} color={accent} />
      </View>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    borderTopWidth: 3,
    width: '47.5%',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  value: { fontSize: 28, fontWeight: '800' as const, lineHeight: 32 },
  label: {
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  sub: { fontSize: 12, color: Colors.textMuted },
});
