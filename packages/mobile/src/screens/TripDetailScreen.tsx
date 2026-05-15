import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { api } from '../lib/api';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Locale, t, tripStatusLabel, isRTL, formatDateTime } from '../lib/i18n';
import { ENABLE_MAPS } from '../lib/env';
import { OsmMapView } from '../components/maps/OsmMapView';
import { TripLegBadge } from '../components/ui/TripLegBadge';

interface TripDetail {
  id: string;
  name?: string;
  leg?: 'OUTBOUND' | 'RETURN';
  origin: string;
  destination: string;
  status: string;
  tripType: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  distanceKm?: number;
  notes?: string;
  clientName?: string;
  contractNumber?: string;
  driver?: {
    id: string;
    fullName: string;
    phone: string;
    licenseNumber: string;
  };
  vehicle?: {
    id: string;
    plateNumber: string;
    make: string;
    model: string;
    type: string;
  };
}

interface TripLocationPoint {
  id: string;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  recordedAt: string;
}

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;
const HEADER_H = 220;
const HEADER_MIN_H = 116;
const MAX_ROUTE_POINTS = 240;
const MAX_ROUTE_SPEED_KMH = 180;

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  SCHEDULED: {
    color: Colors.info,
    bg: Colors.infoLight,
    icon: 'clock-outline',
  },
  IN_PROGRESS: {
    color: Colors.success,
    bg: Colors.successLight,
    icon: 'truck-fast-outline',
  },
  COMPLETED: {
    color: Colors.textMuted,
    bg: Colors.borderLight,
    icon: 'check-circle-outline',
  },
  CANCELLED: {
    color: Colors.danger,
    bg: Colors.dangerLight,
    icon: 'close-circle-outline',
  },
};

type Locale5 = 'ar' | 'en' | 'hi' | 'bn' | 'ur';
const TRIP_TYPE_LABELS: Record<string, Record<Locale5, string>> = {
  ONE_TIME: {
    ar: 'مرة واحدة',
    en: 'One Time',
    hi: 'एक बार',
    bn: 'একবার',
    ur: 'ایک بار',
  },
  DAILY: { ar: 'يومية', en: 'Daily', hi: 'दैनिक', bn: 'দৈনিक', ur: 'روزانہ' },
  MONTHLY_CONTRACT: {
    ar: 'عقد شهري',
    en: 'Monthly Contract',
    hi: 'मासिक अनुबंध',
    bn: 'মাসিক চুক্তি',
    ur: 'ماہانہ معاہدہ',
  },
};

function fmtTime(iso: string | undefined, locale: Locale) {
  if (!iso) {
    return '—';
  }
  const localeMap: Record<Locale, string> = {
    ar: 'ar-SA',
    en: 'en-US',
    hi: 'hi-IN',
    bn: 'bn-BD',
    ur: 'ur-PK',
  };
  return new Intl.DateTimeFormat(localeMap[locale], {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function haversineDistanceKm(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(endLat - startLat);
  const dLng = toRadians(endLng - startLng);
  const lat1 = toRadians(startLat);
  const lat2 = toRadians(endLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function buildRenderableRoute(points: TripLocationPoint[]) {
  const validPoints = points.filter(
    (point) =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      Math.abs(point.lat) <= 90 &&
      Math.abs(point.lng) <= 180
  );

  if (validPoints.length === 0) {
    return [] as TripLocationPoint[];
  }

  const filteredPoints: TripLocationPoint[] = [validPoints[0]];

  for (const point of validPoints.slice(1)) {
    const previousPoint = filteredPoints[filteredPoints.length - 1];
    const elapsedMs =
      new Date(point.recordedAt).getTime() -
      new Date(previousPoint.recordedAt).getTime();

    if (elapsedMs <= 0) {
      continue;
    }

    const distanceKm = haversineDistanceKm(
      previousPoint.lat,
      previousPoint.lng,
      point.lat,
      point.lng
    );
    const speedKmh = distanceKm / (elapsedMs / 3_600_000);

    if (speedKmh > MAX_ROUTE_SPEED_KMH) {
      continue;
    }

    filteredPoints.push(point);
  }

  if (filteredPoints.length <= MAX_ROUTE_POINTS) {
    return filteredPoints;
  }

  const step = Math.ceil(filteredPoints.length / MAX_ROUTE_POINTS);
  const sampledPoints = filteredPoints.filter(
    (_point, index) => index % step === 0
  );
  const lastPoint = filteredPoints[filteredPoints.length - 1];

  if (sampledPoints[sampledPoints.length - 1]?.id !== lastPoint.id) {
    sampledPoints.push(lastPoint);
  }

  return sampledPoints;
}

interface Props {
  tripId: string;
  locale: Locale;
  onBack: () => void;
  onEdit?: () => void;
  onStartTrip?: (trip: TripDetail) => void;
}

export function TripDetailScreen({
  tripId,
  locale,
  onBack,
  onEdit,
  onStartTrip,
}: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [locations, setLocations] = useState<TripLocationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    try {
      const data = await api.get<TripLocationPoint[]>(
        `/trips/${tripId}/locations`
      );
      const pts = Array.isArray(data) ? data : [];
      setLocations(pts);
    } catch {}
  }, [tripId]);

  useEffect(() => {
    api
      .get<TripDetail>(`/trips/${tripId}`)
      .then(setTrip)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    loadLocations();
    if (trip?.status === 'IN_PROGRESS') {
      timer = setInterval(loadLocations, 15000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [loadLocations, trip?.status]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.couldNotLoad}</Text>
        <TouchableOpacity onPress={onBack} style={styles.retryBtn}>
          <Text style={styles.retryText}>{i18n.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.SCHEDULED;
  const displayName =
    trip.name ||
    `${rtl ? trip.destination : trip.origin} ${!rtl ? '→' : '←'} ${
      rtl ? trip.origin : trip.destination
    }`;

  const durationMs =
    trip.scheduledEnd && trip.scheduledStart
      ? new Date(trip.scheduledEnd).getTime() -
        new Date(trip.scheduledStart).getTime()
      : 0;
  const durationHrs =
    durationMs > 0 ? (durationMs / 3_600_000).toFixed(1) : '—';
  const renderableLocations = buildRenderableRoute(locations);
  const latestLocation =
    renderableLocations.length > 0
      ? renderableLocations[renderableLocations.length - 1]
      : null;
  const routeCoords = renderableLocations.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));
  const hasRoutePath = routeCoords.length > 2;
  const collapseDistance = HEADER_H - HEADER_MIN_H;

  const animatedHeaderHeight = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [HEADER_H, HEADER_MIN_H],
    extrapolate: 'clamp',
  });

  const animatedTopPadding = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [SB_H + 6, SB_H + 2],
    extrapolate: 'clamp',
  });

  const animatedRouteScale = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [1, 0.86],
    extrapolate: 'clamp',
  });

  const animatedRouteOpacity = scrollY.interpolate({
    inputRange: [0, collapseDistance * 0.8],
    outputRange: [1, 0.86],
    extrapolate: 'clamp',
  });

  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const textEndStyle = rtl ? styles.textLeft : styles.textRight;
  const topBarAnimatedStyle = { paddingTop: animatedTopPadding };
  const headerHeightStyle = { height: animatedHeaderHeight };
  const routeSectionAnimatedStyle = {
    opacity: animatedRouteOpacity,
    transform: [{ scale: animatedRouteScale }],
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <Animated.View style={[styles.header, headerHeightStyle]}>
        {/* Grid decoration */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[0.3, 0.65].map((f) => (
            <View
              key={`h${f}`}
              style={[
                styles.gridLineH,
                { top: `${Math.round(f * 100)}%` as any },
              ]}
            />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <View
              key={`v${f}`}
              style={[
                styles.gridLineV,
                { left: `${Math.round(f * 100)}%` as any },
              ]}
            />
          ))}
        </View>

        {/* Top bar */}
        <Animated.View
          style={[styles.topBar, topBarAnimatedStyle, rowDirectionStyle]}
        >
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={onBack}
            activeOpacity={0.8}
          >
            <AppIcon name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>{i18n.tripDetails}</Text>
          {onEdit ? (
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={onEdit}
              activeOpacity={0.8}
            >
              <AppIcon name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.topBarSpacer} />
          )}
        </Animated.View>

        {/* Route display */}
        <Animated.View style={[styles.routeSection, routeSectionAnimatedStyle]}>
          <Text style={styles.tripNameText} numberOfLines={2}>
            {displayName}
          </Text>
          {trip.name && (
            <Text style={styles.routeSubText}>
              {rtl ? trip.destination : trip.origin} {!rtl ? '←' : '→'}{' '}
              {rtl ? trip.origin : trip.destination}
            </Text>
          )}
          <View style={[styles.headerBadges, rowDirectionStyle]}>
            <View
              style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}
            >
              <AppIcon
                name={statusCfg.icon}
                size={13}
                color={statusCfg.color}
              />
              <Text style={[styles.statusPillText, { color: statusCfg.color }]}>
                {tripStatusLabel(trip.status, locale)}
              </Text>
            </View>
            <TripLegBadge leg={trip.leg} locale={locale} />
          </View>
        </Animated.View>
      </Animated.View>

      {/* White curved panel */}
      <Animated.ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* 3-col info strip */}
        <View style={[styles.infoStrip, rowDirectionStyle]}>
          <InfoCol
            label={i18n.typeLabel}
            value={
              TRIP_TYPE_LABELS[trip.tripType]?.[locale] ??
              trip.tripType.replace(/_/g, ' ')
            }
          />
          <View style={styles.stripDiv} />
          <InfoCol
            label={i18n.duration}
            value={durationHrs !== '—' ? `${durationHrs}h` : '—'}
            highlight
          />
          <View style={styles.stripDiv} />
          <InfoCol
            label={i18n.distance}
            value={trip.distanceKm ? `${trip.distanceKm} km` : '—'}
          />
        </View>

        {/* Schedule card */}
        <Text style={styles.sectionTitle}>{i18n.scheduleSection}</Text>
        <View style={styles.infoCard}>
          <InfoRow
            icon="clock-start"
            label={i18n.scheduledStart}
            value={formatDateTime(trip.scheduledStart, locale)}
            rtl={rtl}
          />
          <InfoRow
            icon="clock-end"
            label={i18n.scheduledEnd}
            value={formatDateTime(trip.scheduledEnd, locale)}
            rtl={rtl}
          />
          <InfoRow
            icon="clock-outline"
            label={i18n.departureTime}
            value={fmtTime(trip.scheduledStart, locale)}
            noBorder
            rtl={rtl}
          />
        </View>
        {(trip.actualStart || trip.actualEnd) && (
          <View style={[styles.infoCard, styles.infoCardCompactTop]}>
            {trip.actualStart && (
              <InfoRow
                icon="play-circle-outline"
                label={i18n.actualStart}
                value={formatDateTime(trip.actualStart, locale)}
                highlight
                noBorder={!trip.actualEnd}
                rtl={rtl}
              />
            )}
            {trip.actualEnd && (
              <InfoRow
                icon="stop-circle-outline"
                label={i18n.actualEnd}
                value={formatDateTime(trip.actualEnd, locale)}
                highlight
                noBorder
                rtl={rtl}
              />
            )}
          </View>
        )}

        {/* Live GPS tracker */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          {i18n.locationTracker}
        </Text>
        {latestLocation ? (
          <>
            <View style={styles.infoCard}>
              <InfoRow
                icon="map-marker"
                label={i18n.latestCoords}
                value={`${latestLocation.lat.toFixed(
                  5
                )}, ${latestLocation.lng.toFixed(5)}`}
                highlight={trip.status === 'IN_PROGRESS'}
                noBorder={false}
                rtl={rtl}
              />
              <InfoRow
                icon="clock-outline"
                label={i18n.updatedAt}
                value={formatDateTime(latestLocation.recordedAt, locale)}
                highlight={trip.status === 'IN_PROGRESS'}
                noBorder
                rtl={rtl}
              />
            </View>
            {ENABLE_MAPS ? (
              <OsmMapView
                style={styles.mapWrap}
                center={{
                  latitude: latestLocation.lat,
                  longitude: latestLocation.lng,
                }}
                marker={{
                  latitude: latestLocation.lat,
                  longitude: latestLocation.lng,
                }}
                route={hasRoutePath ? routeCoords : []}
                zoom={14}
                interactive={false}
              />
            ) : (
              <EmptyCard icon="map-outline" text={i18n.mapDisabled} rtl={rtl} />
            )}
          </>
        ) : (
          <EmptyCard
            icon="map-marker-off-outline"
            text={i18n.noLocationData}
            rtl={rtl}
          />
        )}

        {/* Driver */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          {i18n.driverSection}
        </Text>
        {trip.driver ? (
          <View style={[styles.personCard, rowDirectionStyle]}>
            <View style={styles.personAvatar}>
              <Text style={styles.personInitials}>
                {String(trip.driver.fullName ?? '')
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'DR'}
              </Text>
            </View>
            <View style={styles.flexOne}>
              <Text style={[styles.personName, textEndStyle]}>
                {trip.driver.fullName || i18n.driverSection}
              </Text>
              <Text style={[styles.personSub, textEndStyle]}>
                {trip.driver.phone}
              </Text>
            </View>
            <View style={styles.licenseChip}>
              <Text style={styles.licenseText}>
                {trip.driver.licenseNumber}
              </Text>
            </View>
          </View>
        ) : (
          <EmptyCard icon="account-outline" text={i18n.noDriver} rtl={rtl} />
        )}

        {/* Vehicle */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          {i18n.vehicle}
        </Text>
        {trip.vehicle ? (
          <View style={[styles.personCard, rowDirectionStyle]}>
            <View style={[styles.personAvatar, styles.vehicleAvatar]}>
              <AppIcon name="truck" size={22} color={Colors.primary} />
            </View>
            <View style={styles.flexOne}>
              <Text style={[styles.personName, textEndStyle]}>
                {trip.vehicle.plateNumber}
              </Text>
              <Text style={[styles.personSub, textEndStyle]}>
                {trip.vehicle.make} {trip.vehicle.model}
              </Text>
            </View>
            <View style={styles.licenseChip}>
              <Text style={styles.licenseText}>
                {trip.vehicle.type?.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
        ) : (
          <EmptyCard icon="truck-outline" text={i18n.noVehicle} rtl={rtl} />
        )}

        {/* Extra info */}
        {(trip.clientName || trip.contractNumber || trip.notes) && (
          <>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
              {i18n.additionalInfo}
            </Text>
            <View style={styles.infoCard}>
              {trip.clientName && (
                <InfoRow
                  icon="account-tie-outline"
                  label={i18n.clientName}
                  value={trip.clientName}
                  noBorder={!trip.contractNumber && !trip.notes}
                  rtl={rtl}
                />
              )}
              {trip.notes && (
                <InfoRow
                  icon="note-text-outline"
                  label={i18n.notes}
                  value={trip.notes}
                  noBorder
                  rtl={rtl}
                />
              )}
            </View>
          </>
        )}

        {/* Start Trip button — only for SCHEDULED trips when driver can act */}
        {trip.status === 'SCHEDULED' && onStartTrip && (
          <TouchableOpacity
            style={[styles.startTripBtn, rowDirectionStyle]}
            onPress={() => onStartTrip(trip)}
            activeOpacity={0.85}
          >
            <AppIcon
              name="play-circle-outline"
              size={20}
              color="#fff"
              style={rtl ? styles.startTripIconRtl : undefined}
            />
            <Text style={styles.startTripText}>{i18n.startTrip}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function InfoCol({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoCol}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
  noBorder,
  rtl,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
  noBorder?: boolean;
  rtl: boolean;
}) {
  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const textEndStyle = rtl ? styles.textLeft : styles.textRight;
  return (
    <View
      style={[
        styles.infoRow,
        rowDirectionStyle,
        !noBorder && styles.infoRowBorder,
      ]}
    >
      <View style={styles.infoRowIcon}>
        <AppIcon
          name={icon}
          size={17}
          color={highlight ? Colors.primary : Colors.textMuted}
        />
      </View>
      <View style={styles.flexOne}>
        <Text style={[styles.infoRowLabel, textEndStyle]}>{label}</Text>
        <Text
          style={[
            styles.infoRowValue,
            highlight && styles.infoRowValueHighlight,
            textEndStyle,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function EmptyCard({
  icon,
  text,
  rtl,
}: {
  icon: string;
  text: string;
  rtl: boolean;
}) {
  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  return (
    <View style={[styles.emptyCard, rowDirectionStyle]}>
      <AppIcon name={icon} size={18} color={Colors.textMuted} />
      <Text style={[styles.emptyCardText]}>{text}</Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  row: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  flexOne: { flex: 1 },
  topBarSpacer: { width: 36 },
  infoCardCompactTop: { marginTop: 8 },
  sectionTitleSpaced: { marginTop: 20 },
  vehicleAvatar: { backgroundColor: '#e8f5f4' },
  bottomSpacer: { height: 32 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    gap: 12,
  },
  errorText: { fontSize: 15, color: Colors.textMuted },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '600' as const },

  header: {
    backgroundColor: Colors.primary,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  gridLineV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
    zIndex: 30,
    elevation: 30,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    opacity: 0.9,
  },
  routeSection: { alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md },
  tripNameText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#fff',
    textAlign: 'center',
  },
  routeSubText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  headerBadges: { alignItems: 'center', gap: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 12, fontWeight: '600' as const },

  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
  },
  panelContent: { padding: Spacing.md },

  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 14,
  },
  infoCol: { flex: 1, alignItems: 'center', gap: 5 },
  infoLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  infoValueHighlight: { color: Colors.primary },
  stripDiv: { width: 1, height: 32, backgroundColor: Colors.borderLight },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 10,
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  mapWrap: {
    height: 170,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: { width: '100%', height: '100%' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRowLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  infoRowValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  infoRowValueHighlight: { color: Colors.primary },

  personCard: {
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
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personInitials: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  personSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  licenseChip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  licenseText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
  },

  emptyCard: {
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
  emptyCardText: { fontSize: 14, color: Colors.textMuted },

  startTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.success,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
  },
  startTripIconRtl: { transform: [{ scaleX: -1 }] },
  startTripText: { fontSize: 16, fontWeight: '700' as const, color: '#fff' },
});
