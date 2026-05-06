import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Trip} from '@fleet/shared';
import {formatDateTime, Locale, tripStatusLabel} from '../../../lib/i18n';
import {Colors, Spacing, Typography} from '../../../lib/theme';
import {AppIcon} from '../AppIcon';

interface Props {
  trip: Trip;
  locale: Locale;
}

const STATUS_META: Record<string, {color: string; bg: string; icon: string}> = {
  SCHEDULED: {color: Colors.info, bg: Colors.infoLight, icon: 'clock-outline'},
  IN_PROGRESS: {color: Colors.success, bg: Colors.successLight, icon: 'truck-fast-outline'},
  COMPLETED: {color: Colors.textMuted, bg: Colors.borderLight, icon: 'check-circle-outline'},
  CANCELLED: {color: Colors.danger, bg: Colors.dangerLight, icon: 'close-circle-outline'},
};

export function TripCard({trip, locale}: Props) {
  const meta = STATUS_META[trip.status] ?? STATUS_META.SCHEDULED;
  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, {backgroundColor: meta.color}]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.route} numberOfLines={1}>
            {trip.origin} → {trip.destination}
          </Text>
          <View style={[styles.badge, {backgroundColor: meta.bg}]}>
            <AppIcon name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.badgeText, {color: meta.color}]}>
              {tripStatusLabel(trip.status, locale)}
            </Text>
          </View>
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accentBar: {width: 4},
  body: {flex: 1, padding: Spacing.md, gap: 6},
  top: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8},
  route: {...Typography.bodyMd, color: Colors.textPrimary, fontWeight: '600' as const, flex: 1},
  badge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 3, gap: 3,
  },
  badgeText: {fontSize: 11, fontWeight: '700' as const},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 5},
  chips: {flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap'},
  chip: {flexDirection: 'row', alignItems: 'center', gap: 4},
  metaText: {fontSize: 12, color: Colors.textSecondary},
});