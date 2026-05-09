import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthProvider, useAuth} from './context/AuthContext';
import {LoginScreen} from './screens/LoginScreen';
import {TripsListScreen} from './screens/TripsListScreen';
import {ActiveTripScreen} from './screens/ActiveTripScreen';
import {NotificationsScreen} from './screens/NotificationsScreen';
import {ProfileScreen} from './screens/ProfileScreen';
import {AdminDashboardScreen} from './screens/AdminDashboardScreen';
import {AdminFleetScreen} from './screens/AdminFleetScreen';
import {AdminTripsScreen} from './screens/AdminTripsScreen';
import {VehicleDetailScreen} from './screens/VehicleDetailScreen';
import {VehicleFormScreen} from './screens/VehicleFormScreen';
import {DriverDetailScreen} from './screens/DriverDetailScreen';
import {DriverFormScreen} from './screens/DriverFormScreen';
import {TripDetailScreen} from './screens/TripDetailScreen';
import {TripFormScreen} from './screens/TripFormScreen';
import {DriverDashboardScreen} from './screens/DriverDashboardScreen';
import {Trip} from '@fleet/shared';
import {Locale} from './lib/i18n';
import {Colors} from './lib/theme';
import {BottomTabBar, TabItem} from './components/ui/BottomTabBar';
import {api} from './lib/api';

type DriverTab = 'dashboard' | 'trips' | 'profile';
type AdminTab = 'dashboard' | 'fleet' | 'trips' | 'profile';

// ── Tab config ───────────────────────────────────────────────────────────────
const DRIVER_TABS: TabItem[] = [
  {key: 'dashboard', icon: 'view-grid-outline', labels: {ar: 'الرئيسية', en: 'Home',    hi: 'होम',      bn: 'হোম',      ur: 'ہوم'}},
  {key: 'trips',     icon: 'truck-outline',     labels: {ar: 'رحلاتي',   en: 'Trips',   hi: 'यात्राएं', bn: 'ট্রিপ',    ur: 'سفر'}},
  {key: 'profile',   icon: 'account-outline',   labels: {ar: 'حسابي',    en: 'Profile', hi: 'प्रोफाइल', bn: 'প্রোফাইল', ur: 'پروفائل'}},
];

const ADMIN_TABS: TabItem[] = [
  {key: 'dashboard', icon: 'view-grid-outline', labels: {ar: 'الرئيسية', en: 'Home',    hi: 'होम',      bn: 'হোম',      ur: 'ہوم'}},
  {key: 'fleet',     icon: 'truck-outline',     labels: {ar: 'الأسطول',  en: 'Fleet',   hi: 'बेड़ा',     bn: 'ফ্লিট',    ur: 'بیڑا'}},
  {key: 'trips',     icon: 'map-marker-path',   labels: {ar: 'الرحلات',  en: 'Trips',   hi: 'यात्राएं', bn: 'ট্রিপ',    ur: 'سفر'}},
  {key: 'profile',   icon: 'account-outline',   labels: {ar: 'حسابي',    en: 'Profile', hi: 'प्रोफाइल', bn: 'প্রোফাইল', ur: 'پروفائل'}},
];

function Navigator() {
  const {user, isLoading} = useAuth();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [locale, setLocaleState] = useState<Locale>('ar');

  // Load persisted locale on startup
  useEffect(() => {
    AsyncStorage.getItem('@locale').then(saved => {
      if (saved && (['ar', 'en', 'hi', 'bn', 'ur'] as string[]).includes(saved)) {
        setLocaleState(saved as Locale);
      }
    });
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    AsyncStorage.setItem('@locale', l);
  }
  const [driverTab, setDriverTab] = useState<DriverTab>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [vehicleFormId, setVehicleFormId] = useState<string | null>(null);
  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [driverFormId, setDriverFormId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [tripFormId, setTripFormId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  // Driver trip detail (separate from admin selectedTripId so back nav is scoped)
  const [driverViewTripId, setDriverViewTripId] = useState<string | null>(null);

  // Sync app locale from the user's saved language preference on every login/change
  useEffect(() => {
    const lang = (user as any)?.language;
    if (lang && (['ar', 'en', 'hi', 'bn', 'ur'] as string[]).includes(lang)) {
      setLocale(lang as Locale);
    }
  }, [(user as any)?.language]);

  const isAdmin = user && user.role !== 'DRIVER';

  async function loadUnreadNotificationsCount() {
    if (!user) return;
    try {
      const items = await api.get<Array<{isRead: boolean}>>('/notifications');
      setUnreadNotifications(items.filter(n => !n.isRead).length);
    } catch {
      // Notifications endpoint may be unavailable temporarily.
    }
  }

  async function openDriverTripById(tripId: string) {
    try {
      const trip = await api.get<Trip>(`/trips/${tripId}`);
      setActiveTrip(trip);
    } catch {
      // Keep UI stable if trip details cannot be fetched.
    }
  }

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }
    loadUnreadNotificationsCount();
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <View style={styles.loaderIcon}>
          <Text style={styles.loaderTruck}>🚛</Text>
        </View>
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 24}} />
      </View>
    );
  }

  if (!user) return <LoginScreen locale={locale} onSetLocale={setLocale} />;

  if (activeTrip) {
    return (
      <ActiveTripScreen
        trip={activeTrip}
        locale={locale}
        onComplete={() => setActiveTrip(null)}
        onBack={() => setActiveTrip(null)}
      />
    );
  }

  if (notificationsOpen) {
    return (
      <NotificationsScreen
        locale={locale}
        onBack={() => setNotificationsOpen(false)}
        onUnreadCountChange={setUnreadNotifications}
      />
    );
  }

  // Full-screen vehicle form (hides tab bar)
  if (vehicleFormOpen) {
    return (
      <VehicleFormScreen
        vehicleId={vehicleFormId ?? undefined}
        locale={locale}
        onBack={() => setVehicleFormOpen(false)}
        onSuccess={() => {
          setVehicleFormOpen(false);
          // If editing the currently viewed vehicle, keep detail open; it will re-fetch next open
        }}
      />
    );
  }

  // Full-screen driver form (hides tab bar)
  if (driverFormOpen) {
    return (
      <DriverFormScreen
        locale={locale}
        driverId={driverFormId ?? undefined}
        onBack={() => setDriverFormOpen(false)}
        onSuccess={() => {
          setDriverFormOpen(false);
          // If we were editing the selected driver, keep detail open (re-fetches on next open)
        }}
      />
    );
  }

  // Full-screen driver detail (hides tab bar)
  if (selectedDriverId) {
    return (
      <DriverDetailScreen
        driverId={selectedDriverId}
        locale={locale}
        onBack={() => setSelectedDriverId(null)}
        onEdit={() => {
          setDriverFormId(selectedDriverId);
          setDriverFormOpen(true);
        }}
      />
    );
  }

  // Full-screen trip form
  if (tripFormOpen) {
    return (
      <TripFormScreen
        locale={locale}
        tripId={tripFormId ?? undefined}
        onBack={() => setTripFormOpen(false)}
        onSuccess={() => setTripFormOpen(false)}
      />
    );
  }

  // Full-screen trip detail
  if (selectedTripId) {
    return (
      <TripDetailScreen
        tripId={selectedTripId}
        locale={locale}
        onBack={() => setSelectedTripId(null)}
        onEdit={() => {
          setTripFormId(selectedTripId);
          setTripFormOpen(true);
        }}
      />
    );
  }

  // Full-screen vehicle detail (hides tab bar)
  if (selectedVehicleId) {
    return (
      <VehicleDetailScreen
        vehicleId={selectedVehicleId}
        locale={locale}
        onBack={() => setSelectedVehicleId(null)}
        onEdit={() => {
          setVehicleFormId(selectedVehicleId);
          setVehicleFormOpen(true);
        }}
      />
    );
  }

  // ── Driver shell ─────────────────────────────────────────────────────────────
  if (!isAdmin) {
    // Driver trip detail view
    if (driverViewTripId) {
      return (
        <TripDetailScreen
          tripId={driverViewTripId}
          locale={locale}
          onBack={() => setDriverViewTripId(null)}
          onStartTrip={trip => {
            setDriverViewTripId(null);
            openDriverTripById(trip.id);
          }}
        />
      );
    }

    return (
      <View style={styles.shell}>
        <View style={styles.screenArea}>
          {driverTab === 'dashboard' && (
            <DriverDashboardScreen
              locale={locale}
              onNotificationsPress={() => setNotificationsOpen(true)}
              unreadNotifications={unreadNotifications}
              onSelectTrip={setDriverViewTripId}
              onStartTrip={trip => openDriverTripById(trip.id)}
            />
          )}
          {driverTab === 'trips' && (
            <TripsListScreen
              locale={locale}
              onSelectTrip={trip => setDriverViewTripId(trip.id)}
              onNotificationsPress={() => setNotificationsOpen(true)}
              unreadNotifications={unreadNotifications}
            />
          )}
          {driverTab === 'profile' && (
            <ProfileScreen locale={locale} onSetLocale={setLocale} onBack={() => setDriverTab('dashboard')} />
          )}
        </View>
        <BottomTabBar
          tabs={DRIVER_TABS}
          activeKey={driverTab}
          locale={locale}
          onPress={k => setDriverTab(k as DriverTab)}
        />
      </View>
    );
  }

  // ── Admin shell ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.shell}>
      <View style={styles.screenArea}>
        {adminTab === 'dashboard'     && <AdminDashboardScreen locale={locale} onSelectTrip={setSelectedTripId} onNotificationsPress={() => setNotificationsOpen(true)} unreadNotifications={unreadNotifications} />}
        {adminTab === 'fleet'          && <AdminFleetScreen      locale={locale} onSelectVehicle={setSelectedVehicleId} onSelectDriver={setSelectedDriverId} onAddVehicle={() => { setVehicleFormId(null); setVehicleFormOpen(true); }} onAddDriver={() => { setDriverFormId(null); setDriverFormOpen(true); }} />}
        {adminTab === 'trips'          && <AdminTripsScreen      locale={locale} onSelectTrip={setSelectedTripId} onAddTrip={() => { setTripFormId(null); setTripFormOpen(true); }} />}
        {adminTab === 'profile'        && <ProfileScreen locale={locale} onSetLocale={setLocale} onBack={() => setAdminTab('dashboard')} />}
      </View>
      <BottomTabBar
        tabs={ADMIN_TABS}
        activeKey={adminTab}
        locale={locale}
        onPress={k => setAdminTab(k as AdminTab)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  loaderIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  loaderTruck: {fontSize: 36},
  shell: {flex: 1, backgroundColor: Colors.bg},
  screenArea: {flex: 1},
});

export default function App() {
  return (
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  );
}

