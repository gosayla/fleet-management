import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { Locale, isRTL } from '../../lib/i18n';
import { Colors, Spacing, Typography } from '../../lib/theme';

interface Props {
  locale: Locale;
  title: string;
  subtitle?: string;
}

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

export function ScreenHeader({ locale, title, subtitle }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={[styles.title, isRTL(locale) && styles.rtl]}>{title}</Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, isRTL(locale) && styles.rtl]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 20,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  left: { flex: 1 },
  title: { ...Typography.h2, color: Colors.white },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  rtl: { textAlign: 'right' as const },
});
