import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Alert } from '../lib/alert';

const SB_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;
const PAGE_SIZE = 20;

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

interface Props {
  locale: Locale;
  onBack: () => void;
  onAddPress: () => void;
}

function fmtDate(value?: string) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export function AdminFuelScreen({ locale, onBack, onAddPress }: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const [all, setAll] = useState<FuelLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(
    async (nextPage = 1, replace = true, isRefresh = false) => {
      if (replace) {
        if (isRefresh) {
          setRefreshing(true);
        }
      } else {
        setLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: String(PAGE_SIZE),
        });
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }
        const data = await api.get<PaginatedResult<FuelLogItem>>(
          `/fuel?${params.toString()}`
        );
        setAll((prev) => (replace ? data.data : [...prev, ...data.data]));
        setPage(data.page);
        setTotal(data.total);
        setHasMore(data.page < data.totalPages);
      } catch {
      } finally {
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [searchQuery]
  );

  async function refresh() {
    await load(1, true, true);
  }

  useEffect(() => {
    const timer = setTimeout(() => load(1, true), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const items = useMemo(() => all, [all]);

  async function loadMore() {
    if (loadingMore || refreshing || !hasMore) {
      return;
    }
    await load(page + 1, false);
  }

  function confirmDelete(id: string) {
    Alert.alert(i18n.deleteLabel, i18n.deleteFuelConfirm, [
      { text: i18n.cancel, style: 'cancel' },
      {
        text: i18n.deleteLabel,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/fuel/${id}`);
            setAll((current) => current.filter((entry) => entry.id !== id));
          } catch {
            Alert.alert(i18n.error, i18n.failedToLoadFuel);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <View style={{ height: SB_HEIGHT }} />
        <View
          style={[
            styles.headerRow,
            { flexDirection: rtl ? 'row' : 'row-reverse' },
          ]}
        >
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <AppIcon
              name={rtl ? 'arrow-right' : 'arrow-left'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.fuelScreenTitle}</Text>
          <View
            style={[
              styles.headerActions,
              { flexDirection: rtl ? 'row' : 'row-reverse' },
            ]}
          >
            <TouchableOpacity style={styles.iconBtn} onPress={onAddPress}>
              <AppIcon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if (searchOpen && searchQuery) {
                  setSearchQuery('');
                }
                setSearchOpen((value) => !value);
              }}
            >
              <AppIcon name="magnify" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSub}>
          {total} {i18n.fuelLogUnit}
        </Text>

        {searchOpen && (
          <View
            style={[
              styles.searchWrap,
              { flexDirection: rtl ? 'row' : 'row-reverse' },
            ]}
          >
            <AppIcon name="magnify" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={[
                styles.searchInput,
                { textAlign: rtl ? 'right' : 'left' },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={i18n.searchFuel}
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
          data={items}
          keyExtractor={(item) => item.id}
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
              <View
                style={[
                  styles.cardHeader,
                  { flexDirection: rtl ? 'row' : 'row-reverse' },
                ]}
              >
                <View style={styles.cardPlateWrap}>
                  <Text
                    style={[
                      styles.cardPlate,
                      { textAlign: !rtl ? 'right' : 'left' },
                    ]}
                  >
                    {item.vehicle?.plateNumber ?? '—'}
                  </Text>
                  <Text
                    style={[
                      styles.cardSub,
                      { textAlign: !rtl ? 'right' : 'left' },
                    ]}
                  >
                    {item.vehicle
                      ? `${item.vehicle.make} ${item.vehicle.model}`
                      : '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(item.id)}
                  activeOpacity={0.8}
                >
                  <AppIcon
                    name="trash-can-outline"
                    size={18}
                    color={Colors.danger}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.metricsRow,
                  { flexDirection: rtl ? 'row' : 'row-reverse' },
                ]}
              >
                <MetricChip icon="gas-station" label={`${item.liters} L`} />
                <MetricChip
                  icon="cash"
                  label={`${Math.round(item.costSar)} SAR`}
                />
                <MetricChip
                  icon="counter"
                  label={`${Math.round(item.odometer)} km`}
                />
              </View>

              <View
                style={[
                  styles.metaRow,
                  { flexDirection: rtl ? 'row' : 'row-reverse' },
                ]}
              >
                <View
                  style={[
                    styles.metaItem,
                    { flexDirection: rtl ? 'row' : 'row-reverse' },
                  ]}
                >
                  <AppIcon name="calendar" size={14} color={Colors.textMuted} />
                  <Text
                    style={[
                      styles.metaText,
                      { textAlign: !rtl ? 'right' : 'left' },
                    ]}
                  >
                    {fmtDate(item.filledAt)}
                  </Text>
                </View>
                {!!item.driver?.fullName && (
                  <View
                    style={[
                      styles.metaItem,
                      { flexDirection: rtl ? 'row' : 'row-reverse' },
                    ]}
                  >
                    <AppIcon
                      name="account-outline"
                      size={14}
                      color={Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.metaText,
                        { textAlign: !rtl ? 'right' : 'left' },
                      ]}
                    >
                      {item.driver.fullName}
                    </Text>
                  </View>
                )}
              </View>

              {!!item.station && (
                <Text
                  style={[
                    styles.stationText,
                    { textAlign: !rtl ? 'right' : 'left' },
                  ]}
                >
                  {item.station}
                </Text>
              )}
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
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={Colors.primary}
                style={styles.footerLoader}
              />
            ) : null
          }
        />
      </View>
    </View>
  );
}

function MetricChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metricChip}>
      <AppIcon name={icon} size={14} color={Colors.primary} />
      <Text style={styles.metricText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerActions: { flexDirection: 'row' },
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
  list: { padding: Spacing.lg, paddingBottom: 28 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardPlateWrap: { flex: 1 },
  cardPlate: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: Colors.textMuted },
  stationText: { fontSize: 13, color: Colors.textPrimary, marginTop: 10 },
  footerLoader: { paddingVertical: Spacing.md },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 72,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  rowReverse: { flexDirection: 'row-reverse' },
});
