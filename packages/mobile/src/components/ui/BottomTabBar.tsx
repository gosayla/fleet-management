import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import {Locale} from '../../lib/i18n';
import {Colors, Spacing} from '../../lib/theme';
import {AppIcon} from './AppIcon';

export interface TabItem {
  key: string;
  icon: string;
  labels: Record<Locale, string>;
}

interface Props {
  tabs: TabItem[];
  activeKey: string;
  locale: Locale;
  onPress: (key: string) => void;
  badgeByKey?: Record<string, number | undefined>;
}

export function BottomTabBar({tabs, activeKey, locale, onPress, badgeByKey}: Props) {
  return (
    <View style={styles.bar}>
      {tabs.map(tab => {
        const active = tab.key === activeKey;
        const label = tab.labels['en'];
        const badge = badgeByKey?.[tab.key] ?? 0;
        const showBadge = badge > 0;
        const badgeLabel = badge > 99 ? '99+' : String(badge);
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => onPress(tab.key)}
            activeOpacity={0.7}>
            {/* Active indicator dot at top */}
            <View style={[styles.indicator, active && styles.indicatorActive]} />
            <View style={styles.iconWrap}>
              <AppIcon
                name={tab.icon}
                size={24}
                color={active ? Colors.tabActive : Colors.tabInactive}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeLabel}</Text>
                </View>
              )}
            </View>
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
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: Spacing.xs,
  },
  item: {flex: 1, alignItems: 'center', paddingTop: 6, gap: 3},
  iconWrap: {position: 'relative'},
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
    lineHeight: 12,
  },
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