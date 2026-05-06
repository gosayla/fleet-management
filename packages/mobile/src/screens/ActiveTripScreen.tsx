import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {useAuth} from '../context/AuthContext';
import {startBroadcastingLocation, stopBroadcasting} from '../lib/socket';
import {api} from '../lib/api';
import {Trip} from '@fleet/shared';
import {Locale, t} from '../lib/i18n';

const {height} = Dimensions.get('window');

interface Props {
  trip: Trip;
  onComplete: () => void;
  locale: Locale;
  onToggleLocale: () => void;
}

export function ActiveTripScreen({trip, onComplete, locale, onToggleLocale}: Props) {
  const {user} = useAuth();
  const i18n = t(locale);
  const isRTL = locale === 'ar';
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);
  const [routeCoords, setRouteCoords] = useState<{latitude: number; longitude: number}[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const watchId = useRef<number | null>(null);
  const broadcastRef = useRef<((u: any) => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  async function startTracking() {
    if (!user) return;

    // Start trip on server
    await api.patch(`/trips/${trip.id}`, {status: 'IN_PROGRESS'});

    const broadcast = await startBroadcastingLocation(
      trip.vehicleId,
      trip.driverId,
      () => console.log('Socket connected'),
    );
    broadcastRef.current = broadcast;
    setTracking(true);

    // Start GPS watch
    watchId.current = Geolocation.watchPosition(
      pos => {
        const location = {lat: pos.coords.latitude, lng: pos.coords.longitude};
        setCurrentLocation(location);
        setRouteCoords(prev => [
          ...prev,
          {latitude: pos.coords.latitude, longitude: pos.coords.longitude},
        ]);
        broadcast({
          location,
          speed: pos.coords.speed ?? undefined,
          heading: pos.coords.heading ?? undefined,
          timestamp: new Date(),
        });
      },
      err => console.warn('GPS error', err),
      {enableHighAccuracy: true, distanceFilter: 50, interval: 10_000},
    );

    // Elapsed timer
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  }

  function stopTracking() {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopBroadcasting();
    setTracking(false);
  }

  async function completeTrip() {
    Alert.alert(i18n.completeTripTitle, i18n.completeTripConfirm, [
      {text: i18n.cancel, style: 'cancel'},
      {
        text: i18n.complete,
        style: 'default',
        onPress: async () => {
          stopTracking();
          await api.patch(`/trips/${trip.id}`, {status: 'COMPLETED'});
          onComplete();
        },
      },
    ]);
  }

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={
          currentLocation
            ? {
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {latitude: 24.7136, longitude: 46.6753, latitudeDelta: 1, longitudeDelta: 1}
        }
        showsUserLocation
        showsMyLocationButton>
        {routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor="#2563eb" strokeWidth={4} />
        )}
        {currentLocation && (
          <Marker
            coordinate={{latitude: currentLocation.lat, longitude: currentLocation.lng}}
            title={i18n.vehicle}
            description={trip.vehicleId}
          />
        )}
      </MapView>

      {/* Info card */}
      <View style={styles.bottomSheet}>
        <View style={[styles.topBar, isRTL && styles.topBarRtl]}>
          <Text style={[styles.route, isRTL && styles.rtlText]}>
            {trip.origin} → {trip.destination}
          </Text>
          <TouchableOpacity style={styles.langBtn} onPress={onToggleLocale}>
            <Text style={styles.langText}>{i18n.languageLabel}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.vehicle, isRTL && styles.rtlText]}>{i18n.vehicle}: {trip.vehicleId}</Text>

        {tracking && (
          <View style={styles.trackingBadge}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.trackingText}>{i18n.gpsActive} — {formatElapsed(elapsed)}</Text>
          </View>
        )}

        {!tracking ? (
          <TouchableOpacity style={styles.startBtn} onPress={startTracking}>
            <Text style={styles.btnText}>{i18n.startTrip}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.completeBtn} onPress={completeTrip}>
            <Text style={styles.btnText}>{i18n.completeTrip}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  map: {width: '100%', height: height * 0.55},
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
    alignItems: 'flex-start',
  },
  topBarRtl: {flexDirection: 'row-reverse'},
  langBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langText: {color: '#374151', fontSize: 12, fontWeight: '600'},
  route: {fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8},
  vehicle: {fontSize: 14, color: '#6b7280'},
  rtlText: {textAlign: 'right'},
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trackingText: {color: '#fff', fontWeight: '600', fontSize: 14},
  startBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  completeBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},
});
