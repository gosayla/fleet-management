import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar} from 'react-native';
import {Locale} from '../../lib/i18n';
import {Colors, Spacing, Typography} from '../../lib/theme';

interface Props {
  locale: Locale;
  title: string;
  subtitle?: string;
  languageLabel: string;
  onToggleLocale: () => void;
}

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export function ScreenHeader({locale, title, subtitle, languageLabel, onToggleLocale}: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={[styles.title, locale === 'ar' && styles.rtl]}>{title}</Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, locale === 'ar' && styles.rtl]}>{subtitle}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.langPill} onPress={onToggleLocale} activeOpacity={0.7}>
        <Text style={styles.langText}>{languageLabel}</Text>
      </TouchableOpacity>
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
  left: {flex: 1},
  title: {...Typography.h2, color: Colors.white},
  subtitle: {fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2},
  rtl: {textAlign: 'right' as const},
  langPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginLeft: Spacing.sm,
  },
  langText: {fontSize: 12, fontWeight: '600' as const, color: Colors.white},
});