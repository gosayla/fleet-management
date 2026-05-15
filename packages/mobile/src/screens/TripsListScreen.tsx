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
  ActivityIndicator,
} from 'react-native';
import { api } from '../lib/api';
import { PaginatedResult, Trip, TripStatus } from '@fleet/shared';
import { Locale, t, isRTL } from '../lib/i18n';
import { Colors, Spacing, Typography } from '../lib/theme';
import { TripCard } from '../components/ui/cards/TripCard';

const SB_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;
const PAGE_SIZE = 20;

type Filter = 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'COMPLETED';

interface Props {
  onSelectTrip: (trip: Trip) => void;
  locale: Locale;
}

export function TripsListScreen({ onSelectTrip, locale }: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const apiStatus = useMemo<TripStatus | undefined>(() => {
    if (filter === 'ACTIVE') {
      return TripStatus.IN_PROGRESS;
    }
    if (filter === 'SCHEDULED') {
      return TripStatus.SCHEDULED;
    }
    if (filter === 'COMPLETED') {
      return TripStatus.COMPLETED;
    }
    return undefined;
  }, [filter]);

  const loadPage = useCallback(
    async (nextPage: number, replace = false) => {
      const statusQuery = apiStatus
        ? `&status=${encodeURIComponent(apiStatus)}`
        : '';
      const result = await api.get<PaginatedResult<Trip>>(
        `/trips?page=${nextPage}&pageSize=${PAGE_SIZE}${statusQuery}`
      );

      setTrips((prev) => (replace ? result.data : [...prev, ...result.data]));
      setPage(result.page);
      setTotal(result.total);
      setHasMore(result.page < result.totalPages);
    },
    [apiStatus]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setInitialLoading(true);
        await loadPage(1, true);
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadPage(1, true);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleEndReached() {
    if (initialLoading || loadingMore || refreshing || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      await loadPage(page + 1, false);
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = trips;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'ALL', label: i18n.filterAll },
    { key: 'ACTIVE', label: i18n.filterActive },
    { key: 'SCHEDULED', label: i18n.scheduledStat },
    { key: 'COMPLETED', label: i18n.filterDone },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ height: SB_HEIGHT }} />
        <View
          style={[
            styles.headerRow,
            { flexDirection: rtl ? 'row' : 'row-reverse' },
          ]}
        >
          <View>
            <Text style={styles.headerTitle}>{i18n.myTrips}</Text>
            <Text style={styles.headerSub}>
              {total} {i18n.tripsUnit}
            </Text>
          </View>
        </View>
        {/* Filter pills */}
        <View
          style={[
            styles.filterRow,
            { flexDirection: rtl ? 'row' : 'row-reverse' },
          ]}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, filter === f.key && styles.pillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  filter === f.key && styles.pillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        renderItem={({ item: trip }) => {
          const disabled =
            trip.status === 'COMPLETED' || trip.status === 'CANCELLED';
          return (
            <TouchableOpacity
              style={[styles.itemWrap, disabled && styles.cardDisabled]}
              onPress={() => !disabled && onSelectTrip(trip)}
              activeOpacity={disabled ? 1 : 0.8}
            >
              <TripCard trip={trip} locale={locale} />
              {!disabled && (
                <View
                  style={[
                    styles.tapHint,
                    { alignItems: rtl ? 'flex-end' : 'flex-start' },
                  ]}
                >
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { backgroundColor: Colors.primary, paddingBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pillActive: { backgroundColor: '#fff' },
  pillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  pillTextActive: { color: Colors.primary },
  list: { padding: Spacing.md, gap: Spacing.sm },
  itemWrap: { gap: 6 },
  cardDisabled: { opacity: 0.55 },
  tapHint: { alignItems: 'flex-end', paddingHorizontal: 6 },
  tapHintText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  footerLoader: { paddingVertical: Spacing.md },
  emptyWrap: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textMuted },
});
