import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { api } from '../lib/api';
import { Locale, t, isRTL } from '../lib/i18n';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { VehicleCardData } from '../components/ui/cards/VehicleCard';
import { formatDateSmart } from '../lib/dates';

const SB_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;
const PAGE_SIZE = 20;

type Segment = 'vehicles' | 'fuel' | 'maintenance';

interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

interface FuelLogItem {
  id: string;
  liters: number;
  costSar: number;
  odometer: number;
  station?: string;
  filledAt: string;
  vehicle?: { plateNumber: string; make: string; model: string };
  driver?: { fullName: string };
}

interface MaintenanceItem {
  id: string;
  type: string;
  status: string;
  description: string;
  scheduledDate: string;
  vehicle?: { plateNumber: string; make: string; model: string };
}

interface Props {
  locale: Locale;
}

function maintenanceTypeLabel(type: string, i18n: ReturnType<typeof t>) {
  switch (type) {
    case 'SCHEDULED':
      return i18n.maintenanceTypeScheduled;
    case 'UNSCHEDULED':
      return i18n.maintenanceTypeUnscheduled;
    case 'EMERGENCY':
      return i18n.maintenanceTypeEmergency;
    default:
      return type;
  }
}

function maintenanceStatusLabel(status: string, i18n: ReturnType<typeof t>) {
  switch (status) {
    case 'PENDING':
      return i18n.maintenancePending;
    case 'IN_PROGRESS':
      return i18n.maintenanceInProgress;
    case 'COMPLETED':
      return i18n.maintenanceCompleted;
    case 'CANCELLED':
      return i18n.maintenanceCancelled;
    default:
      return status;
  }
}

function maintenanceStatusColors(status: string) {
  switch (status) {
    case 'PENDING':
      return { bg: '#FFF8E1', color: '#F57F17' };
    case 'IN_PROGRESS':
      return { bg: '#E3F2FD', color: '#1565C0' };
    case 'COMPLETED':
      return { bg: '#E8F5E9', color: '#2E7D32' };
    case 'CANCELLED':
      return { bg: Colors.borderLight, color: Colors.textMuted };
    default:
      return { bg: Colors.borderLight, color: Colors.textMuted };
  }
}

function vehicleStatusLabel(status: string, i18n: ReturnType<typeof t>) {
  switch (status) {
    case 'ACTIVE':
      return i18n.statusInUse;
    case 'MAINTENANCE':
      return i18n.statusMaintenance;
    case 'INACTIVE':
      return i18n.statusInactive;
    case 'RETIRED':
      return i18n.statusRetired;
    default:
      return status;
  }
}

function vehicleStatusColors(status: string) {
  switch (status) {
    case 'ACTIVE':
      return { bg: Colors.primary, color: '#fff' };
    case 'MAINTENANCE':
      return { bg: Colors.warningLight, color: Colors.warning ?? '#F57C00' };
    case 'INACTIVE':
      return { bg: Colors.borderLight, color: Colors.textMuted };
    case 'RETIRED':
      return { bg: Colors.dangerLight, color: Colors.danger };
    default:
      return { bg: Colors.borderLight, color: Colors.textMuted };
  }
}

export function DriverFleetScreen({ locale }: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const textStartStyle = rtl ? styles.textRight : styles.textLeft;
  const textEndStyle = rtl ? styles.textLeft : styles.textRight;
  const filterListAlignStyle = rtl
    ? styles.alignSelfEnd
    : styles.alignSelfStart;
  const [segment, setSegment] = useState<Segment>('vehicles');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [vehicles, setVehicles] = useState<VehicleCardData[]>([]);
  const [vehiclesPage, setVehiclesPage] = useState(1);
  const [vehiclesTotal, setVehiclesTotal] = useState(0);
  const [vehiclesHasMore, setVehiclesHasMore] = useState(true);
  const [vehiclesRefreshing, setVehiclesRefreshing] = useState(false);
  const [vehiclesLoadingMore, setVehiclesLoadingMore] = useState(false);

  const [fuel, setFuel] = useState<FuelLogItem[]>([]);
  const [fuelPage, setFuelPage] = useState(1);
  const [fuelTotal, setFuelTotal] = useState(0);
  const [fuelHasMore, setFuelHasMore] = useState(true);
  const [fuelRefreshing, setFuelRefreshing] = useState(false);
  const [fuelLoadingMore, setFuelLoadingMore] = useState(false);

  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [maintenanceTotal, setMaintenanceTotal] = useState(0);
  const [maintenanceHasMore, setMaintenanceHasMore] = useState(true);
  const [maintenanceRefreshing, setMaintenanceRefreshing] = useState(false);
  const [maintenanceLoadingMore, setMaintenanceLoadingMore] = useState(false);

  const filters = useMemo(
    () => [
      { key: 'vehicles' as const, label: i18n.vehiclesSegment },
      { key: 'fuel' as const, label: i18n.fuelScreenTitle },
      { key: 'maintenance' as const, label: i18n.maintenanceScreenTitle },
    ],
    [i18n]
  );

  const searchPlaceholder =
    segment === 'vehicles'
      ? `${i18n.vehiclesSegment}...`
      : segment === 'fuel'
      ? i18n.searchFuel
      : i18n.searchMaintenance;

  const headerCount =
    segment === 'vehicles'
      ? `${vehiclesTotal} ${i18n.vehiclesUnit}`
      : segment === 'fuel'
      ? `${fuelTotal} ${i18n.fuelLogUnit}`
      : `${maintenanceTotal} ${i18n.maintenanceUnit}`;

  const loadVehicles = useCallback(
    async (nextPage: number, replace: boolean, isRefresh = false) => {
      if (replace) {
        setVehiclesRefreshing(isRefresh);
      } else {
        setVehiclesLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(PAGE_SIZE),
        });
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }
        const res = await api.get<PagedResponse<VehicleCardData>>(
          `/vehicles?${params.toString()}`
        );
        setVehicles((prev) => (replace ? res.data : [...prev, ...res.data]));
        setVehiclesPage(res.page);
        setVehiclesTotal(res.total);
        setVehiclesHasMore(res.page < res.totalPages);
      } catch {
      } finally {
        setVehiclesRefreshing(false);
        setVehiclesLoadingMore(false);
      }
    },
    [searchQuery]
  );

  const loadFuel = useCallback(
    async (nextPage: number, replace: boolean, isRefresh = false) => {
      if (replace) {
        setFuelRefreshing(isRefresh);
      } else {
        setFuelLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: String(PAGE_SIZE),
        });
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }
        const res = await api.get<PagedResponse<FuelLogItem>>(
          `/fuel?${params.toString()}`
        );
        setFuel((prev) => (replace ? res.data : [...prev, ...res.data]));
        setFuelPage(res.page);
        setFuelTotal(res.total);
        setFuelHasMore(res.page < res.totalPages);
      } catch {
      } finally {
        setFuelRefreshing(false);
        setFuelLoadingMore(false);
      }
    },
    [searchQuery]
  );

  const loadMaintenance = useCallback(
    async (nextPage: number, replace: boolean, isRefresh = false) => {
      if (replace) {
        setMaintenanceRefreshing(isRefresh);
      } else {
        setMaintenanceLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: String(PAGE_SIZE),
        });
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }
        const res = await api.get<PagedResponse<MaintenanceItem>>(
          `/maintenance?${params.toString()}`
        );
        setMaintenance((prev) => (replace ? res.data : [...prev, ...res.data]));
        setMaintenancePage(res.page);
        setMaintenanceTotal(res.total);
        setMaintenanceHasMore(res.page < res.totalPages);
      } catch {
      } finally {
        setMaintenanceRefreshing(false);
        setMaintenanceLoadingMore(false);
      }
    },
    [searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (segment === 'vehicles') {
        loadVehicles(1, true);
      } else if (segment === 'fuel') {
        loadFuel(1, true);
      } else {
        loadMaintenance(1, true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [segment, searchQuery, loadVehicles, loadFuel, loadMaintenance]);

  async function refresh() {
    if (segment === 'vehicles') {
      await loadVehicles(1, true, true);
      return;
    }
    if (segment === 'fuel') {
      await loadFuel(1, true, true);
      return;
    }
    await loadMaintenance(1, true, true);
  }

  async function loadMore() {
    if (segment === 'vehicles') {
      if (vehiclesRefreshing || vehiclesLoadingMore || !vehiclesHasMore) {
        return;
      }
      await loadVehicles(vehiclesPage + 1, false);
      return;
    }
    if (segment === 'fuel') {
      if (fuelRefreshing || fuelLoadingMore || !fuelHasMore) {
        return;
      }
      await loadFuel(fuelPage + 1, false);
      return;
    }
    if (
      maintenanceRefreshing ||
      maintenanceLoadingMore ||
      !maintenanceHasMore
    ) {
      return;
    }
    await loadMaintenance(maintenancePage + 1, false);
  }

  const refreshing =
    segment === 'vehicles'
      ? vehiclesRefreshing
      : segment === 'fuel'
      ? fuelRefreshing
      : maintenanceRefreshing;

  const listFooter =
    segment === 'vehicles' ? (
      vehiclesLoadingMore ? (
        <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
      ) : null
    ) : segment === 'fuel' ? (
      fuelLoadingMore ? (
        <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
      ) : null
    ) : maintenanceLoadingMore ? (
      <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
    ) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <View style={styles.statusBarSpacer} />
        <View style={[styles.headerRow, rowDirectionStyle]}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>{i18n.fleet}</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (searchOpen && searchQuery.trim()) {
                setSearchQuery('');
              }
              setSearchOpen((value) => !value);
            }}
          >
            <AppIcon name="magnify" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>{headerCount}</Text>

        {searchOpen && (
          <View style={[styles.searchWrap, rowDirectionStyle]}>
            <AppIcon name="magnify" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={[styles.searchInput, textStartStyle]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={searchPlaceholder}
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
      </View>

      <View style={styles.panel}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          style={[styles.filterList, filterListAlignStyle]}
          contentContainerStyle={[styles.filterRow, rowDirectionStyle]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                segment === item.key && styles.filterPillActive,
                styles.filterPillCompact,
              ]}
              onPress={() => setSegment(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  segment === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {segment === 'vehicles' && (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id}
            style={styles.dataList}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={Colors.primary}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.35}
            renderItem={({ item }) => {
              const badge = vehicleStatusColors(item.status);
              const statusBadgeStyle = { backgroundColor: badge.bg };
              const statusBadgeTextStyle = { color: badge.color };
              return (
                <View style={styles.card}>
                  <View style={[styles.cardHeader, rowDirectionStyle]}>
                    <View style={styles.cardPlateWrap}>
                      <Text style={[styles.cardPlate, textEndStyle]}>
                        {item.plateNumber}
                      </Text>
                      <Text style={[styles.cardSub, textEndStyle]}>
                        {item.make} {item.model}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, statusBadgeStyle]}>
                      <Text
                        style={[styles.statusBadgeText, statusBadgeTextStyle]}
                      >
                        {vehicleStatusLabel(item.status, i18n)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.metaRow, rowDirectionStyle]}>
                    <View style={styles.metaItem}>
                      <AppIcon
                        name="car-outline"
                        size={14}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.metaText}>{item.type}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <AppIcon
                        name="speedometer"
                        size={14}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.metaText}>
                        {Math.round(item.mileage ?? 0)} km
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppIcon
                  name="truck-outline"
                  size={48}
                  color={Colors.borderLight}
                />
                <Text style={styles.emptyText}>{i18n.noVehicleAssigned}</Text>
              </View>
            }
            ListFooterComponent={listFooter}
          />
        )}

        {segment === 'fuel' && (
          <FlatList
            data={fuel}
            keyExtractor={(item) => item.id}
            style={styles.dataList}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={Colors.primary}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.35}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={[styles.cardHeader, rowDirectionStyle]}>
                  <View style={styles.cardPlateWrap}>
                    <Text style={[styles.cardPlate, textEndStyle]}>
                      {item.vehicle?.plateNumber ?? '—'}
                    </Text>
                    <Text style={[styles.cardSub, textEndStyle]}>
                      {item.vehicle
                        ? `${item.vehicle.make} ${item.vehicle.model}`
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricPillText}>{item.liters} L</Text>
                  </View>
                </View>
                <View style={[styles.metricsRow, rowDirectionStyle]}>
                  <View style={styles.metricChip}>
                    <Text style={styles.metricText}>
                      {Math.round(item.costSar)} SAR
                    </Text>
                  </View>
                  <View style={styles.metricChip}>
                    <Text style={styles.metricText}>
                      {Math.round(item.odometer)} km
                    </Text>
                  </View>
                </View>
                <View style={[styles.metaRow, rowDirectionStyle]}>
                  <View style={styles.metaItem}>
                    <AppIcon
                      name="calendar"
                      size={14}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.metaText}>
                      {formatDateSmart(item.filledAt, locale)}
                    </Text>
                  </View>
                  {!!item.station && (
                    <View style={styles.metaItem}>
                      <AppIcon
                        name="map-marker-outline"
                        size={14}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.metaText}>{item.station}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppIcon
                  name="gas-station-off-outline"
                  size={48}
                  color={Colors.borderLight}
                />
                <Text style={styles.emptyText}>{i18n.noFuelLogs}</Text>
              </View>
            }
            ListFooterComponent={listFooter}
          />
        )}

        {segment === 'maintenance' && (
          <FlatList
            data={maintenance}
            keyExtractor={(item) => item.id}
            style={styles.dataList}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={Colors.primary}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.35}
            renderItem={({ item }) => {
              const badge = maintenanceStatusColors(item.status);
              const statusBadgeStyle = { backgroundColor: badge.bg };
              const statusBadgeTextStyle = { color: badge.color };
              return (
                <View style={styles.card}>
                  <View style={[styles.cardHeader, rowDirectionStyle]}>
                    <View style={styles.cardPlateWrap}>
                      <Text style={[styles.cardPlate, textEndStyle]}>
                        {item.vehicle?.plateNumber ?? '—'}
                      </Text>
                      <Text style={[styles.cardSub, textEndStyle]}>
                        {item.vehicle
                          ? `${item.vehicle.make} ${item.vehicle.model}`
                          : '—'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, statusBadgeStyle]}>
                      <Text
                        style={[styles.statusBadgeText, statusBadgeTextStyle]}
                      >
                        {maintenanceStatusLabel(item.status, i18n)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.cardDesc, textEndStyle]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                  <View style={[styles.cardFooter, rowDirectionStyle]}>
                    <View style={styles.typePill}>
                      <Text style={styles.typePillText}>
                        {maintenanceTypeLabel(item.type, i18n)}
                      </Text>
                    </View>
                    <Text style={styles.cardDate}>
                      {formatDateSmart(item.scheduledDate, locale)}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppIcon name="wrench" size={48} color={Colors.borderLight} />
                <Text style={styles.emptyText}>{i18n.noMaintenance}</Text>
              </View>
            }
            ListFooterComponent={listFooter}
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
  alignSelfStart: { alignSelf: 'flex-start' },
  alignSelfEnd: { alignSelf: 'flex-end' },
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg },
  statusBarSpacer: { height: SB_HEIGHT },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  headerSpacer: { width: 36, height: 36 },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 12 },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    justifyContent: 'flex-start',
    width: '100%',
  },
  filterList: { flexGrow: 0 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterPillCompact: { height: 32 },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  dataList: { flex: 1 },
  list: { padding: Spacing.md, paddingBottom: Spacing.lg },
  footerLoader: { paddingVertical: Spacing.md },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 12,
  },
  cardPlateWrap: { flex: 1 },
  cardPlate: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  metricsRow: { gap: 8, marginTop: 12, flexWrap: 'wrap' },
  metricPill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metricPillText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  metricChip: {
    backgroundColor: Colors.bg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  metaRow: { gap: 14, marginTop: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: Colors.textMuted },
  cardDesc: { fontSize: 14, color: Colors.textPrimary, marginTop: 10 },
  cardFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  typePill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typePillText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  cardDate: { fontSize: 12, color: Colors.textMuted },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 72,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
