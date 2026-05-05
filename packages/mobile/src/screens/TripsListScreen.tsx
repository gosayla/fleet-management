import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {api} from '../lib/api';
import {Trip} from '@fleet/shared';
import {formatDateTime, Locale, t, tripStatusLabel} from '../lib/i18n';

const statusColors: Record<string, string> = {
  SCHEDULED: '#6366f1',
  IN_PROGRESS: '#16a34a',
  COMPLETED: '#6b7280',
  CANCELLED: '#ef4444',
};

interface Props {
  onSelectTrip: (trip: Trip) => void;
  locale: Locale;
  onToggleLocale: () => void;
}

export function TripsListScreen({onSelectTrip, locale, onToggleLocale}: Props) {
  const i18n = t(locale);
  const isRTL = locale === 'ar';
  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const data = await api.get<Trip[]>('/trips');
      setTrips(data);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.heading, isRTL && styles.headingRtl]}>{i18n.myTrips}</Text>
        <TouchableOpacity style={styles.langBtn} onPress={onToggleLocale}>
          <Text style={styles.langText}>{i18n.languageLabel}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={trips}
        keyExtractor={t => t.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        contentContainerStyle={styles.list}
        renderItem={({item: trip}) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onSelectTrip(trip)}
            disabled={trip.status === 'COMPLETED' || trip.status === 'CANCELLED'}>
            <View style={styles.cardHeader}>
              <Text style={styles.route}>
                {trip.origin} → {trip.destination}
              </Text>
              <View
                style={[
                  styles.badge,
                  {backgroundColor: statusColors[trip.status] + '22'},
                ]}>
                <Text style={[styles.badgeText, {color: statusColors[trip.status]}]}>
                  {tripStatusLabel(trip.status, locale)}
                </Text>
              </View>
            </View>
            <Text style={styles.date}>
              {formatDateTime(trip.scheduledStart, locale)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{i18n.noTrips}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headingRtl: {
    textAlign: 'right',
  },
  langBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {padding: 16, gap: 12},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  route: {fontSize: 15, fontWeight: '600', color: '#111827', flex: 1},
  badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  badgeText: {fontSize: 11, fontWeight: '700'},
  date: {fontSize: 13, color: '#6b7280'},
  empty: {textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 15},
});
