import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Trip} from '@fleet/shared';
import {formatDateTime, Locale, tripStatusLabel} from '../../../lib/i18n';
import {Colors, Spacing, Typography} from '../../../lib/theme';
import {AppIcon} from '../AppIcon';

interface Props {
  trip: Trip & {name?: string};
  locale: Locale;
  onPress?: () => void;
}

const STATUS_META: Record<string, {color: string; bg: string; icon: string}> = {
  SCHEDULED:   {color: Colors.info,    bg: Colors.infoLight,    icon: 'clock-outline'},
  IN_PROGRESS: {color: Colors.success, bg: Colors.successLight, icon: 'truck-fast-outline'},
  COMPLETED:   {color: Colors.textMuted, bg: Colors.borderLight, icon: 'check-circle-outline'},
  CANCELLED:   {color: Colors.danger,  bg: Colors.dangerLight,  icon: 'close-circle-outline'},
};

export function TripCard({trip, locale, onPress}: Props) {
  const meta = STATUS_META[trip.status] ?? STATUS_META.SCHEDULED;
  const displayName = trip.name || `${trip.origin} → ${trip.destination}`;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={onPress ? 0.75 : 1} onPress={onPress}>
      <View style={[styles.accentBar, {backgroundColor: meta.color}]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <View style={[styles.badge, {backgroundColor: meta.bg}]}>
            <AppIcon name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.badgeText, {color: meta.color}]}>
              {tripStatusLabel(trip.status, locale)}
            </Text>
          </View>
        </View>
        {trip.name && (
          <Text style={styles.route} numberOfLines={1}>
            {trip.origin} → {trip.destination}
          </Text>
        )}
        <View style={styles.metaRow}>
          <AppIcon name="clock-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.metaText}>{formatDateTime(trip.scheduledStart, locale)}</Text>
        </View>
        {(trip.driver || trip.vehicle) && (
          <View style={styles.chips}>
            {trip.driver && (
              <View style={styles.chip}>
                <AppIcon name="account-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>
                  {(trip.driver as any).fullName ?? (trip.driver as any).user?.fullName ?? ''}
                </Text>
              </View>
            )}
            {trip.vehicle && (
              <View style={styles.chip}>
                <AppIcon name="truck-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>{trip.vehicle.plateNumber}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accentBar: {width: 4},
  body: {flex: 1, padding: Spacing.md, gap: 5},
  top: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8},
  name: {...Typography.bodyMd, color: Colors.textPrimary, fontWeight: '700' as const, flex: 1},
  route: {fontSize: 12, color: Colors.textMuted},
  badge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 3, gap: 3,
  },
  badgeText: {fontSize: 11, fontWeight: '600' as const},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  metaText: {fontSize: 12, color: Colors.textMuted},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {flexDirection: 'row', alignItems: 'center', gap: 3},
});