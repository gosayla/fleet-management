import React, {useEffect, useState} from 'react';
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
import {Colors, Radius, Spacing, Typography} from '../lib/theme';
import {TripCard} from '../components/ui/cards/TripCard';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
}

export function AdminTripsScreen({locale, onToggleLocale}: Props) {
  const i18n = t(locale);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  async function load() {
    setRefreshing(true);
    try {
      const data = await api.get<Trip[]>('/trips');
      setTrips(data);
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {load();}, []);

  const filters = [
    {key: 'ALL', label: locale === 'ar' ? 'الكل' : 'All'},
    {key: 'IN_PROGRESS', label: locale === 'ar' ? 'جارية' : 'Active'},
    {key: 'SCHEDULED', label: locale === 'ar' ? 'مجدولة' : 'Scheduled'},
    {key: 'COMPLETED', label: locale === 'ar' ? 'منتهية' : 'Done'},
  ];

  const visible = filter === 'ALL' ? trips : trips.filter(t => t.status === filter);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{locale === 'ar' ? 'جميع الرحلات' : 'All Trips'}</Text>
          <TouchableOpacity style={styles.langPill} onPress={onToggleLocale} activeOpacity={0.7}>
            <Text style={styles.langText}>{i18n.languageLabel}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>{`${trips.length} ${locale === 'ar' ? 'رحلة' : 'trips'}`}</Text>
      </View>

      {/* White curved panel */}
      <View style={styles.panel}>
        {/* Filter pills */}
        <View style={styles.filterRow}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={visible}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.primary} />}
          renderItem={({item}) => <TripCard trip={item} locale={locale} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>{locale === 'ar' ? 'لا توجد رحلات' : 'No trips'}</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {paddingBottom: 24},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  headerTitle: {fontSize: 22, fontWeight: '700' as const, color: '#fff', letterSpacing: 0.3},
  headerSub: {fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingHorizontal: Spacing.md, paddingBottom: 4},
  langPill: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  langText: {fontSize: 12, fontWeight: '600' as const, color: '#fff'},
  panel: {
    flex: 1, backgroundColor: Colors.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20, overflow: 'hidden',
  },
  filterRow: {
    flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  filterPill: {
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border,
  },
  filterPillActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  filterText: {...Typography.bodySm, color: Colors.textSecondary, fontWeight: '600'},
  filterTextActive: {color: Colors.white},
  list: {padding: Spacing.md, gap: Spacing.sm},
  emptyWrap: {alignItems: 'center', paddingTop: Spacing.xxl},
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyText: {...Typography.body, color: Colors.textMuted},
});
