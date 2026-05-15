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
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Locale, t, tripStatusLabel, isRTL, formatDateTime } from '../lib/i18n';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { TripLegBadge } from '../components/ui/TripLegBadge';

const SB_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

interface TripItem {
  id: string;
  origin: string;
  destination: string;
  status: string;
  scheduledStart: string;
  leg?: string;
  distanceKm?: number;
  vehicle?: { id: string; plateNumber: string; make: string; model: string };
}

interface Props {
  locale: Locale;

  onNotificationsPress?: () => void;
  unreadNotifications?: number;
  onSelectTrip?: (tripId: string) => void;
  onStartTrip?: (trip: TripItem) => void;
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

function sortByScheduledStartAsc<T extends { scheduledStart: string }>(
  items: T[]
) {
  return [...items].sort(
    (left, right) =>
      new Date(left.scheduledStart).getTime() -
      new Date(right.scheduledStart).getTime()
  );
}

export function DriverDashboardScreen({
  locale,
  onNotificationsPress,
  unreadNotifications = 0,
  onSelectTrip,
  onStartTrip,
}: Props) {
  const { user } = useAuth();
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const textEndStyle = rtl ? styles.textLeft : styles.textRight;
  const badgeAlignStyle = rtl ? styles.alignEnd : styles.alignStart;
  const {
    data: raw,
    refreshing,
    refresh: load,
  } = useCachedFetch('driver:trips', () => api.get<TripItem[]>('/trips'));
  const trips: TripItem[] = raw ?? [];

  const activeTrip = trips.find(
    (tripItem) => tripItem.status === 'IN_PROGRESS'
  );
  const activeStatAccentStyle = activeTrip
    ? styles.statCardWarningBorder
    : styles.statCardMutedBorder;
  const activeStatValueStyle = activeTrip
    ? styles.statValueWarning
    : styles.statValueMuted;
  const todayTrips = sortByScheduledStartAsc(
    trips.filter(
      (tripItem) =>
        tripItem.status === 'SCHEDULED' && isToday(tripItem.scheduledStart)
    )
  );
  const upcomingTrips = sortByScheduledStartAsc(
    trips.filter(
      (tripItem) =>
        tripItem.status === 'SCHEDULED' && !isToday(tripItem.scheduledStart)
    )
  ).slice(0, 5);
  const completedCount = trips.filter(
    (tripItem) => tripItem.status === 'COMPLETED'
  ).length;
  const scheduledCount = trips.filter(
    (tripItem) => tripItem.status === 'SCHEDULED'
  ).length;

  const greeting = `${i18n.hello}, ${user?.fullName ?? i18n.driverSection}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusBarSpacer} />
        <View style={[styles.headerRow, rowDirectionStyle]}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.headerSub}>{i18n.driverDashboard}</Text>
          </View>
          <View style={[styles.headerActions, rowDirectionStyle]}>
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.8}
              onPress={onNotificationsPress}
            >
              <AppIcon
                name={
                  unreadNotifications > 0
                    ? 'bell-badge-outline'
                    : 'bell-outline'
                }
                size={20}
                color="#fff"
              />
              {unreadNotifications > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotifications > 99
                      ? '99+'
                      : String(unreadNotifications)}
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
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={[styles.statsRow, rowDirectionStyle]}>
          <StatCard
            value={completedCount}
            label={i18n.completedStat}
            cardAccentStyle={styles.statCardSuccessBorder}
            valueAccentStyle={styles.statValueSuccess}
            icon="check-circle-outline"
            iconColor={Colors.success}
          />
          <StatCard
            value={scheduledCount}
            label={i18n.scheduledStat}
            cardAccentStyle={styles.statCardInfoBorder}
            valueAccentStyle={styles.statValueInfo}
            icon="clock-outline"
            iconColor={Colors.info}
          />
          <StatCard
            value={activeTrip ? 1 : 0}
            label={i18n.activeStat}
            cardAccentStyle={activeStatAccentStyle}
            valueAccentStyle={activeStatValueStyle}
            icon="truck-fast-outline"
            iconColor={
              activeTrip ? Colors.warning ?? '#f59e0b' : Colors.textMuted
            }
          />
        </View>

        {/* Active trip banner */}
        {activeTrip && (
          <TouchableOpacity
            style={[styles.activeBanner, rowDirectionStyle]}
            onPress={() => onStartTrip?.(activeTrip)}
            activeOpacity={0.85}
          >
            <View style={styles.activeBannerIcon}>
              <AppIcon name="truck-fast-outline" size={20} color="#fff" />
            </View>
            <View style={styles.activeBannerInfo}>
              <Text style={[styles.activeBannerTitle, textEndStyle]}>
                {i18n.activeTripBanner}
              </Text>

              <Text
                style={[styles.activeBannerRoute, textEndStyle]}
                numberOfLines={1}
              >
                {rtl ? activeTrip.destination : activeTrip.origin}{' '}
                {rtl ? '←' : '→'}{' '}
                {rtl ? activeTrip.origin : activeTrip.destination}
              </Text>
            </View>
            <View style={[styles.bannerMetaRow, badgeAlignStyle]}>
              <TripLegBadge leg={activeTrip.leg} locale={locale} />
            </View>
            <AppIcon
              name={rtl ? 'chevron-left' : 'chevron-right'}
              size={18}
              color="#fff"
            />
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
          <View style={[styles.emptyBox, rowDirectionStyle]}>
            <AppIcon
              name="calendar-check-outline"
              size={20}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>{i18n.noTripsToday}</Text>
          </View>
        ) : (
          todayTrips.map((trip) => (
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
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
              {i18n.upcomingTrips}
            </Text>
            {upcomingTrips.map((trip) => (
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
          <View style={[styles.emptyBox, rowDirectionStyle]}>
            <AppIcon name="map-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{i18n.noAssignedTrips}</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  cardAccentStyle,
  valueAccentStyle,
  icon,
  iconColor,
}: {
  value: number;
  label: string;
  cardAccentStyle: object;
  valueAccentStyle: object;
  icon: string;
  iconColor: string;
}) {
  return (
    <View style={[styles.statCard, cardAccentStyle]}>
      <AppIcon name={icon} size={18} color={iconColor} />
      <Text style={[styles.statValue, valueAccentStyle]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TripRow({
  trip,
  locale,
  onPress,
}: {
  trip: TripItem;
  locale: Locale;
  onPress: () => void;
}) {
  const rtl = isRTL(locale);
  const statusLabel = tripStatusLabel(trip.status, locale);
  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const textEndStyle = rtl ? styles.textLeft : styles.textRight;
  const badgeAlignStyle = rtl ? styles.alignEnd : styles.alignStart;
  const dotStyle =
    STATUS_DOT_STYLES[trip.status] ?? styles.tripDotMutedBackground;
  const pillStyle =
    STATUS_PILL_STYLES[trip.status] ?? styles.statusPillMutedBackground;
  const statusTextStyle =
    STATUS_TEXT_STYLES[trip.status] ?? styles.statusTextMuted;

  return (
    <TouchableOpacity
      style={[styles.tripRow, rowDirectionStyle]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.tripDot, dotStyle]} />
      <View style={styles.tripInfo}>
        <Text style={[styles.tripRoute, textEndStyle]} numberOfLines={1}>
          {!rtl ? trip.origin : trip.destination} {rtl ? '←' : '→'}{' '}
          {!rtl ? trip.destination : trip.origin}
        </Text>
        <Text style={[styles.tripTime, textEndStyle]}>
          {formatDateTime(trip.scheduledStart, locale)}
        </Text>
        {trip.vehicle && (
          <Text style={[styles.tripVehicle, textEndStyle]} numberOfLines={1}>
            {trip.vehicle.plateNumber} · {trip.vehicle.make}{' '}
            {trip.vehicle.model}
          </Text>
        )}
      </View>
      <View style={[styles.tripBadges, badgeAlignStyle]}>
        <View style={[styles.tripBadgeRow, rowDirectionStyle]}>
          <View style={[styles.statusPill, pillStyle]}>
            <Text style={[styles.statusText, statusTextStyle]}>
              {statusLabel}
            </Text>
          </View>
          <TripLegBadge leg={trip.leg} locale={locale} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  container: { flex: 1, backgroundColor: Colors.bg },

  header: { backgroundColor: Colors.primary, paddingBottom: 24 },
  statusBarSpacer: { height: SB_HEIGHT },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
  },
  greeting: { fontSize: 18, fontWeight: '700' as const, color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
    lineHeight: 12,
  },

  scroll: { padding: Spacing.md, gap: 12 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderTopWidth: 3,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statCardSuccessBorder: { borderTopColor: Colors.success },
  statCardInfoBorder: { borderTopColor: Colors.info },
  statCardWarningBorder: { borderTopColor: Colors.warning ?? '#f59e0b' },
  statCardMutedBorder: { borderTopColor: Colors.borderLight },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
  },
  statValueSuccess: { color: Colors.success },
  statValueInfo: { color: Colors.info },
  statValueWarning: { color: Colors.warning ?? '#f59e0b' },
  statValueMuted: { color: Colors.textMuted },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    textAlign: 'center',
  },

  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.success,
    borderRadius: 16,
    padding: 14,
  },
  activeBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBannerInfo: { flex: 1 },
  bannerMetaRow: { marginTop: 4 },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  activeBannerRoute: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  sectionTitleSpaced: { marginTop: 20 },
  sectionCount: { fontSize: 14, color: Colors.textMuted },

  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
  },
  emptyText: { fontSize: 14, color: Colors.textMuted },

  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  tripDot: { width: 10, height: 10, borderRadius: 5 },
  tripDotInfoBackground: { backgroundColor: Colors.info },
  tripDotSuccessBackground: { backgroundColor: Colors.success },
  tripDotMutedBackground: { backgroundColor: Colors.textMuted },
  tripDotDangerBackground: { backgroundColor: Colors.danger },
  tripInfo: { flex: 1 },
  tripRoute: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  tripTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  tripVehicle: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  tripBadges: { justifyContent: 'center' },
  tripBadgeRow: { alignItems: 'center', gap: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillSuccessBackground: {
    backgroundColor: Colors.successLight ?? '#e8f7f0',
  },
  statusPillMutedBackground: { backgroundColor: Colors.borderLight },
  statusPillDangerBackground: {
    backgroundColor: Colors.dangerLight ?? '#fdecea',
  },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  statusTextInfo: { color: Colors.info },
  statusTextSuccess: { color: Colors.success },
  statusTextMuted: { color: Colors.textMuted },
  statusTextDanger: { color: Colors.danger },
  bottomSpacer: { height: 24 },
  tripDotV: { width: 10, height: 10, borderRadius: 5 },
});

const STATUS_DOT_STYLES: Record<string, object> = {
  SCHEDULED: styles.tripDotInfoBackground,
  IN_PROGRESS: styles.tripDotSuccessBackground,
  COMPLETED: styles.tripDotMutedBackground,
  CANCELLED: styles.tripDotDangerBackground,
};

const STATUS_PILL_STYLES: Record<string, object> = {
  IN_PROGRESS: styles.statusPillSuccessBackground,
  COMPLETED: styles.statusPillMutedBackground,
  CANCELLED: styles.statusPillDangerBackground,
};

const STATUS_TEXT_STYLES: Record<string, object> = {
  SCHEDULED: styles.statusTextInfo,
  IN_PROGRESS: styles.statusTextSuccess,
  COMPLETED: styles.statusTextMuted,
  CANCELLED: styles.statusTextDanger,
};
