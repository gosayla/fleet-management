import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import {api} from '../lib/api';
import {useAuth} from '../context/AuthContext';
import {Locale, t, tripStatusLabel} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {useCachedFetch} from '../hooks/useCachedFetch';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface TripItem {
  id: string;
  origin: string;
  destination: string;
  status: string;
  scheduledStart: string;
  distanceKm?: number;
  vehicle?: {id: string; plateNumber: string; make: string; model: string};
}

interface Props {
  locale: Locale;

  onNotificationsPress?: () => void;
  unreadNotifications?: number;
  onSelectTrip?: (tripId: string) => void;
  onStartTrip?: (trip: TripItem) => void;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: Colors.info,
  IN_PROGRESS: Colors.success,
  COMPLETED: Colors.textMuted,
  CANCELLED: Colors.danger,
};

const STATUS_BG: Record<string, string> = {
  SCHEDULED: Colors.infoLight ?? '#e8f4fd',
  IN_PROGRESS: Colors.successLight ?? '#e8f7f0',
  COMPLETED: Colors.borderLight,
  CANCELLED: Colors.dangerLight ?? '#fdecea',
};

const STATUS_LABELS: Record<string, {ar: string; en: string}> = {
  SCHEDULED:   {ar: 'مجدولة',  en: 'Scheduled'},
  IN_PROGRESS: {ar: 'جارية',   en: 'In Progress'},
  COMPLETED:   {ar: 'مكتملة',  en: 'Completed'},
  CANCELLED:   {ar: 'ملغاة',   en: 'Cancelled'},
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}) +
    ' ' +
    d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})
  );
}

function isToday(iso: string) {
  const now = new Date();
  const d = new Date(iso);
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function DriverDashboardScreen({
  locale,
  onNotificationsPress,
  unreadNotifications = 0,
  onSelectTrip,
  onStartTrip,
}: Props) {
  const {user} = useAuth();
  const i18n = t(locale);
  const {data: raw, refreshing, refresh: load} = useCachedFetch(
    'driver:trips',
    () => api.get<TripItem[]>('/trips'),
  );
  const trips: TripItem[] = raw ?? [];

  const activeTrip = trips.find(t => t.status === 'IN_PROGRESS');
  const todayTrips = trips.filter(t => t.status === 'SCHEDULED' && isToday(t.scheduledStart));
  const upcomingTrips = trips
    .filter(t => t.status === 'SCHEDULED' && !isToday(t.scheduledStart))
    .slice(0, 5);
  const completedCount = trips.filter(t => t.status === 'COMPLETED').length;
  const scheduledCount = trips.filter(t => t.status === 'SCHEDULED').length;

  const greeting = `${i18n.hello}, ${user?.fullName ?? i18n.driverSection}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.headerSub}>
              {i18n.driverDashboard}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.8}
              onPress={onNotificationsPress}>
              <AppIcon
                name={unreadNotifications > 0 ? 'bell-badge-outline' : 'bell-outline'}
                size={20}
                color="#fff"
              />
              {unreadNotifications > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotifications > 99 ? '99+' : String(unreadNotifications)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            value={completedCount}
            label={i18n.completedStat}
            accent={Colors.success}
            icon="check-circle-outline"
          />
          <StatCard
            value={scheduledCount}
            label={i18n.scheduledStat}
            accent={Colors.info}
            icon="clock-outline"
          />
          <StatCard
            value={activeTrip ? 1 : 0}
            label={i18n.activeStat}
            accent={activeTrip ? Colors.warning ?? '#f59e0b' : Colors.borderLight}
            icon="truck-fast-outline"
          />
        </View>

        {/* Active trip banner */}
        {activeTrip && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => onStartTrip?.(activeTrip)}
            activeOpacity={0.85}>
            <View style={styles.activeBannerIcon}>
              <AppIcon name="truck-fast-outline" size={20} color="#fff" />
            </View>
            <View style={styles.activeBannerInfo}>
              <Text style={styles.activeBannerTitle}>
                {i18n.activeTripBanner}
              </Text>
              <Text style={styles.activeBannerRoute} numberOfLines={1}>
                {activeTrip.origin} → {activeTrip.destination}
              </Text>
            </View>
            <AppIcon name="chevron-right" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Today's trips */}
        <Text style={styles.sectionTitle}>
          {i18n.todaysTrips}
          {todayTrips.length > 0 && (
            <Text style={styles.sectionCount}> ({todayTrips.length})</Text>
          )}
        </Text>
        {todayTrips.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppIcon name="calendar-check-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {i18n.noTripsToday}
            </Text>
          </View>
        ) : (
          todayTrips.map(trip => (
            <TripRow
              key={trip.id}
              trip={trip}
              locale={locale}
              onPress={() => onSelectTrip?.(trip.id)}
            />
          ))
        )}

        {/* Upcoming trips */}
        {upcomingTrips.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>
              {i18n.upcomingTrips}
            </Text>
            {upcomingTrips.map(trip => (
              <TripRow
                key={trip.id}
                trip={trip}
                locale={locale}
                onPress={() => onSelectTrip?.(trip.id)}
              />
            ))}
          </>
        )}

        {trips.length === 0 && !refreshing && (
          <View style={styles.emptyBox}>
            <AppIcon name="map-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {i18n.noAssignedTrips}
            </Text>
          </View>
        )}

        <View style={{height: 24}} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({value, label, accent, icon}: {
  value: number; label: string; accent: string; icon: string;
}) {
  return (
    <View style={[styles.statCard, {borderTopColor: accent}]}>
      <AppIcon name={icon} size={18} color={accent} />
      <Text style={[styles.statValue, {color: accent}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TripRow({trip, locale, onPress}: {trip: TripItem; locale: Locale; onPress: () => void}) {
  const color = STATUS_COLORS[trip.status] ?? Colors.textMuted;
  const bg = STATUS_BG[trip.status] ?? Colors.borderLight;
  const statusLabel = tripStatusLabel(trip.status, locale);

  return (
    <TouchableOpacity style={styles.tripRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.tripDot, {backgroundColor: color}]} />
      <View style={styles.tripInfo}>
        <Text style={styles.tripRoute} numberOfLines={1}>
          {trip.origin} → {trip.destination}
        </Text>
        <Text style={styles.tripTime}>{fmtDateTime(trip.scheduledStart)}</Text>
        {trip.vehicle && (
          <Text style={styles.tripVehicle}>
            {trip.vehicle.plateNumber} · {trip.vehicle.make} {trip.vehicle.model}
          </Text>
        )}
      </View>
      <View style={[styles.statusPill, {backgroundColor: bg}]}>
        <Text style={[styles.statusText, {color}]}>{statusLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},

  header: {backgroundColor: Colors.primary, paddingBottom: 24},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: 10,
  },
  greeting: {fontSize: 18, fontWeight: '700' as const, color: '#fff'},
  headerSub: {fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 10},
  bellBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
    backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  bellBadgeText: {color: '#fff', fontSize: 9, fontWeight: '700' as const, lineHeight: 12},

  scroll: {padding: Spacing.md, gap: 12},

  statsRow: {flexDirection: 'row', gap: 10},
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    borderTopWidth: 3,
    paddingVertical: 14, alignItems: 'center', gap: 4,
  },
  statValue: {fontSize: 22, fontWeight: '800' as const, color: Colors.textPrimary},
  statLabel: {fontSize: 11, color: Colors.textMuted, fontWeight: '500' as const, textAlign: 'center'},

  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.success,
    borderRadius: 16, padding: 14,
  },
  activeBannerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  activeBannerInfo: {flex: 1},
  activeBannerTitle: {fontSize: 13, fontWeight: '700' as const, color: '#fff'},
  activeBannerRoute: {fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2},

  sectionTitle: {fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary, marginTop: 6},
  sectionCount: {fontSize: 14, color: Colors.textMuted},

  emptyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 16, paddingHorizontal: Spacing.md,
  },
  emptyText: {fontSize: 14, color: Colors.textMuted},

  tripRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 14, paddingHorizontal: Spacing.md,
  },
  tripDot: {width: 10, height: 10, borderRadius: 5},
  tripInfo: {flex: 1},
  tripRoute: {fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary},
  tripTime: {fontSize: 12, color: Colors.textMuted, marginTop: 2},
  tripVehicle: {fontSize: 11, color: Colors.textMuted, marginTop: 2},
  statusPill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20},
  statusText: {fontSize: 11, fontWeight: '600' as const},
  tripDotV: {width: 10, height: 10, borderRadius: 5},
});
