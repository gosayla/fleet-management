import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import {Locale} from '../../lib/i18n';
import {Colors, Spacing} from '../../lib/theme';
import {AppIcon} from './AppIcon';

export interface TabItem {
  key: string;
  icon: string;
  labelAr: string;
  labelEn: string;
}

interface Props {
  tabs: TabItem[];
  activeKey: string;
  locale: Locale;
  onPress: (key: string) => void;
}

export function BottomTabBar({tabs, activeKey, locale, onPress}: Props) {
  return (
    <View style={styles.bar}>
      {tabs.map(tab => {
        const active = tab.key === activeKey;
        const label = locale === 'ar' ? tab.labelAr : tab.labelEn;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => onPress(tab.key)}
            activeOpacity={0.7}>
            {/* Active indicator dot at top */}
            <View style={[styles.indicator, active && styles.indicatorActive]} />
            <AppIcon
              name={tab.icon}
              size={24}
              color={active ? Colors.tabActive : Colors.tabInactive}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: Spacing.xs,
  },
  item: {flex: 1, alignItems: 'center', paddingTop: 6, gap: 3},
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  indicatorActive: {backgroundColor: Colors.tabActive},
  label: {fontSize: 10, fontWeight: '500' as const, color: Colors.tabInactive, textAlign: 'center'},
  labelActive: {color: Colors.tabActive, fontWeight: '700' as const},
});