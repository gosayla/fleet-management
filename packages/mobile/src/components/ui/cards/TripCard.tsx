import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trip } from '@fleet/shared';
import {
  formatDateTime,
  Locale,
  tripStatusLabel,
  isRTL,
} from '../../../lib/i18n';
import { Colors, Spacing, Typography } from '../../../lib/theme';
import { AppIcon } from '../AppIcon';
import { TripLegBadge } from '../TripLegBadge';

interface Props {
  trip: Trip;
  locale: Locale;
  onPress?: () => void;
}

const STATUS_META: Record<string, { color: string; bg: string; icon: string }> =
  {
    SCHEDULED: {
      color: Colors.info,
      bg: Colors.infoLight,
      icon: 'clock-outline',
    },
    IN_PROGRESS: {
      color: Colors.success,
      bg: Colors.successLight,
      icon: 'truck-fast-outline',
    },
    COMPLETED: {
      color: Colors.textMuted,
      bg: Colors.borderLight,
      icon: 'check-circle-outline',
    },
    CANCELLED: {
      color: Colors.danger,
      bg: Colors.dangerLight,
      icon: 'close-circle-outline',
    },
  };

function TripCardComponent({ trip, locale, onPress }: Props) {
  const meta = STATUS_META[trip.status] ?? STATUS_META.SCHEDULED;
  const rtl = isRTL(locale);
  const cardDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const topDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const nameAlignStyle = rtl ? styles.textLeft : styles.textRight;
  const routeAlignStyle = rtl ? styles.textLeft : styles.textRight;
  const metaRowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const metaMainDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const chipsDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const chipDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const metaTextAlignStyle = rtl ? styles.textLeft : styles.textRight;
  const displayName =
    trip.name ||
    `${rtl ? trip.origin : trip.destination} ${!rtl ? '→' : '←'} ${
      rtl ? trip.destination : trip.origin
    }`;
  const driverName = trip.driver?.fullName ?? trip.driver?.user?.fullName ?? '';

  return (
    <TouchableOpacity
      style={[styles.card, cardDirectionStyle]}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
    >
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />
      <View style={styles.body}>
        <View style={[styles.top, topDirectionStyle]}>
          <Text style={[styles.name, nameAlignStyle]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <AppIcon name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.badgeText, { color: meta.color }]}>
              {tripStatusLabel(trip.status, locale)}
            </Text>
          </View>
        </View>
        {trip.name && (
          <Text style={[styles.route, routeAlignStyle]} numberOfLines={1}>
            {rtl ? trip.origin : trip.destination} {!rtl ? '→' : '←'}{' '}
            {rtl ? trip.destination : trip.origin}
          </Text>
        )}
        <View style={[styles.metaRow, metaRowDirectionStyle]}>
          <View style={[styles.metaMain, metaMainDirectionStyle]}>
            <AppIcon name="clock-outline" size={13} color={Colors.textMuted} />
            <Text style={[styles.metaText, metaTextAlignStyle]}>
              {formatDateTime(trip.scheduledStart, locale)}
            </Text>
          </View>
          <TripLegBadge leg={trip.leg} locale={locale} />
        </View>
        {(trip.driver || trip.vehicle) && (
          <View style={[styles.chips, chipsDirectionStyle]}>
            {driverName && (
              <View style={[styles.chip, chipDirectionStyle]}>
                <AppIcon
                  name="account-outline"
                  size={13}
                  color={Colors.textMuted}
                />
                <Text style={[styles.metaText, metaTextAlignStyle]}>
                  {driverName}
                </Text>
              </View>
            )}
            {trip.vehicle && (
              <View style={[styles.chip, chipDirectionStyle]}>
                <AppIcon
                  name="truck-outline"
                  size={13}
                  color={Colors.textMuted}
                />
                <Text style={[styles.metaText, metaTextAlignStyle]}>
                  {trip.vehicle.plateNumber ?? trip.vehicleId}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const TripCard = React.memo(TripCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accentBar: { width: 4 },
  body: { flex: 1, padding: Spacing.md, gap: 5 },
  row: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: {
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    fontWeight: '700' as const,
    flex: 1,
  },
  route: { fontSize: 12, color: Colors.textMuted },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    gap: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '600' as const },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  metaText: { fontSize: 12, color: Colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
