import React, {useMemo, useState} from 'react';
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
import {TripCard} from '../components/ui/cards/TripCard';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

type Filter = 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'COMPLETED';

interface Props {
  onSelectTrip: (trip: Trip) => void;
  locale: Locale;
}

export function TripsListScreen({onSelectTrip, locale}: Props) {
  const i18n = t(locale);
  const [filter, setFilter] = useState<Filter>('ALL');
  const {data: raw, refreshing, refresh: load} = useCachedFetch(
    'driver:trips',
    () => api.get<Trip[]>('/trips'),
  );
  const trips: Trip[] = raw ?? [];

  const filtered = useMemo(() => {
    if (filter === 'ALL') return trips;
    return trips.filter(tr => tr.status === filter);
  }, [trips, filter]);

  const FILTERS: {key: Filter; label: string}[] = [
    {key: 'ALL',       label: i18n.filterAll},
    {key: 'ACTIVE',    label: i18n.filterActive},
    {key: 'SCHEDULED', label: i18n.scheduledStat},
    {key: 'COMPLETED', label: i18n.filterDone},
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>{i18n.myTrips}</Text>
            <Text style={styles.headerSub}>{filtered.length} {i18n.tripsUnit}</Text>
          </View>
        </View>
        {/* Filter pills */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, filter === f.key && styles.pillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}>
              <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({item: trip}) => {
          const disabled = trip.status === 'COMPLETED' || trip.status === 'CANCELLED';
          return (
            <TouchableOpacity
              style={[styles.itemWrap, disabled && styles.cardDisabled]}
              onPress={() => !disabled && onSelectTrip(trip)}
              activeOpacity={disabled ? 1 : 0.8}>
              <TripCard trip={trip} locale={locale} />
              {!disabled && (
                <View style={styles.tapHint}>
                  <Text style={styles.tapHintText}>{i18n.tapToOpen}</Text>
                </View>
              )}
            </TouchableOpacity>
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
  header: {backgroundColor: Colors.primary, paddingBottom: 12},
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: 10,
  },
  headerTitle: {fontSize: 22, fontWeight: '700' as const, color: '#fff'},
  headerSub: {fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2},
  filterRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    paddingTop: 10, paddingBottom: 4, gap: 8,
  },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pillActive: {backgroundColor: '#fff'},
  pillText: {fontSize: 12, fontWeight: '600' as const, color: 'rgba(255,255,255,0.85)'},
  pillTextActive: {color: Colors.primary},
  list: {padding: Spacing.md, gap: Spacing.sm},
  itemWrap: {gap: 6},
  cardDisabled: {opacity: 0.55},
  tapHint: {alignItems: 'flex-end', paddingHorizontal: 6},
  tapHintText: {...Typography.caption, color: Colors.primary, fontWeight: '600'},
  emptyWrap: {alignItems: 'center', paddingTop: Spacing.xxl},
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyText: {...Typography.body, color: Colors.textMuted},
});
