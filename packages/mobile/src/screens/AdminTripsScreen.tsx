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
import {Locale, t} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {TripCard} from '../components/ui/cards/TripCard';
import {useCachedFetch} from '../hooks/useCachedFetch';

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
  onSelectTrip?: (id: string) => void;
  onAddTrip?: () => void;
  onSelectContract?: (id: string) => void;
  onAddContract?: () => void;
  onSelectRental?: (id: string) => void;
  onAddRental?: () => void;
  segment?: HubSegment;
  onSegmentChange?: (s: HubSegment) => void;
}

type HubSegment = 'trips' | 'contracts' | 'rentals';

// ── Contract list types ───────────────────────────────────────────────────────
interface ContractItem {
  id: string;
  contractNumber?: string;
  clientName: string;
  origin: string;
  destination: string;
  contractStart: string;
  contractEnd: string;
  departureTime: string;
  vehicle?: {plateNumber: string};
  driver?: {fullName: string};
  _count?: {trips: number};
}

// ── Rental list types ─────────────────────────────────────────────────────────
interface RentalItem {
  id: string;
  contractNumber?: string;
  clientName: string;
  rentalStart: string;
  rentalEnd: string;
  dailyRateSar?: number;
  status: string;
  vehicle?: {plateNumber: string};
}

const FILTERS = [
  {key: 'ALL',         ar: 'الكل',    en: 'All',       hi: 'सभी',       bn: 'সব',        ur: 'سب'},
  {key: 'IN_PROGRESS', ar: 'جارية',   en: 'Active',    hi: 'सक्रिय',     bn: 'সক্রিয়',     ur: 'جاری'},
  {key: 'SCHEDULED',   ar: 'مجدولة',  en: 'Scheduled', hi: 'निर्धारिت',   bn: 'নির্ধারিত',   ur: 'طے شدہ'},
  {key: 'COMPLETED',   ar: 'منتهية',  en: 'Done',      hi: 'पूर्ण',      bn: 'সম্পন্ন',    ur: 'مکمل'},
] as const;

export function AdminTripsScreen({locale, onSelectTrip, onAddTrip, onSelectContract, onAddContract, onSelectRental, onAddRental, segment: segmentProp, onSegmentChange}: Props) {
  const i18n = t(locale);

  // ── Segment (controlled from parent to survive navigation) ────────────────
  const [segmentLocal, setSegmentLocal] = useState<HubSegment>(segmentProp ?? 'trips');
  const segment = segmentProp ?? segmentLocal;
  function setSegment(s: HubSegment) { setSegmentLocal(s); onSegmentChange?.(s); }

  // ── Trips state ───────────────────────────────────────────────────────────
  const [filter, setFilter] = useState('ALL');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const {data: raw, refreshing, refresh: refreshAll} = useCachedFetch(
    'admin:trips',
    () => api.get<TripListItem[]>('/trips'),
  );
  const [trips, setTrips] = useState<TripListItem[]>([]);

  useEffect(() => {
    if (raw != null) setTrips(Array.isArray(raw) ? raw : []);
  }, [raw]);

  async function load(search?: string) {
    if (search?.trim()) {
      try {
        const data = await api.get<TripListItem[]>(`/trips?search=${encodeURIComponent(search.trim())}`);
        setTrips(Array.isArray(data) ? data : []);
      } catch {}
    } else {
      refreshAll();
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => load(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const visible = filter === 'ALL' ? trips : trips.filter(t => t.status === filter);

  const countByStatus = useCallback((key: string) => {
    return key === 'ALL' ? trips.length : trips.filter(t => t.status === key).length;
  }, [trips]);

  // ── Contracts state ───────────────────────────────────────────────────────
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [contractsRefreshing, setContractsRefreshing] = useState(false);
  const [contractsSearchOpen, setContractsSearchOpen] = useState(false);
  const [contractsQuery, setContractsQuery] = useState('');

  async function loadContracts() {
    try {
      const data = await api.get<ContractItem[]>('/contracts');
      setContracts(Array.isArray(data) ? data : []);
    } catch {}
  }

  async function refreshContracts() {
    setContractsRefreshing(true);
    await loadContracts();
    setContractsRefreshing(false);
  }

  const visibleContracts = contractsQuery.trim()
    ? contracts.filter(c =>
        c.clientName.toLowerCase().includes(contractsQuery.toLowerCase()) ||
        (c.contractNumber ?? '').toLowerCase().includes(contractsQuery.toLowerCase()) ||
        c.origin.toLowerCase().includes(contractsQuery.toLowerCase()) ||
        c.destination.toLowerCase().includes(contractsQuery.toLowerCase())
      )
    : contracts;

  // ── Rentals state ─────────────────────────────────────────────────────────
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [rentalsRefreshing, setRentalsRefreshing] = useState(false);
  const [rentalsSearchOpen, setRentalsSearchOpen] = useState(false);
  const [rentalsQuery, setRentalsQuery] = useState('');

  async function loadRentals() {
    try {
      const data = await api.get<RentalItem[]>('/rentals');
      setRentals(Array.isArray(data) ? data : []);
    } catch {}
  }

  async function refreshRentals() {
    setRentalsRefreshing(true);
    await loadRentals();
    setRentalsRefreshing(false);
  }

  const visibleRentals = rentalsQuery.trim()
    ? rentals.filter(r =>
        r.clientName.toLowerCase().includes(rentalsQuery.toLowerCase()) ||
        (r.contractNumber ?? '').toLowerCase().includes(rentalsQuery.toLowerCase()) ||
        (r.vehicle?.plateNumber ?? '').toLowerCase().includes(rentalsQuery.toLowerCase())
      )
    : rentals;

  // Load data when segment changes
  useEffect(() => {
    if (segment === 'contracts') loadContracts();
    else if (segment === 'rentals') loadRentals();
  }, [segment]);

  // ── Segment labels ────────────────────────────────────────────────────────
  const SEGMENTS: {key: HubSegment; label: string}[] = [
    {key: 'trips', label: i18n.segTrips},
    {key: 'contracts', label: i18n.segContracts},
    {key: 'rentals', label: i18n.segRentals},
  ];

  // ── Header title & count based on segment ─────────────────────────────────
  const headerTitle = segment === 'trips' ? i18n.trips
    : segment === 'contracts' ? i18n.contracts
    : i18n.rentals;
  const headerCount = segment === 'trips' ? `${trips.length} ${i18n.tripsUnit}`
    : segment === 'contracts' ? `${contracts.length} ${i18n.contractsUnit}`
    : `${rentals.length} ${i18n.rentalsUnit}`;
  const onAdd = segment === 'trips' ? onAddTrip
    : segment === 'contracts' ? onAddContract
    : onAddRental;

  // ── Rental status helpers ─────────────────────────────────────────────────
  function rentalStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE': return {bg: '#E8F5E9', color: '#2E7D32'};
      case 'RETURNED': return {bg: Colors.borderLight, color: Colors.textMuted};
      case 'OVERDUE': return {bg: '#FFEBEE', color: '#C62828'};
      case 'CANCELLED': return {bg: Colors.borderLight, color: Colors.textMuted};
      default: return {bg: Colors.borderLight, color: Colors.textMuted};
    }
  }
  function rentalStatusLabel(status: string) {
    switch (status) {
      case 'ACTIVE': return i18n.rentalStatusActive;
      case 'RETURNED': return i18n.rentalStatusReturned;
      case 'OVERDUE': return i18n.rentalStatusOverdue;
      case 'CANCELLED': return i18n.rentalStatusCancelled;
      default: return status;
    }
  }

  function fmtDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: '2-digit'});
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <View style={styles.headerActions}>
            {segment === 'trips' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  if (searchOpen && searchQuery) setSearchQuery('');
                  setSearchOpen(p => !p);
                }}>
                <AppIcon name="magnify" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            {segment === 'contracts' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  if (contractsSearchOpen && contractsQuery) setContractsQuery('');
                  setContractsSearchOpen(p => !p);
                }}>
                <AppIcon name="magnify" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            {segment === 'rentals' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  if (rentalsSearchOpen && rentalsQuery) setRentalsQuery('');
                  setRentalsSearchOpen(p => !p);
                }}>
                <AppIcon name="magnify" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={onAdd}>
              <AppIcon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSub}>{headerCount}</Text>

        {/* Segment control */}
        <View style={styles.segmentRow}>
          {SEGMENTS.map(seg => (
            <TouchableOpacity
              key={seg.key}
              style={[styles.segBtn, segment === seg.key && styles.segBtnActive]}
              onPress={() => setSegment(seg.key)}>
              <Text style={[styles.segLabel, segment === seg.key && styles.segLabelActive]}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {segment === 'trips' && searchOpen && (
          <View style={styles.searchWrap}>
            <AppIcon name="magnify" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={i18n.searchTrips}
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
        {segment === 'contracts' && contractsSearchOpen && (
          <View style={styles.searchWrap}>
            <AppIcon name="magnify" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={styles.searchInput}
              value={contractsQuery}
              onChangeText={setContractsQuery}
              placeholder={i18n.searchContracts}
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!contractsQuery && (
              <TouchableOpacity onPress={() => setContractsQuery('')}>
                <AppIcon name="close-circle" size={18} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            )}
          </View>
        )}
        {segment === 'rentals' && rentalsSearchOpen && (
          <View style={styles.searchWrap}>
            <AppIcon name="magnify" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={styles.searchInput}
              value={rentalsQuery}
              onChangeText={setRentalsQuery}
              placeholder={i18n.searchRentals}
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!rentalsQuery && (
              <TouchableOpacity onPress={() => setRentalsQuery('')}>
                <AppIcon name="close-circle" size={18} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* White curved panel */}
      <View style={styles.panel}>
        {/* ── TRIPS ── */}
        {segment === 'trips' && (
          <>
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
                  onPress={() => setFilter(f.key)}>
                  <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                    {f[locale]}
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
                <TripCard trip={item as any} locale={locale} onPress={() => onSelectTrip?.(item.id)} />
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <AppIcon name="calendar-outline" size={48} color={Colors.border} />
                  <Text style={styles.emptyText}>{i18n.noTripsFound}</Text>
                </View>
              }
            />
          </>
        )}

        {/* ── CONTRACTS ── */}
        {segment === 'contracts' && (
          <FlatList
            data={visibleContracts}
            keyExtractor={c => c.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={contractsRefreshing} onRefresh={refreshContracts} tintColor={Colors.primary} />}
            renderItem={({item}) => (
              <TouchableOpacity style={styles.card} onPress={() => onSelectContract?.(item.id)} activeOpacity={0.8}>
                <View style={styles.cardHeader}>
                  <View style={{flex: 1}}>
                    <Text style={styles.cardTitle}>{item.clientName}</Text>
                    {item.contractNumber ? (
                      <Text style={styles.cardSub}>#{item.contractNumber}</Text>
                    ) : null}
                  </View>
                  <View style={styles.tripsCount}>
                    <Text style={styles.tripsCountNum}>{item._count?.trips ?? 0}</Text>
                    <Text style={styles.tripsCountLabel}>{i18n.tripsUnit}</Text>
                  </View>
                </View>
                <View style={styles.routeRow}>
                  <AppIcon name="map-marker-outline" size={14} color={Colors.primary} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.origin} → {item.destination}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta}>{fmtDate(item.contractStart)} – {fmtDate(item.contractEnd)}</Text>
                  {item.vehicle && (
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateBadgeText}>{item.vehicle.plateNumber}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppIcon name="file-document-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyText}>{i18n.noContracts}</Text>
              </View>
            }
          />
        )}

        {/* ── RENTALS ── */}
        {segment === 'rentals' && (
          <FlatList
            data={visibleRentals}
            keyExtractor={r => r.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={rentalsRefreshing} onRefresh={refreshRentals} tintColor={Colors.primary} />}
            renderItem={({item}) => {
              const sc = rentalStatusColor(item.status);
              return (
                <TouchableOpacity style={styles.card} onPress={() => onSelectRental?.(item.id)} activeOpacity={0.8}>
                  <View style={styles.cardHeader}>
                    <View style={{flex: 1}}>
                      <Text style={styles.cardTitle}>{item.clientName}</Text>
                      {item.vehicle && (
                        <Text style={styles.cardSub}>{item.vehicle.plateNumber}</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, {backgroundColor: sc.bg}]}>
                      <Text style={[styles.statusBadgeText, {color: sc.color}]}>
                        {rentalStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardMeta}>{fmtDate(item.rentalStart)} – {fmtDate(item.rentalEnd)}</Text>
                    {item.dailyRateSar != null && (
                      <Text style={styles.cardRate}>{item.dailyRateSar} {i18n.sarUnit}/{locale === 'ar' ? 'يوم' : 'day'}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppIcon name="key-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyText}>{i18n.noRentals}</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {paddingBottom: 16},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  headerTitle: {fontSize: 22, fontWeight: '700' as const, color: '#fff', letterSpacing: 0.3},
  headerSub: {fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingHorizontal: Spacing.md, paddingBottom: 4},
  headerActions: {flexDirection: 'row', gap: 4},
  iconBtn: {width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center'},
  segmentRow: {
    flexDirection: 'row', marginHorizontal: Spacing.md, marginTop: 6, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 3,
  },
  segBtn: {flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center'},
  segBtnActive: {backgroundColor: '#fff'},
  segLabel: {fontSize: 12, fontWeight: '600' as const, color: 'rgba(255,255,255,0.8)'},
  segLabelActive: {color: Colors.primary},
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
    marginTop: -8, overflow: 'hidden',
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
  list: {padding: Spacing.md, gap: 10, paddingBottom: 24},
  emptyWrap: {alignItems: 'center', paddingTop: 60, gap: 12},
  emptyText: {fontSize: 15, color: Colors.textMuted},
  // Cards (contracts / rentals)
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6},
  cardTitle: {fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary},
  cardSub: {fontSize: 12, color: Colors.textMuted, marginTop: 2},
  routeRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6},
  routeText: {fontSize: 13, color: Colors.textMuted, flex: 1},
  cardFooter: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  cardMeta: {fontSize: 12, color: Colors.textMuted},
  cardRate: {fontSize: 12, color: Colors.primary, fontWeight: '600' as const},
  plateBadge: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  plateBadgeText: {fontSize: 11, color: Colors.primary, fontWeight: '700' as const},
  tripsCount: {alignItems: 'center', minWidth: 36},
  tripsCountNum: {fontSize: 18, fontWeight: '700' as const, color: Colors.primary},
  tripsCountLabel: {fontSize: 10, color: Colors.textMuted},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8},
  statusBadgeText: {fontSize: 11, fontWeight: '700' as const},
});

