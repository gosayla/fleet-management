import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  BackHandler,
  PermissionsAndroid,
  Platform,
  StatusBar,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../context/AuthContext';
import { startBroadcastingLocation, stopBroadcasting } from '../lib/socket';
import { api } from '../lib/api';
import { Trip } from '@fleet/shared';
import { Locale, t, isRTL as isRTLFn } from '../lib/i18n';
import { ENABLE_MAPS } from '../lib/env';
import { OsmMapView } from '../components/maps/OsmMapView';
import { Colors } from '../lib/theme';
import { Alert } from '../lib/alert';
import { TripLegBadge } from '../components/ui/TripLegBadge';

const { height } = Dimensions.get('window');

interface Props {
  trip: Trip;
  onComplete: () => void;
  onBack: () => void;
  locale: Locale;
  minimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
}

export function ActiveTripScreen({
  trip,
  onComplete,
  onBack,
  locale,
  minimized = false,
  onMinimize,
  onRestore,
}: Props) {
  const { user } = useAuth();
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [elapsed, setElapsed] = useState(0);
  const watchId = useRef<number | null>(null);
  const broadcastRef = useRef<((u: any) => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationBuffer = useRef<
    {
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
      recordedAt: string;
    }[]
  >([]);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vehicleLabel = trip.vehicle?.plateNumber || trip.vehicleId;

  const ensureLocationPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

    const hasFine = await PermissionsAndroid.check(fine);
    const hasCoarse = await PermissionsAndroid.check(coarse);
    if (hasFine || hasCoarse) {
      return true;
    }

    const status = await PermissionsAndroid.request(fine, {
      title: i18n.locationPermission,
      message: i18n.locationPermissionMsg,
      buttonPositive: i18n.allow,
      buttonNegative: i18n.deny,
      buttonNeutral: i18n.later,
    });

    return status === PermissionsAndroid.RESULTS.GRANTED;
  }, [
    i18n.allow,
    i18n.deny,
    i18n.later,
    i18n.locationPermission,
    i18n.locationPermissionMsg,
  ]);

  const beginTrackingSession = useCallback(
    async (resumeExisting = false) => {
      if (!user) {
        return;
      }

      const granted = await ensureLocationPermission();
      if (!granted) {
        Alert.alert(i18n.locationRequired, i18n.locationRequiredMsg);
        return;
      }

      if (!resumeExisting) {
        await api.patch(`/trips/${trip.id}`, { status: 'IN_PROGRESS' });
      }

      const broadcast = await startBroadcastingLocation(
        trip.vehicleId,
        trip.driverId,
        () => console.log('Socket connected')
      );
      broadcastRef.current = broadcast;
      setTracking(true);
      if (resumeExisting && trip.actualStart) {
        const actualStartMs = new Date(trip.actualStart).getTime();
        if (!Number.isNaN(actualStartMs)) {
          setElapsed(
            Math.max(0, Math.floor((Date.now() - actualStartMs) / 1000))
          );
        }
      }

      // Start GPS watch
      watchId.current = Geolocation.watchPosition(
        (pos) => {
          const location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setCurrentLocation(location);
          setRouteCoords((prev) => [
            ...prev,
            { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          ]);
          broadcast({
            location,
            speed: pos.coords.speed ?? undefined,
            heading: pos.coords.heading ?? undefined,
            timestamp: new Date(),
          });
          // Buffer for batch persistence
          locationBuffer.current.push({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed ?? undefined,
            heading: pos.coords.heading ?? undefined,
            recordedAt: new Date().toISOString(),
          });
        },
        (err) => console.warn('GPS error', err),
        { enableHighAccuracy: true, distanceFilter: 50, interval: 10_000 }
      );

      // Send buffered locations to server every 30 seconds
      batchTimerRef.current = setInterval(async () => {
        if (locationBuffer.current.length === 0) {
          return;
        }
        const batch = locationBuffer.current.splice(0);
        try {
          await api.post(`/trips/${trip.id}/locations/batch`, batch);
        } catch {
          // Put back on failure so they're not lost
          locationBuffer.current.unshift(...batch);
        }
      }, 30_000);

      // Elapsed timer
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    },
    [
      ensureLocationPermission,
      i18n.locationRequired,
      i18n.locationRequiredMsg,
      trip.actualStart,
      trip.driverId,
      trip.id,
      trip.vehicleId,
      user,
    ]
  );

  async function startTracking() {
    await beginTrackingSession(false);
  }

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (batchTimerRef.current) {
      clearInterval(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    // Flush remaining buffer
    const batch = locationBuffer.current.splice(0);
    if (batch.length > 0) {
      api.post(`/trips/${trip.id}/locations/batch`, batch).catch(() => {});
    }
    stopBroadcasting();
    setTracking(false);
  }, [trip.id]);

  const handleBack = useCallback(() => {
    if (tracking) {
      Alert.alert(i18n.warning, i18n.tripActiveExitMsg, [
        { text: i18n.cancel, style: 'cancel' },
        { text: i18n.minimizeLabel, onPress: () => onMinimize?.() },
        {
          text: i18n.exitLabel,
          style: 'destructive',
          onPress: () => {
            stopTracking();
            onBack();
          },
        },
      ]);
    } else {
      onBack();
    }
  }, [
    i18n.cancel,
    i18n.exitLabel,
    i18n.minimizeLabel,
    i18n.tripActiveExitMsg,
    i18n.warning,
    onBack,
    onMinimize,
    stopTracking,
    tracking,
  ]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  useEffect(() => {
    ensureLocationPermission().then((granted) => {
      if (!granted) {
        return;
      }
      Geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }, [ensureLocationPermission]);

  useEffect(() => {
    if (trip.status !== 'IN_PROGRESS') {
      return;
    }
    if (tracking || watchId.current !== null) {
      return;
    }

    beginTrackingSession(true).catch(() => {});
  }, [beginTrackingSession, tracking, trip.status]);

  // Hardware back button — ask confirmation if tracking is active
  useEffect(() => {
    if (minimized) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack, minimized]);

  async function completeTrip() {
    Alert.alert(i18n.completeTripTitle, i18n.completeTripConfirm, [
      { text: i18n.cancel, style: 'cancel' },
      {
        text: i18n.complete,
        style: 'default',
        onPress: async () => {
          stopTracking();
          await api.patch(`/trips/${trip.id}`, { status: 'COMPLETED' });
          onComplete();
        },
      },
    ]);
  }

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  if (minimized) {
    return (
      <TouchableOpacity
        style={[
          styles.floatingCard,
          isRTL ? styles.floatingCardLeft : styles.floatingCardRight,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        activeOpacity={0.9}
        onPress={() => onRestore?.()}
      >
        <View style={styles.floatingDot} />
        <View style={styles.floatingBody}>
          <Text
            style={[
              styles.floatingTitle,
              { textAlign: isRTL ? 'left' : 'right' },
            ]}
            numberOfLines={1}
          >
            {vehicleLabel}
          </Text>
          <Text
            style={[
              styles.floatingSubtitle,
              { textAlign: isRTL ? 'left' : 'right' },
            ]}
            numberOfLines={1}
          >
            {tracking
              ? `${i18n.gpsActive} • ${formatElapsed(elapsed)}`
              : `${isRTL ? trip.origin : trip.destination} ${
                  !isRTL ? '→' : '←'
                } ${isRTL ? trip.destination : trip.origin}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />

      {/* Map */}
      {ENABLE_MAPS ? (
        <OsmMapView
          style={styles.map}
          center={
            currentLocation
              ? {
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                }
              : { latitude: 24.7136, longitude: 46.6753 }
          }
          marker={
            currentLocation
              ? {
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                }
              : undefined
          }
          route={routeCoords}
          zoom={currentLocation ? 15 : 10}
        />
      ) : (
        <View style={styles.mapDisabledWrap}>
          <Text style={styles.mapDisabledTitle}>{i18n.mapTempDisabled}</Text>
          <Text style={styles.mapDisabledText}>{i18n.setMapKey}</Text>
          {currentLocation && (
            <Text style={styles.mapDisabledCoords}>
              {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
            </Text>
          )}
        </View>
      )}

      {/* Info card */}
      <View style={styles.bottomSheet}>
        <View
          style={[
            styles.topBar,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.routeWrap}>
            <Text
              style={[styles.route, { textAlign: isRTL ? 'left' : 'right' }]}
              numberOfLines={2}
            >
              {trip.origin} → {trip.destination}
            </Text>
            <View
              style={[
                styles.tripLegWrap,
                { alignItems: isRTL ? 'flex-start' : 'flex-end' },
              ]}
            >
              <TripLegBadge leg={trip.leg} locale={locale} />
            </View>
          </View>
        </View>

        <Text style={[styles.vehicle, { textAlign: isRTL ? 'left' : 'right' }]}>
          {i18n.vehicle}: {vehicleLabel}
        </Text>

        {tracking && (
          <View style={styles.trackingBadge}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.trackingText}>
              {i18n.gpsActive} — {formatElapsed(elapsed)}
            </Text>
          </View>
        )}

        {!tracking ? (
          <TouchableOpacity style={styles.startBtn} onPress={startTracking}>
            <Text style={styles.btnText}>{i18n.startTrip}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.minimizeBtn}
              onPress={() => onMinimize?.()}
            >
              <Text style={styles.minimizeBtnText}>{i18n.minimizeLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeBtn} onPress={completeTrip}>
              <Text style={styles.btnText}>{i18n.completeTrip}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f9fafb',
    zIndex: 40,
  },
  map: { width: '100%', height: height * 0.55 },
  mapDisabledWrap: {
    width: '100%',
    height: height * 0.55,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 6,
  },
  mapDisabledTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#111827',
    textAlign: 'center',
  },
  mapDisabledText: { fontSize: 13, color: '#4b5563', textAlign: 'center' },
  mapDisabledCoords: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600' as const,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  topBarRtl: { flexDirection: 'row-reverse' },
  routeWrap: { flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  closeBtnText: { fontSize: 14, fontWeight: '700' as const, color: '#374151' },
  route: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
  tripLegWrap: { marginTop: 6 },
  vehicle: { fontSize: 14, color: '#6b7280' },
  rtlText: { textAlign: 'right' },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trackingText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  startBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  minimizeBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  minimizeBtnText: {
    color: Colors.textPrimary,
    fontWeight: '700' as const,
    fontSize: 16,
  },
  completeBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  floatingCard: {
    position: 'absolute',
    bottom: 88,
    width: 220,
    minHeight: 64,
    backgroundColor: Colors.primaryDark,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingCardLeft: { left: 16 },
  floatingCardRight: { right: 16 },
  floatingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34d399',
  },
  floatingBody: { flex: 1 },
  floatingTitle: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  floatingSubtitle: { color: '#d1fae5', fontSize: 12, marginTop: 2 },
});
