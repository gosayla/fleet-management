import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import {api} from '../lib/api';
import {Locale} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {TripCard} from '../components/ui/cards/TripCard';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export interface TripListItem {
  id: string;
  name?: string;
  origin: string;
  destination: string;
  status: string;
  tripType: string;
  scheduledStart: string;
  scheduledEnd: string;
  driver?: {fullName: string};
  vehicle?: {plateNumber: string};
}

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
  onSelectTrip?: (id: string) => void;
  onAddTrip?: () => void;
}

const FILTERS = [
  {key: 'ALL',         en: 'All',       ar: 'الكل'},
  {key: 'IN_PROGRESS', en: 'Active',    ar: 'جارية'},
  {key: 'SCHEDULED',   en: 'Scheduled', ar: 'مجدولة'},
  {key: 'COMPLETED',   en: 'Done',      ar: 'منتهية'},
];

export function AdminTripsScreen({locale, onToggleLocale, onSelectTrip, onAddTrip}: Props) {
  const isAr = locale === 'ar';
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  async function load(search?: string) {
    setRefreshing(true);
    try {
      const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await api.get<TripListItem[]>(`/trips${qs}`);
      setTrips(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {load();}, []);

  useEffect(() => {
    const timer = setTimeout(() => load(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const visible = filter === 'ALL' ? trips : trips.filter(t => t.status === filter);

  const countByStatus = useCallback((key: string) => {
    return key === 'ALL' ? trips.length : trips.filter(t => t.status === key).length;
  }, [trips]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{isAr ? 'الرحلات' : 'Trips'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (searchOpen && searchQuery) setSearchQuery('');
                setSearchOpen(p => !p);
              }}>
              <AppIcon name="magnify" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={onAddTrip}>
              <AppIcon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSub}>
          {`${trips.length} ${isAr ? 'رحلة' : 'trips'}`}
        </Text>
        {searchOpen && (
          <View style={styles.searchWrap}>
            <AppIcon name="magnify" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={isAr ? 'ابحث في الرحلات...' : 'Search trips...'}
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <AppIcon name="close-circle" size={18} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* White curved panel */}
      <View style={styles.panel}>
        {/* Filter pills */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {isAr ? f.ar : f.en}
                {` (${countByStatus(f.key)})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={visible}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(searchQuery)} tintColor={Colors.primary} />}
          renderItem={({item}) => (
            <TripCard
              trip={item as any}
              locale={locale}
              onPress={() => onSelectTrip?.(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <AppIcon name="calendar-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>{isAr ? 'لا توجد رحلات' : 'No trips'}</Text>
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
  headerActions: {flexDirection: 'row', gap: 4},
  iconBtn: {width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center'},
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginTop: 6,
    paddingHorizontal: 12, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', gap: 8,
  },
  searchInput: {flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' as const, paddingVertical: 0},
  panel: {
    flex: 1, backgroundColor: Colors.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20, overflow: 'hidden',
  },
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  filterPill: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.borderLight,
  },
  filterPillActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  filterText: {fontSize: 12, color: Colors.textMuted, fontWeight: '600' as const},
  filterTextActive: {color: '#fff'},
  list: {padding: Spacing.md, gap: 10},
  emptyWrap: {alignItems: 'center', paddingTop: 60, gap: 12},
  emptyText: {fontSize: 15, color: Colors.textMuted},
});

