import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import {api} from '../lib/api';
import {Trip} from '@fleet/shared';
import {Locale, t} from '../lib/i18n';
import {useCachedFetch} from '../hooks/useCachedFetch';
import {Colors, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {TripCard} from '../components/ui/cards/TripCard';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface Props {
  onSelectTrip: (trip: Trip) => void;
  locale: Locale;
  onNotificationsPress?: () => void;
  unreadNotifications?: number;
}

export function TripsListScreen({onSelectTrip, locale, onNotificationsPress, unreadNotifications = 0}: Props) {
  const i18n = t(locale);
  const {data: raw, refreshing, refresh: load} = useCachedFetch(
    'driver:trips',
    () => api.get<Trip[]>('/trips'),
  );
  const trips: Trip[] = raw ?? [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{i18n.myTrips}</Text>
            <Text style={styles.headerSub}>{trips.length} {i18n.tripsUnit}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8} onPress={onNotificationsPress}>
              <AppIcon name={unreadNotifications > 0 ? 'bell-badge-outline' : 'bell-outline'} size={20} color="#fff" />
              {unreadNotifications > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotifications > 99 ? '99+' : String(unreadNotifications)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={trips}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({item: trip}) => {
          const disabled = trip.status === 'COMPLETED' || trip.status === 'CANCELLED';
          return (
            <View style={styles.itemWrap}>
              <TouchableOpacity
                style={disabled ? styles.cardDisabled : undefined}
                onPress={() => onSelectTrip(trip)}
                disabled={disabled}
                activeOpacity={0.8}>
                <TripCard trip={trip} locale={locale} />
              </TouchableOpacity>
              {!disabled && (
                <View style={styles.tapHint}>
                  <Text style={styles.tapHintText}>{i18n.tapToOpen}</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyText}>{i18n.noTrips}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  header: {backgroundColor: Colors.primary, paddingBottom: 20},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: 10,
  },
  headerTitle: {fontSize: 22, fontWeight: '700' as const, color: '#fff'},
  headerSub: {fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 10},
  bellBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
    backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  bellBadgeText: {color: '#fff', fontSize: 9, fontWeight: '700' as const, lineHeight: 12},
  list: {padding: Spacing.md, gap: Spacing.sm},
  itemWrap: {gap: 6},
  cardDisabled: {opacity: 0.55},
  tapHint: {alignItems: 'flex-end', paddingHorizontal: 6},
  tapHintText: {...Typography.caption, color: Colors.primary, fontWeight: '600'},
  emptyWrap: {alignItems: 'center', paddingTop: Spacing.xxl},
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyText: {...Typography.body, color: Colors.textMuted},
});
