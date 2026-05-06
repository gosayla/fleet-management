import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {api} from '../lib/api';
import {Trip} from '@fleet/shared';
import {Locale, t} from '../lib/i18n';
import {Colors, Spacing, Typography} from '../lib/theme';
import {ScreenHeader} from '../components/ui/ScreenHeader';
import {TripCard} from '../components/ui/cards/TripCard';

interface Props {
  onSelectTrip: (trip: Trip) => void;
  locale: Locale;
  onToggleLocale: () => void;
}

export function TripsListScreen({onSelectTrip, locale, onToggleLocale}: Props) {
  const i18n = t(locale);
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScreenHeader
        locale={locale}
        title={i18n.myTrips}
        subtitle={`${trips.length} ${locale === 'ar' ? 'رحلة' : 'trips'}`}
        languageLabel={i18n.languageLabel}
        onToggleLocale={onToggleLocale}
      />

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
                  <Text style={styles.tapHintText}>{locale === 'ar' ? 'اضغط لفتح الرحلة' : 'Tap to open trip'}</Text>
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
  list: {padding: Spacing.md, gap: Spacing.sm},
  itemWrap: {gap: 6},
  cardDisabled: {opacity: 0.55},
  tapHint: {alignItems: 'flex-end', paddingHorizontal: 6},
  tapHintText: {...Typography.caption, color: Colors.primary, fontWeight: '600'},
  emptyWrap: {alignItems: 'center', paddingTop: Spacing.xxl},
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyText: {...Typography.body, color: Colors.textMuted},
});
