import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {api} from '../lib/api';
import {Locale} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {DriverCard, DriverCardData} from '../components/ui/cards/DriverCard';
import {VehicleCard, VehicleCardData} from '../components/ui/cards/VehicleCard';

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
  onSelectVehicle: (id: string) => void;
  onAddVehicle?: () => void;
  onAddDriver?: () => void;
}

type Segment = 'drivers' | 'vehicles';

const STATUS_BAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const PAGE_SIZE = 20;

export function AdminFleetScreen({locale, onToggleLocale, onSelectVehicle, onAddVehicle, onAddDriver}: Props) {
  const isAr = locale === 'ar';
  const [segment, setSegment] = useState<Segment>('vehicles');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drivers state (all loaded at once — no pagination from server)
  const [drivers, setDrivers] = useState<DriverCardData[]>([]);

  // Vehicles state — paginated
  const [vehicles, setVehicles] = useState<VehicleCardData[]>([]);
  const [vPage, setVPage] = useState(1);
  const [vTotal, setVTotal] = useState(0);
  const [vLoading, setVLoading] = useState(false);
  const [vHasMore, setVHasMore] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  // ── Drivers (single fetch) ───────────────────────────────────────────────
  async function loadDrivers(search?: string) {
    try {
      const params = new URLSearchParams();
      if (search?.trim()) params.append('search', search.trim());
      const qs = params.toString();
      const data = await api.get<DriverCardData[]>(`/drivers${qs ? `?${qs}` : ''}`);
      setDrivers(Array.isArray(data) ? data : []);
    } catch {}
  }

  // ── Vehicles (paginated) ─────────────────────────────────────────────────
  async function loadVehiclesPage(page: number, replace: boolean, search?: string) {
    if (vLoading) return;
    setVLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(PAGE_SIZE));
      if (search?.trim()) params.append('search', search.trim());
      const res = await api.get<any>(`/vehicles?${params.toString()}`);
      const items: VehicleCardData[] = Array.isArray(res) ? res : (res?.data ?? []);
      const total: number = res?.total ?? items.length;
      const totalPages: number = res?.totalPages ?? 1;
      setVTotal(total);
      setVehicles(prev => replace ? items : [...prev, ...items]);
      setVHasMore(page < totalPages);
      setVPage(page);
    } catch {}
    finally { setVLoading(false); }
  }

  const loadMoreVehicles = useCallback(() => {
    if (!vHasMore || vLoading) return;
    loadVehiclesPage(vPage + 1, false, searchQuery);
  }, [vHasMore, vLoading, vPage, searchQuery]);

  // ── Initial load & refresh ───────────────────────────────────────────────
  async function refresh() {
    setRefreshing(true);
    setVHasMore(true);
    await Promise.all([
      loadDrivers(searchQuery),
      loadVehiclesPage(1, true, searchQuery),
    ]);
    setRefreshing(false);
  }

  useEffect(() => { refresh(); }, []);

  // Debounced search on active tab
  useEffect(() => {
    const timer = setTimeout(() => {
      if (segment === 'drivers') {
        loadDrivers(searchQuery);
      } else {
        setVHasMore(true);
        loadVehiclesPage(1, true, searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, segment]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const driverLabel  = isAr ? 'السائقون' : 'Drivers';
  const vehicleLabel = isAr ? 'المركبات' : 'Vehicles';
  const countLabel   = segment === 'drivers'
    ? (isAr ? `${drivers.length} سائق` : `${drivers.length} drivers`)
    : (isAr ? `${vTotal} مركبة` : `${vTotal} vehicles`);

  const vehicleFooter = vLoading
    ? <ActivityIndicator color={Colors.primary} style={{padding: 16}} />
    : vHasMore
      ? null
      : vehicles.length > 0
        ? <Text style={styles.endText}>{isAr ? 'تم عرض الكل' : 'All loaded'}</Text>
        : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Teal header ── */}
      <View style={styles.header}>
        <View style={{height: STATUS_BAR_H}} />
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{isAr ? 'الأسطول' : 'Fleet'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (searchOpen && searchQuery.trim()) {
                  setSearchQuery('');
                }
                setSearchOpen(prev => !prev);
              }}>
              <AppIcon name="magnify" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (segment === 'drivers') {
                  onAddDriver?.();
                } else {
                  onAddVehicle?.();
                }
              }}>
              <AppIcon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        {searchOpen && (
          <View style={styles.searchWrap}>
            <AppIcon name="magnify" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={segment === 'drivers'
                ? (isAr ? 'ابحث في السائقين...' : 'Search drivers...')
                : (isAr ? 'ابحث في المركبات...' : 'Search vehicles...')}
              placeholderTextColor="rgba(255,255,255,0.75)"
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

      {/* ── White curved panel (overlaps header) ── */}
      <View style={styles.panel}>
        {/* Segment toggle inside panel */}
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segBtn, segment === 'drivers' && styles.segBtnActive]}
            onPress={() => setSegment('drivers')}
            activeOpacity={0.8}>
            <Text style={[styles.segText, segment === 'drivers' && styles.segTextActive]}>
              {driverLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, segment === 'vehicles' && styles.segBtnActive]}
            onPress={() => setSegment('vehicles')}
            activeOpacity={0.8}>
            <Text style={[styles.segText, segment === 'vehicles' && styles.segTextActive]}>
              {vehicleLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Count */}
        <Text style={styles.countText}>{countLabel}</Text>

        {/* ── Lists ── */}
        {segment === 'drivers' ? (
          <FlatList
            key="drivers"
            data={drivers}
            keyExtractor={d => d.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
            renderItem={({item}) => <DriverCard driver={item} locale={locale} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <AppIcon name="account-group-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyText}>{isAr ? 'لا يوجد سائقون' : 'No drivers'}</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            key="vehicles"
            data={vehicles}
            keyExtractor={v => v.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
            renderItem={({item}) => <VehicleCard vehicle={item} locale={locale} onPress={() => onSelectVehicle(item.id)} />}
            onEndReached={loadMoreVehicles}
            onEndReachedThreshold={0.3}
            ListFooterComponent={vehicleFooter}
            ListEmptyComponent={
              !vLoading ? (
                <View style={styles.empty}>
                  <AppIcon name="truck-outline" size={48} color={Colors.border} />
                  <Text style={styles.emptyText}>{isAr ? 'لا توجد مركبات' : 'No vehicles'}</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},

  // Teal header — shorter, just title row
  header: {paddingBottom: 24},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  headerTitle: {fontSize: 22, fontWeight: '700' as const, color: '#fff', letterSpacing: 0.3},
  headerActions: {flexDirection: 'row', gap: 4},
  iconBtn: {width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center'},
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: 6,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500' as const,
    paddingVertical: 0,
  },

  // White panel with top rounded corners — overlaps into the teal
  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,  // pull up to overlap header
    overflow: 'hidden',
  },

  // Segment toggle
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: 30,
    margin: Spacing.md,
    marginBottom: 8,
    padding: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 26,
    alignItems: 'center',
  },
  segBtnActive: {backgroundColor: Colors.primary},
  segText: {fontSize: 14, fontWeight: '600' as const, color: Colors.textMuted},
  segTextActive: {color: '#fff'},

  // Count label
  countText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
  },

  // List
  list: {paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl},

  endText: {textAlign: 'center', fontSize: 12, color: Colors.textMuted, paddingVertical: 16},
  empty: {alignItems: 'center', paddingTop: 64, gap: 12},
  emptyText: {fontSize: 15, color: Colors.textMuted},
});
