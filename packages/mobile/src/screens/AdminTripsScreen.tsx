import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { api } from '../lib/api';
import { PaginatedResult } from '@fleet/shared';
import { Locale, t, isRTL } from '../lib/i18n';
import { formatDateSmart } from '../lib/dates';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { TripCard } from '../components/ui/cards/TripCard';

const SB_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;
const PAGE_SIZE = 20;

export interface TripListItem {
  id: string;
  name?: string;
  leg?: string;
  origin: string;
  destination: string;
  status: string;
  tripType: string;
  clientName?: string;
  contractNumber?: string;
  scheduledStart: string;
  scheduledEnd: string;
  driver?: { fullName: string };
  vehicle?: { plateNumber: string };
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
  vehicle?: { plateNumber: string };
  driver?: { fullName: string };
  _count?: { trips: number };
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
  vehicle?: { plateNumber: string };
}

interface TripRowProps {
  item: TripListItem;
  locale: Locale;
  onSelectTrip?: (id: string) => void;
}

const FILTERS = [
  { key: 'ALL', ar: 'الكل', en: 'All', hi: 'सभी', bn: 'সব', ur: 'سب' },
  {
    key: 'IN_PROGRESS',
    ar: 'جارية',
    en: 'Active',
    hi: 'सक्रिय',
    bn: 'সক্রিয়',
    ur: 'جاری',
  },
  {
    key: 'SCHEDULED',
    ar: 'مجدولة',
    en: 'Scheduled',
    hi: 'निर्धारिت',
    bn: 'নির্ধারিত',
    ur: 'طے شدہ',
  },
  {
    key: 'COMPLETED',
    ar: 'منتهية',
    en: 'Done',
    hi: 'पूर्ण',
    bn: 'সম্পন্ন',
    ur: 'مکمل',
  },
] as const;

type TripFilterKey = (typeof FILTERS)[number]['key'];

const TripRow = React.memo(function TripRow({
  item,
  locale,
  onSelectTrip,
}: TripRowProps) {
  const handlePress = useCallback(() => {
    onSelectTrip?.(item.id);
  }, [item.id, onSelectTrip]);

  return <TripCard trip={item as any} locale={locale} onPress={handlePress} />;
});

export function AdminTripsScreen({
  locale,
  onSelectTrip,
  onAddTrip,
  onSelectContract,
  onAddContract,
  onSelectRental,
  onAddRental,
  segment: segmentProp,
  onSegmentChange,
}: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const textEndStyle = rtl ? styles.textLeft : styles.textRight;
  // ── Segment (controlled from parent to survive navigation) ────────────────
  const [segmentLocal, setSegmentLocal] = useState<HubSegment>(
    segmentProp ?? 'trips'
  );
  const segment = segmentProp ?? segmentLocal;
  function setSegment(s: HubSegment) {
    setSegmentLocal(s);
    onSegmentChange?.(s);
  }

  // ── Trips state ───────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<TripFilterKey>('ALL');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [tripsPage, setTripsPage] = useState(1);
  const [tripsHasMore, setTripsHasMore] = useState(true);
  const [tripsRefreshing, setTripsRefreshing] = useState(false);
  const [tripsLoadingMore, setTripsLoadingMore] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const tripsRequestIdRef = useRef(0);

  const fetchTrips = useCallback(
    async (_nextPage: number, _replace: boolean, isRefresh = false) => {
      const requestId = ++tripsRequestIdRef.current;

      isRefresh ? setTripsRefreshing(true) : setTripsLoading(true);
      setTripsLoadingMore(false);
      try {
        const res = await api.get<TripListItem[]>('/trips?scope=standalone');
        if (requestId !== tripsRequestIdRef.current) {
          return;
        }

        setTrips(res);
        setTripsPage(1);
        setTripsHasMore(false);
        setTripsError(null);
      } catch (error) {
        if (requestId !== tripsRequestIdRef.current) {
          return;
        }

        setTrips([]);
        setTripsPage(1);
        setTripsHasMore(false);
        setTripsError(
          error instanceof Error ? error.message : 'Failed to load trips'
        );
      } finally {
        if (requestId !== tripsRequestIdRef.current) {
          return;
        }

        setTripsRefreshing(false);
        setTripsLoading(false);
        setTripsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (segment !== 'trips') {
      return;
    }

    setTrips([]);
    setTripsPage(1);
    setTripsHasMore(false);

    const timer = setTimeout(() => {
      fetchTrips(1, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTrips, segment]);

  const visibleTrips = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

    return trips.filter((trip) => {
      const matchesFilter = filter === 'ALL' || trip.status === filter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        trip.name,
        trip.origin,
        trip.destination,
        trip.clientName,
        trip.contractNumber,
        trip.driver?.fullName,
        trip.vehicle?.plateNumber,
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
    });
  }, [filter, searchQuery, trips]);

  const renderTripItem = useCallback(
    ({ item }: { item: TripListItem }) => (
      <TripRow item={item} locale={locale} onSelectTrip={onSelectTrip} />
    ),
    [locale, onSelectTrip]
  );

  // ── Contracts state ───────────────────────────────────────────────────────
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [contractsRefreshing, setContractsRefreshing] = useState(false);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsLoadingMore, setContractsLoadingMore] = useState(false);
  const [contractsPage, setContractsPage] = useState(1);
  const [contractsTotal, setContractsTotal] = useState(0);
  const [contractsHasMore, setContractsHasMore] = useState(true);
  const [contractsSearchOpen, setContractsSearchOpen] = useState(false);
  const [contractsQuery, setContractsQuery] = useState('');

  const loadContracts = useCallback(
    async (nextPage = 1, replace = true, isRefresh = false) => {
      if (replace) {
        isRefresh ? setContractsRefreshing(true) : setContractsLoading(true);
      } else {
        setContractsLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: String(PAGE_SIZE),
        });
        if (contractsQuery.trim()) {
          params.set('search', contractsQuery.trim());
        }
        const data = await api.get<PaginatedResult<ContractItem>>(
          `/contracts?${params.toString()}`
        );
        setContracts((prev) => (replace ? data.data : [...prev, ...data.data]));
        setContractsPage(data.page);
        setContractsTotal(data.total);
        setContractsHasMore(data.page < data.totalPages);
      } catch {
      } finally {
        setContractsRefreshing(false);
        setContractsLoading(false);
        setContractsLoadingMore(false);
      }
    },
    [contractsQuery]
  );

  async function refreshContracts() {
    await loadContracts(1, true, true);
  }
  const visibleContracts = contracts;

  // ── Rentals state ─────────────────────────────────────────────────────────
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [rentalsRefreshing, setRentalsRefreshing] = useState(false);
  const [rentalsLoading, setRentalsLoading] = useState(false);
  const [rentalsLoadingMore, setRentalsLoadingMore] = useState(false);
  const [rentalsPage, setRentalsPage] = useState(1);
  const [rentalsTotal, setRentalsTotal] = useState(0);
  const [rentalsHasMore, setRentalsHasMore] = useState(true);
  const [rentalsSearchOpen, setRentalsSearchOpen] = useState(false);
  const [rentalsQuery, setRentalsQuery] = useState('');

  const loadRentals = useCallback(
    async (nextPage = 1, replace = true, isRefresh = false) => {
      if (replace) {
        isRefresh ? setRentalsRefreshing(true) : setRentalsLoading(true);
      } else {
        setRentalsLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: String(PAGE_SIZE),
        });
        if (rentalsQuery.trim()) {
          params.set('search', rentalsQuery.trim());
        }
        const data = await api.get<PaginatedResult<RentalItem>>(
          `/rentals?${params.toString()}`
        );
        setRentals((prev) => (replace ? data.data : [...prev, ...data.data]));
        setRentalsPage(data.page);
        setRentalsTotal(data.total);
        setRentalsHasMore(data.page < data.totalPages);
      } catch {
      } finally {
        setRentalsRefreshing(false);
        setRentalsLoading(false);
        setRentalsLoadingMore(false);
      }
    },
    [rentalsQuery]
  );

  async function refreshRentals() {
    await loadRentals(1, true, true);
  }
  const visibleRentals = rentals;

  // Load data when segment changes
  useEffect(() => {
    if (segment === 'contracts') {
      loadContracts(1, true);
    } else if (segment === 'rentals') {
      loadRentals(1, true);
    }
  }, [loadContracts, loadRentals, segment]);

  useEffect(() => {
    if (segment !== 'contracts') {
      return;
    }
    const timer = setTimeout(() => loadContracts(1, true), 300);
    return () => clearTimeout(timer);
  }, [loadContracts, segment]);

  useEffect(() => {
    if (segment !== 'rentals') {
      return;
    }
    const timer = setTimeout(() => loadRentals(1, true), 300);
    return () => clearTimeout(timer);
  }, [loadRentals, segment]);

  // ── Segment labels ────────────────────────────────────────────────────────
  const SEGMENTS: { key: HubSegment; label: string }[] = [
    { key: 'trips', label: i18n.segTrips },
    { key: 'contracts', label: i18n.segContracts },
    { key: 'rentals', label: i18n.segRentals },
  ];

  // ── Header title & count based on segment ─────────────────────────────────
  const headerTitle =
    segment === 'trips'
      ? i18n.trips
      : segment === 'contracts'
      ? i18n.contracts
      : i18n.rentals;
  const headerCount =
    segment === 'trips'
      ? `${visibleTrips.length} ${i18n.tripsUnit}`
      : segment === 'contracts'
      ? `${contractsTotal} ${i18n.contractsUnit}`
      : `${rentalsTotal} ${i18n.rentalsUnit}`;
  const onAdd =
    segment === 'trips'
      ? onAddTrip
      : segment === 'contracts'
      ? onAddContract
      : onAddRental;

  async function loadMoreTrips() {
    if (tripsLoading || tripsRefreshing || tripsLoadingMore || !tripsHasMore) {
      return;
    }
    await fetchTrips(tripsPage + 1, false);
  }

  async function loadMoreContracts() {
    if (
      contractsLoading ||
      contractsRefreshing ||
      contractsLoadingMore ||
      !contractsHasMore
    ) {
      return;
    }
    await loadContracts(contractsPage + 1, false);
  }

  async function loadMoreRentals() {
    if (
      rentalsLoading ||
      rentalsRefreshing ||
      rentalsLoadingMore ||
      !rentalsHasMore
    ) {
      return;
    }
    await loadRentals(rentalsPage + 1, false);
  }

  // ── Rental status helpers ─────────────────────────────────────────────────
  function rentalStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE':
        return {
          badgeStyle: styles.statusBadgeActive,
          textStyle: styles.statusBadgeTextActive,
        };
      case 'RETURNED':
        return {
          badgeStyle: styles.statusBadgeReturned,
          textStyle: styles.statusBadgeTextReturned,
        };
      case 'OVERDUE':
        return {
          badgeStyle: styles.statusBadgeOverdue,
          textStyle: styles.statusBadgeTextOverdue,
        };
      case 'CANCELLED':
        return {
          badgeStyle: styles.statusBadgeReturned,
          textStyle: styles.statusBadgeTextReturned,
        };
      default:
        return {
          badgeStyle: styles.statusBadgeReturned,
          textStyle: styles.statusBadgeTextReturned,
        };
    }
  }
  function rentalStatusLabel(status: string) {
    switch (status) {
      case 'ACTIVE':
        return i18n.rentalStatusActive;
      case 'RETURNED':
        return i18n.rentalStatusReturned;
      case 'OVERDUE':
        return i18n.rentalStatusOverdue;
      case 'CANCELLED':
        return i18n.rentalStatusCancelled;
      default:
        return status;
    }
  }

  function fmtDate(iso?: string) {
    return formatDateSmart(iso, locale);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={styles.statusBarSpacer} />
        <View style={[styles.headerRow, rowDirectionStyle]}>
          <Text style={[styles.headerTitle, textEndStyle]}>{headerTitle}</Text>
          <View style={[styles.headerActions, rowDirectionStyle]}>
            {segment === 'trips' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  if (searchOpen && searchQuery) {
                    setSearchQuery('');
                  }
                  setSearchOpen((p) => !p);
                }}
              >
                <AppIcon name="magnify" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            {segment === 'contracts' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  if (contractsSearchOpen && contractsQuery) {
                    setContractsQuery('');
                  }
                  setContractsSearchOpen((p) => !p);
                }}
              >
                <AppIcon name="magnify" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            {segment === 'rentals' && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  if (rentalsSearchOpen && rentalsQuery) {
                    setRentalsQuery('');
                  }
                  setRentalsSearchOpen((p) => !p);
                }}
              >
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
        <View style={[styles.segmentRow, rowDirectionStyle]}>
          {SEGMENTS.map((seg) => (
            <TouchableOpacity
              key={seg.key}
              style={[
                styles.segBtn,
                segment === seg.key && styles.segBtnActive,
              ]}
              onPress={() => setSegment(seg.key)}
            >
              <Text
                style={[
                  styles.segLabel,
                  segment === seg.key && styles.segLabelActive,
                ]}
              >
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
                <AppIcon
                  name="close-circle"
                  size={18}
                  color="rgba(255,255,255,0.9)"
                />
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
                <AppIcon
                  name="close-circle"
                  size={18}
                  color="rgba(255,255,255,0.9)"
                />
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
                <AppIcon
                  name="close-circle"
                  size={18}
                  color="rgba(255,255,255,0.9)"
                />
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
            <View style={[styles.filterRow, rowDirectionStyle]}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterPill,
                    filter === f.key && styles.filterPillActive,
                  ]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === f.key && styles.filterTextActive,
                    ]}
                  >
                    {f[locale]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <FlatList
              data={visibleTrips}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={Platform.OS === 'android'}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              updateCellsBatchingPeriod={50}
              extraData={`${filter}:${searchQuery}:${tripsLoading}:${
                tripsError ?? ''
              }`}
              refreshControl={
                <RefreshControl
                  refreshing={tripsRefreshing}
                  onRefresh={() => fetchTrips(1, true, true)}
                  tintColor={Colors.primary}
                />
              }
              onEndReached={loadMoreTrips}
              onEndReachedThreshold={0.35}
              renderItem={renderTripItem}
              ListFooterComponent={
                tripsLoadingMore ? (
                  <ActivityIndicator
                    color={Colors.primary}
                    style={styles.footerLoader}
                  />
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  {tripsLoading ? (
                    <ActivityIndicator
                      color={Colors.primary}
                      size="large"
                      style={styles.emptyLoader}
                    />
                  ) : (
                    <>
                      <AppIcon
                        name="calendar-outline"
                        size={48}
                        color={Colors.border}
                      />
                      <Text style={styles.emptyText}>
                        {tripsError ?? i18n.noTripsFound}
                      </Text>
                    </>
                  )}
                </View>
              }
            />
          </>
        )}

        {/* ── CONTRACTS ── */}
        {segment === 'contracts' && (
          <FlatList
            data={visibleContracts}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={contractsRefreshing}
                onRefresh={refreshContracts}
                tintColor={Colors.primary}
              />
            }
            onEndReached={loadMoreContracts}
            onEndReachedThreshold={0.35}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => onSelectContract?.(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.cardHeader, rowDirectionStyle]}>
                  <View style={styles.flexOne}>
                    <Text style={[styles.cardTitle, textEndStyle]}>
                      {item.clientName}
                    </Text>
                    {item.contractNumber ? (
                      <Text style={[styles.cardSub, textEndStyle]}>
                        #{item.contractNumber}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.tripsCount}>
                    <Text style={styles.tripsCountNum}>
                      {item._count?.trips ?? 0}
                    </Text>
                    <Text style={styles.tripsCountLabel}>{i18n.tripsUnit}</Text>
                  </View>
                </View>
                <View style={[styles.routeRow, rowDirectionStyle]}>
                  <AppIcon
                    name="map-marker-outline"
                    size={14}
                    color={Colors.primary}
                  />
                  <Text
                    style={[styles.routeText, textEndStyle]}
                    numberOfLines={1}
                  >
                    {rtl ? item.origin : item.destination} {!rtl ? '→' : '←'}{' '}
                    {rtl ? item.destination : item.origin}
                  </Text>
                </View>
                <View style={[styles.cardFooter, rowDirectionStyle]}>
                  <Text style={[styles.cardMeta, textEndStyle]}>
                    {!rtl
                      ? fmtDate(item.contractStart)
                      : fmtDate(item.contractEnd)}{' '}
                    –{' '}
                    {!rtl
                      ? fmtDate(item.contractEnd)
                      : fmtDate(item.contractStart)}
                  </Text>
                  {item.vehicle && (
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateBadgeText}>
                        {item.vehicle.plateNumber}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppIcon
                  name="file-document-outline"
                  size={48}
                  color={Colors.border}
                />
                <Text style={styles.emptyText}>{i18n.noContracts}</Text>
              </View>
            }
            ListFooterComponent={
              contractsLoadingMore ? (
                <ActivityIndicator
                  color={Colors.primary}
                  style={styles.footerLoader}
                />
              ) : null
            }
          />
        )}

        {/* ── RENTALS ── */}
        {segment === 'rentals' && (
          <FlatList
            data={visibleRentals}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={rentalsRefreshing}
                onRefresh={refreshRentals}
                tintColor={Colors.primary}
              />
            }
            onEndReached={loadMoreRentals}
            onEndReachedThreshold={0.35}
            renderItem={({ item }) => {
              const sc = rentalStatusColor(item.status);
              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => onSelectRental?.(item.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.cardHeader, rowDirectionStyle]}>
                    <View style={styles.flexOne}>
                      <Text style={[styles.cardTitle, textEndStyle]}>
                        {item.clientName}
                      </Text>
                      {item.vehicle && (
                        <Text style={[styles.cardSub, textEndStyle]}>
                          {item.vehicle.plateNumber}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, sc.badgeStyle]}>
                      <Text style={[styles.statusBadgeText, sc.textStyle]}>
                        {rentalStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.cardFooter, rowDirectionStyle]}>
                    <Text style={[styles.cardMeta, textEndStyle]}>
                      {fmtDate(item.rentalStart)} – {fmtDate(item.rentalEnd)}
                    </Text>
                    {item.dailyRateSar != null && (
                      <Text style={styles.cardRate}>
                        {item.dailyRateSar} {i18n.sarUnit}/
                        {locale === 'ar' ? 'يوم' : 'day'}
                      </Text>
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
            ListFooterComponent={
              rentalsLoadingMore ? (
                <ActivityIndicator
                  color={Colors.primary}
                  style={styles.footerLoader}
                />
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  flexOne: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { paddingBottom: 16 },
  statusBarSpacer: { height: SB_HEIGHT },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    paddingHorizontal: Spacing.md,
    paddingBottom: 4,
  },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: 6,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 3,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  segBtnActive: { backgroundColor: '#fff' },
  segLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  segLabelActive: { color: Colors.primary },
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
  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -8,
    overflow: 'hidden',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  filterTextActive: { color: '#fff' },
  list: { padding: Spacing.md, gap: 10, paddingBottom: 24 },
  footerLoader: { paddingVertical: Spacing.md },
  emptyLoader: { paddingVertical: Spacing.md },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },
  // Cards (contracts / rentals)
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  cardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  routeText: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: { fontSize: 12, color: Colors.textMuted },
  cardRate: { fontSize: 12, color: Colors.primary, fontWeight: '600' as const },
  plateBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  plateBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  tripsCount: { alignItems: 'center', minWidth: 36 },
  tripsCountNum: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  tripsCountLabel: { fontSize: 10, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' as const },
  statusBadgeActive: { backgroundColor: '#E8F5E9' },
  statusBadgeReturned: { backgroundColor: Colors.borderLight },
  statusBadgeOverdue: { backgroundColor: '#FFEBEE' },
  statusBadgeTextActive: { color: '#2E7D32' },
  statusBadgeTextReturned: { color: Colors.textMuted },
  statusBadgeTextOverdue: { color: '#C62828' },
});
