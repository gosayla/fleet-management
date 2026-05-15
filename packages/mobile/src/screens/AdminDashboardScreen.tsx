import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { api } from '../lib/api';
import { FleetStats } from '@fleet/shared';
import { useAuth } from '../context/AuthContext';
import { Locale, t, isRTL } from '../lib/i18n';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { formatDateSmart } from '../lib/dates';
import { TripLegBadge } from '../components/ui/TripLegBadge';

interface DashboardPayload {
  stats: FleetStats;
  trips: TripItem[];
  fuel: FuelLog[];
  maintenance: MaintenanceItem[];
  docs: { expired: ExpiryDoc[]; critical: ExpiryDoc[]; warning: ExpiryDoc[] };
}

interface Props {
  locale: Locale;
  onSelectTrip?: (id: string) => void;
  onNotificationsPress?: () => void;
  unreadNotifications?: number;
}

interface TripItem {
  id: string;
  origin: string;
  destination: string;
  status: string;
  scheduledStart: string;
  leg?: string;
  actualStart?: string;
  vehicle?: {
    id: string;
    plateNumber: string;
    make: string;
    model: string;
    lastLocationLat?: number;
    lastLocationLng?: number;
    lastLocationAt?: string;
  };
  driver?: { id: string; fullName: string; phone: string };
}

interface FuelLog {
  id: string;
  costSar: number;
  liters: number;
  filledAt: string;
}

interface MaintenanceItem {
  id: string;
  status: string;
}

interface ExpiryDoc {
  id: string;
  type: string;
  expiryDate: string;
  vehicles?: { plateNumber: string }[];
  drivers?: { fullName: string }[];
}

const SB_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

const LOCALE_CODE: Record<Locale, string> = {
  ar: 'ar-SA',
  en: 'en-US',
  hi: 'hi-IN',
  bn: 'bn-BD',
  ur: 'ur-PK',
};

function buildMonthlyFuel(
  logs: FuelLog[],
  locale: Locale,
  numMonths = 6
): { label: string; value: number }[] {
  const now = new Date();
  return Array.from({ length: numMonths }, (_, i) => {
    const d = new Date(
      now.getFullYear(),
      now.getMonth() - (numMonths - 1 - i),
      1
    );
    const m = d.getMonth();
    const y = d.getFullYear();
    const total = logs
      .filter((l) => {
        const ld = new Date(l.filledAt);
        return ld.getMonth() === m && ld.getFullYear() === y;
      })
      .reduce((s, l) => s + (l.costSar ?? 0), 0);
    const label = new Intl.DateTimeFormat(LOCALE_CODE[locale], {
      month: 'short',
    }).format(d);
    return { label, value: total };
  });
}

const DOC_LABELS_BRIEF: Record<string, Record<string, string>> = {
  VEHICLE_REGISTRATION: {
    en: 'Vehicle Registration',
    ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u0631\u0643\u0628\u0629',
    hi: '\u0935\u093e\u0939\u0928 \u092a\u0902\u091c\u0940\u0643\u0930\u0923',
    bn: '\u0997\u09be\u09a1\u09bc\u09bf \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8',
    ur: '\u06af\u0627\u0691\u06cc \u0631\u062c\u0633\u0679\u0631\u06cc\u0634\u0646',
  },
  VEHICLE_INSURANCE: {
    en: 'Vehicle Insurance',
    ar: '\u062a\u0623\u0645\u064a\u0646 \u0627\u0644\u0645\u0631\u0643\u0628\u0629',
    hi: '\u0935\u093e\u0939\u0928 \u092c\u0940\u092e\u093e',
    bn: '\u0997\u09be\u09a1\u09bc\u09bf\u09b0 \u09ac\u09c0\u09ae\u09be',
    ur: '\u06af\u0627\u0691\u06cc \u0627\u0646\u0634\u0648\u0631\u0646\u0633',
  },
  PERIODIC_INSPECTION: {
    en: 'Periodic Inspection',
    ar: '\u0627\u0644\u0641\u062d\u0635 \u0627\u0644\u062f\u0648\u0631\u064a',
    hi: '\u0906\u0935\u0927\u093f\u0915 \u0928\u093f\u0930\u0940\u0915\u094d\u0937\u0923',
    bn: '\u09aa\u09b0\u09cd\u09af\u09be\u09af\u09bc\u0995\u09cd\u09b0\u09ae\u09bf\u0995 \u09aa\u09b0\u09bf\u09a6\u09b0\u09cd\u09b6\u09a8',
    ur: '\u0648\u0642\u062a\u0627\u064b \u0641\u0648\u0642\u062a\u0627\u064b \u0645\u0639\u0627\u0626\u0646\u06c1',
  },
  DRIVER_LICENSE: {
    en: 'Driving License',
    ar: '\u0631\u062e\u0635\u0629 \u0627\u0644\u0642\u064a\u0627\u062f\u0629',
    hi: '\u0921\u094d\u0930\u093e\u0907\u0935\u093f\u0902\u0917 \u0932\u093e\u0907\u0938\u0947\u0902\u0938',
    bn: '\u09a1\u09cd\u09b0\u09be\u0987\u09ad\u09bf\u0982 \u09b2\u09be\u0987\u09b8\u09c7\u09a8\u09cd\u09b8',
    ur: '\u0688\u0631\u0627\u0626\u06cc\u0648\u0646\u06af \u0644\u0627\u0626\u0633\u0646\u0633',
  },
  TRANSPORT_PERMIT: {
    en: 'Transport Permit',
    ar: '\u062a\u0635\u0631\u064a\u062d \u0646\u0642\u0644',
    hi: '\u092a\u0930\u093f\u0935\u0939\u0928 \u092a\u0930\u092e\u093f\u091f',
    bn: '\u09aa\u09b0\u09bf\u09ac\u09b9\u09a8 \u09aa\u09be\u09b0\u09ae\u09bf\u099f',
    ur: '\u0679\u0631\u0627\u0646\u0633\u067e\u0648\u0631\u0679 \u067e\u0631\u0645\u0679',
  },
  OWNERSHIP_DEED: {
    en: 'Ownership Deed',
    ar: '\u0639\u0642\u062f \u0627\u0644\u0645\u0644\u0643\u064a\u0629',
    hi: '\u0938\u094d\u0935\u093e\u092e\u093f\u0924\u094d\u0935 \u0935\u093f\u0932\u0947\u0916',
    bn: '\u09ae\u09be\u09b2\u09bf\u0995\u09be\u09a8\u09be \u09a6\u09b2\u09bf\u09b2',
    ur: '\u0645\u0644\u06a9\u06cc\u062a \u062f\u0633\u062a\u0627\u0648\u06cc\u0632',
  },
  OPERATION_CARD: {
    en: 'Operation Card',
    ar: '\u0628\u0637\u0627\u0642\u0629 \u062a\u0634\u063a\u064a\u0644',
    hi: '\u0911\u092a\u0631\u0947\u0936\u0928 \u0915\u093e\u0930\u094d\u0921',
    bn: '\u0985\u09aa\u09be\u09b0\u09c7\u09b6\u09a8 \u0995\u09be\u09b0\u09cd\u09a1',
    ur: '\u0622\u067e\u0631\u06cc\u0634\u0646 \u06a9\u0627\u0631\u0688',
  },
};

export function AdminDashboardScreen({
  locale,
  onSelectTrip,
  onNotificationsPress,
  unreadNotifications = 0,
}: Props) {
  const { user } = useAuth();
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const expiryRowDirectionStyle = rtl ? styles.rowReverse : styles.row;
  const textEndStyle = rtl ? styles.textLeft : styles.textRight;
  const alignEndStyle = rtl ? styles.alignStart : styles.alignEnd;

  const {
    data: payload,
    refreshing,
    refresh: load,
  } = useCachedFetch<DashboardPayload>('admin:dashboard', async () => {
    const [s, trips, fuel, maintenance, docs] = await Promise.all([
      api.get<FleetStats>('/dashboard/stats'),
      api.get<TripItem[]>('/trips'),
      api.get<FuelLog[]>('/fuel'),
      api.get<MaintenanceItem[]>('/maintenance'),
      api.get<{
        expired: ExpiryDoc[];
        critical: ExpiryDoc[];
        warning: ExpiryDoc[];
      }>('/documents/expiring'),
    ]);
    return {
      stats: s,
      trips: Array.isArray(trips) ? trips : [],
      fuel: Array.isArray(fuel) ? fuel : [],
      maintenance: Array.isArray(maintenance) ? maintenance : [],
      docs,
    };
  });

  const stats = payload?.stats ?? null;
  const allTrips = payload?.trips ?? [];
  const activeTrips = allTrips
    .filter((tripItem) => tripItem.status === 'IN_PROGRESS')
    .slice(0, 5);
  const scheduledTrips = allTrips
    .filter((tripItem) => tripItem.status === 'SCHEDULED')
    .sort(
      (a, b) =>
        new Date(a.scheduledStart).getTime() -
        new Date(b.scheduledStart).getTime()
    )
    .slice(0, 3);
  const monthlyFuel = buildMonthlyFuel(payload?.fuel ?? [], locale);
  const maintenanceCount = (payload?.maintenance ?? []).length;
  const expiringDocs = [
    ...(payload?.docs.expired ?? []),
    ...(payload?.docs.critical ?? []),
  ].slice(0, 5);
  const overviewPills = [
    {
      icon: 'truck-outline',
      label: i18n.vehiclesLabel,
      value: stats?.totalVehicles ?? 0,
      color: Colors.primary,
      iconStyle: styles.pillIconPrimary,
    },
    {
      icon: 'account-group-outline',
      label: i18n.driversLabel,
      value: stats?.totalDrivers ?? 0,
      color: Colors.success,
      iconStyle: styles.pillIconSuccess,
    },
    {
      icon: 'map-marker-path',
      label: i18n.todayLabel,
      value: stats?.tripsToday ?? 0,
      color: Colors.purple,
      iconStyle: styles.pillIconPurple,
    },
    {
      icon: 'wrench-outline',
      label: i18n.maintenanceLabel,
      value: maintenanceCount,
      color: Colors.warning,
      iconStyle: styles.pillIconWarning,
    },
  ];

  const fullName =
    (user as any)?.fullName ?? (user as any)?.name ?? user?.email ?? 'Admin';
  const firstName = fullName.split(' ')[0];
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <View style={styles.statusBarSpacer} />
        <View style={[styles.topRow, rowDirectionStyle]}>
          <View style={[styles.userRow, rowDirectionStyle]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>{i18n.welcomeAdmin}</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.8}
            onPress={onNotificationsPress}
          >
            <AppIcon
              name={
                unreadNotifications > 0 ? 'bell-badge-outline' : 'bell-outline'
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Live GPS section ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, rowDirectionStyle]}>
            <Text style={styles.sectionTitle}>{i18n.liveGPS}</Text>
            <View style={styles.mapStat}>
              <AppIcon name="truck-outline" size={13} color={Colors.primary} />
              <Text style={styles.mapStatText}>
                {stats?.tripsInProgress ?? 0} {i18n.activeCount}
              </Text>
            </View>
          </View>
          {activeTrips.length === 0 ? (
            <View style={styles.emptyDeadline}>
              <AppIcon
                name="map-marker-off-outline"
                size={32}
                color={Colors.border}
              />
              <Text style={styles.emptyDeadlineText}>{i18n.noActiveTrips}</Text>
            </View>
          ) : (
            activeTrips.map((trip) => {
              const hasGps = !!trip.vehicle?.lastLocationLat;
              const lastUpdate = trip.vehicle?.lastLocationAt
                ? new Date(trip.vehicle.lastLocationAt).toLocaleTimeString(
                    'en-GB',
                    { hour: '2-digit', minute: '2-digit' }
                  )
                : null;
              return (
                <TouchableOpacity
                  key={trip.id}
                  style={[styles.tripCard, rowDirectionStyle]}
                  onPress={() => onSelectTrip?.(trip.id)}
                  activeOpacity={0.7}
                >
                  {/* GPS pulse indicator */}
                  <View style={[styles.gpsDot, hasGps && styles.gpsDotActive]}>
                    <AppIcon
                      name={hasGps ? 'map-marker' : 'map-marker-outline'}
                      size={16}
                      color={hasGps ? '#fff' : Colors.textMuted}
                    />
                  </View>
                  <View style={styles.flexOne}>
                    <Text
                      style={[styles.tripRoute, textEndStyle]}
                      numberOfLines={1}
                    >
                      {rtl ? trip.origin : trip.destination} {rtl ? '←' : '→'}{' '}
                      {rtl ? trip.destination : trip.origin}
                    </Text>
                    <View style={[styles.tripLegWrap, alignEndStyle]}>
                      <TripLegBadge leg={trip.leg} locale={locale} />
                    </View>
                    <Text
                      style={[styles.tripMeta, textEndStyle]}
                      numberOfLines={1}
                    >
                      {trip.vehicle?.plateNumber ?? '—'} ·{' '}
                      {trip.driver?.fullName ?? '—'}
                    </Text>
                    {lastUpdate && (
                      <Text style={styles.tripGpsTime}>
                        {i18n.lastGPS} {lastUpdate}
                      </Text>
                    )}
                  </View>
                  {hasGps && (
                    <View style={styles.gpsLiveBadge}>
                      <Text style={styles.gpsLiveText}>{i18n.live}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── Spending section ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, rowDirectionStyle]}>
            <Text style={styles.sectionTitle}>{i18n.fuelSpending}</Text>
            {stats && stats.fuelCostThisMonth > 0 && (
              <Text style={styles.seeAll}>
                {Math.round(stats.fuelCostThisMonth).toLocaleString()}{' '}
                {i18n.sarUnit}
              </Text>
            )}
          </View>
          <View style={styles.spendingBox}>
            <SpendingLineChart monthlyData={monthlyFuel} locale={locale} />
          </View>
        </View>

        {/* ── Upcoming Trips ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, rowDirectionStyle]}>
            <Text style={styles.sectionTitle}>{i18n.upcomingTrips}</Text>
          </View>
          {scheduledTrips.length === 0 ? (
            <View style={styles.emptyDeadline}>
              <AppIcon
                name="calendar-check-outline"
                size={32}
                color={Colors.border}
              />
              <Text style={styles.emptyDeadlineText}>
                {i18n.noUpcomingTrips}
              </Text>
            </View>
          ) : (
            scheduledTrips.map((trip, i) => {
              const highlighted = i === scheduledTrips.length - 1;
              const date = new Date(trip.scheduledStart);
              const dateStr = date.toLocaleDateString(LOCALE_CODE[locale], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const timeStr = date.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <TouchableOpacity
                  key={trip.id}
                  style={[
                    styles.deadlineRow,
                    rowDirectionStyle,
                    highlighted && styles.deadlineRowHL,
                  ]}
                  onPress={() => onSelectTrip?.(trip.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.deadlineIcon,
                      highlighted && styles.deadlineIconHL,
                    ]}
                  >
                    <AppIcon
                      name="truck-outline"
                      size={20}
                      color={highlighted ? '#fff' : Colors.primary}
                    />
                  </View>
                  <View style={styles.deadlineBody}>
                    <Text
                      style={[
                        styles.deadlineTitle,
                        highlighted && styles.deadlineTextHL,
                        textEndStyle,
                      ]}
                      numberOfLines={1}
                    >
                      {rtl ? trip.origin : trip.destination} {rtl ? '←' : '→'}{' '}
                      {rtl ? trip.destination : trip.origin}
                    </Text>
                    <Text
                      style={[
                        styles.deadlineDate,
                        highlighted && styles.deadlineTextHL,
                        textEndStyle,
                      ]}
                      numberOfLines={1}
                    >
                      {trip.vehicle?.plateNumber ?? '—'} ·{' '}
                      {trip.driver?.fullName ?? '—'}
                    </Text>
                    <Text
                      style={[
                        styles.deadlineDate,
                        highlighted && styles.deadlineTextHL,
                      ]}
                    >
                      {dateStr} {timeStr}
                    </Text>
                  </View>
                  <View style={[styles.tripLegWrap, alignEndStyle]}>
                    <TripLegBadge leg={trip.leg} locale={locale} />
                  </View>
                  <AppIcon
                    name={rtl ? 'arrow-left' : 'arrow-right'}
                    size={20}
                    color={highlighted ? '#fff' : Colors.primary}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── Stat pills ── */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.overview}</Text>
            <View style={[styles.pills, rowDirectionStyle]}>
              {overviewPills.map((p, i) => (
                <View key={i} style={styles.pill}>
                  <View style={[styles.pillIcon, p.iconStyle]}>
                    <AppIcon name={p.icon} size={18} color={p.color} />
                  </View>
                  <Text style={styles.pillValue}>{p.value}</Text>
                  <Text style={styles.pillLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Document Expiry Alert ── */}
        {expiringDocs.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, rowDirectionStyle]}>
              <Text style={styles.sectionTitle}>{i18n.expiringDocs}</Text>
            </View>
            {expiringDocs.map((doc) => {
              const now = new Date();
              const expiry = new Date(doc.expiryDate);
              const isExpired = expiry < now;
              const daysLeft = Math.ceil(
                (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              const subject =
                doc.vehicles?.[0]?.plateNumber ??
                doc.drivers?.[0]?.fullName ??
                '—';
              const expiryStr = formatDateSmart(doc.expiryDate, locale);
              return (
                <View
                  key={doc.id}
                  style={[
                    styles.deadlineRow,
                    expiryRowDirectionStyle,
                    isExpired && styles.deadlineExpiredBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.deadlineIcon,
                      isExpired
                        ? styles.deadlineExpiredIcon
                        : styles.deadlineWarningIcon,
                    ]}
                  >
                    <AppIcon
                      name="file-alert-outline"
                      size={20}
                      color={isExpired ? '#e74c3c' : '#e67e22'}
                    />
                  </View>
                  <View style={styles.deadlineBody}>
                    <Text
                      style={[styles.deadlineTitle, textEndStyle]}
                      numberOfLines={1}
                    >
                      {DOC_LABELS_BRIEF[doc.type]?.[locale] ??
                        DOC_LABELS_BRIEF[doc.type]?.en ??
                        doc.type.replace(/_/g, ' ')}{' '}
                      — {subject}
                    </Text>
                    <Text
                      style={[
                        styles.deadlineDate,
                        isExpired
                          ? styles.deadlineExpiredText
                          : styles.deadlineWarningText,
                        textEndStyle,
                      ]}
                    >
                      {isExpired
                        ? `${i18n.expiringDocs} -${Math.abs(daysLeft)}${
                            i18n.daysAbbr
                          }`
                        : `+${daysLeft}${i18n.daysAbbr}`}
                      {' · '}
                      {expiryStr}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Spending line chart (pure RN, no SVG) ──────────────────────────────────
function SpendingLineChart({
  monthlyData,
  locale,
}: {
  monthlyData: { label: string; value: number }[];
  locale: Locale;
}) {
  const i18n = t(locale);
  const [w, setW] = useState(0);
  const H = 90;
  const PAD_Y = 16;

  const data =
    monthlyData.length > 0 ? monthlyData : [{ label: '—', value: 0 }];
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  // Current month is last entry
  const activeIdx = data.length - 1;

  const pts = data.map((d, i) => ({
    x: w > 0 ? (i / Math.max(data.length - 1, 1)) * w : 0,
    y: PAD_Y + (H - PAD_Y * 2) * (1 - d.value / maxVal),
  }));

  const segs = pts.slice(0, -1).map((p, i) => {
    const q = pts[i + 1];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, len, angle };
  });

  const peak = pts[activeIdx] ?? pts[0];
  const currentVal = data[activeIdx]?.value ?? 0;
  const peakLabel =
    currentVal > 0
      ? `${Math.round(currentVal).toLocaleString()} ${i18n.sarUnit}`
      : i18n.noChartData;

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {/* Current month label above chart */}
      <Text style={lcStyles.peakLabel}>{peakLabel}</Text>

      {/* Line chart area */}
      <View style={[lcStyles.chartArea, { height: H }]}>
        {w > 0 && (
          <>
            {/* Line segments */}
            {segs.map((s, i) => (
              <View
                key={i}
                style={[
                  lcStyles.seg,
                  {
                    left: s.mx - s.len / 2,
                    top: s.my - 1.5,
                    width: s.len,
                    transform: [{ rotate: `${s.angle}deg` }],
                  },
                ]}
              />
            ))}
            {/* Dashed vertical from current month to bottom */}
            {Array.from({ length: 7 }, (_, di) => (
              <View
                key={`d${di}`}
                style={[
                  lcStyles.dashSeg,
                  {
                    left: peak.x - 0.5,
                    top: peak.y + 10 + di * 9,
                  },
                ]}
              />
            ))}
            {/* Current month dot (outer ring + inner) */}
            <View
              style={[lcStyles.peakRing, { left: peak.x - 8, top: peak.y - 8 }]}
            />
            <View
              style={[lcStyles.peakDot, { left: peak.x - 5, top: peak.y - 5 }]}
            />
          </>
        )}
      </View>

      {/* Month axis */}
      <View style={lcStyles.axis}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[
              lcStyles.axisLabel,
              i === activeIdx && lcStyles.axisLabelActive,
            ]}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const lcStyles = StyleSheet.create({
  peakLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  chartArea: { position: 'relative', overflow: 'visible' },
  seg: {
    position: 'absolute',
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    opacity: 0.95,
  },
  dashSeg: {
    position: 'absolute',
    width: 1,
    height: 5,
    backgroundColor: Colors.textMuted,
  },
  peakRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  peakDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  axis: { flexDirection: 'row', marginTop: 10 },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textMuted,
  },
  axisLabelActive: { color: Colors.primary, fontWeight: '700' as const },
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  flexOne: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.bg },

  // Top bar
  topBar: {
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
  },
  statusBarSpacer: { height: SB_HEIGHT },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700' as const, color: '#fff' },
  welcomeText: { fontSize: 12, color: Colors.textMuted },
  userName: { fontSize: 18, fontWeight: '800' as const, color: Colors.primary },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
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

  // Scroll
  scroll: { paddingHorizontal: Spacing.md, paddingTop: 4 },

  // Section
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' as const },

  // Map box
  mapBox: {
    height: 160,
    borderRadius: 16,
    backgroundColor: '#E8F3F2',
    overflow: 'hidden',
    position: 'relative',
  },
  mapGrid: { position: 'absolute', width: '100%', height: '100%' },
  mapLine: { position: 'absolute', backgroundColor: 'rgba(36,124,118,0.12)' },
  mapLineH: { left: 0, right: 0, height: 1 },
  mapLineV: { top: 0, bottom: 0, width: 1 },
  routeLine: {
    position: 'absolute',
    left: '20%',
    top: '35%',
    width: '60%',
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    transform: [{ rotate: '15deg' }],
  },
  vehiclePin: {
    position: 'absolute',
    left: '55%',
    top: '25%',
    alignItems: 'center',
  },
  vehiclePinInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  mapStats: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 8,
  },
  mapStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  mapStatText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },

  // Spending chart
  spendingBox: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  // Deadlines
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  deadlineRowHL: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deadlineExpiredBorder: {
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  deadlineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineIconHL: { backgroundColor: 'rgba(255,255,255,0.25)' },
  deadlineExpiredIcon: { backgroundColor: '#fdecea' },
  deadlineWarningIcon: { backgroundColor: '#fff3e0' },
  deadlineBody: { flex: 1 },
  deadlineTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  tripLegWrap: { marginTop: 6 },
  deadlineDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  deadlineTextHL: { color: '#fff' },
  emptyDeadline: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyDeadlineText: { fontSize: 14, color: Colors.textMuted },

  // Trip GPS cards
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tripRoute: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  tripMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  tripGpsTime: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  gpsDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsDotActive: { backgroundColor: Colors.primary },
  gpsLiveBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gpsLiveText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Pills
  pills: { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pillIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillIconPrimary: { backgroundColor: Colors.primaryLight },
  pillIconSuccess: { backgroundColor: 'rgba(46, 204, 113, 0.12)' },
  pillIconPurple: { backgroundColor: 'rgba(155, 89, 182, 0.12)' },
  pillIconWarning: { backgroundColor: 'rgba(243, 156, 18, 0.12)' },
  pillValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
  },
  pillLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  deadlineExpiredText: { color: '#e74c3c' },
  deadlineWarningText: { color: '#e67e22' },
  bottomSpacer: { height: Spacing.xl },
});
