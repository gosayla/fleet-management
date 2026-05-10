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
import {AdminDocumentsScreen} from './screens/AdminDocumentsScreen';
import {DocumentFormScreen} from './screens/DocumentFormScreen';
import {DocumentDetailScreen} from './screens/DocumentDetailScreen';
import {ContractFormScreen} from './screens/ContractFormScreen';
import {ContractDetailScreen} from './screens/ContractDetailScreen';
import {RentalFormScreen} from './screens/RentalFormScreen';
import {RentalDetailScreen} from './screens/RentalDetailScreen';
import {AdminMaintenanceScreen} from './screens/AdminMaintenanceScreen';
import {MaintenanceFormScreen} from './screens/MaintenanceFormScreen';
import {MaintenanceDetailScreen} from './screens/MaintenanceDetailScreen';
import {DriverDocumentsScreen} from './screens/DriverDocumentsScreen';
import {AuditLogScreen} from './screens/AuditLogScreen';
import {Trip} from '@fleet/shared';
import {Locale} from './lib/i18n';
import {Colors} from './lib/theme';
import {BottomTabBar, TabItem} from './components/ui/BottomTabBar';
import {api} from './lib/api';
import {setNotificationTapHandler} from './lib/notifications';

type DriverTab = 'dashboard' | 'trips' | 'documents' | 'profile';
type AdminTab = 'dashboard' | 'fleet' | 'trips' | 'documents' | 'audit' | 'profile';
type MaintenanceTechTab = 'maintenance' | 'profile';

// ── Tab config ───────────────────────────────────────────────────────────────
const DRIVER_TABS: TabItem[] = [
  {key: 'dashboard', icon: 'view-grid-outline', labels: {ar: 'الرئيسية', en: 'Home',    hi: 'होम',      bn: 'হোম',      ur: 'ہوم'}},
  {key: 'trips',     icon: 'truck-outline',     labels: {ar: 'رحلاتي',   en: 'Trips',   hi: 'यात्राएं', bn: 'ট্রিপ',    ur: 'سفر'}},
  {key: 'documents', icon: 'file-document-outline', labels: {ar: 'وثائقي', en: 'My Docs', hi: 'दस्तावेज़', bn: 'নথি', ur: 'دستاویز'}},
  {key: 'profile',   icon: 'account-outline',   labels: {ar: 'حسابي',    en: 'Profile', hi: 'प्रोफाइल', bn: 'প্রোফাইল', ur: 'پروفائل'}},
];

const MAINTENANCE_TECH_TABS: TabItem[] = [
  {key: 'maintenance', icon: 'wrench', labels: {ar: 'الصيانة', en: 'Maintenance', hi: 'रखरखाव', bn: 'রক্ষণাবেক্ষণ', ur: 'دیکھ بھال'}},
  {key: 'profile',     icon: 'account-outline', labels: {ar: 'حسابي', en: 'Profile', hi: 'प्रोफाइल', bn: 'প্রোফাইল', ur: 'پروفائل'}},
];

const ADMIN_TABS: TabItem[] = [
  {key: 'dashboard', icon: 'view-grid-outline', labels: {ar: 'الرئيسية', en: 'Home',    hi: 'होम',      bn: 'হোম',      ur: 'ہوم'}},
  {key: 'fleet',     icon: 'truck-outline',     labels: {ar: 'الأسطول',  en: 'Fleet',   hi: 'बेड़ा',     bn: 'ফ্লিট',    ur: 'بیڑا'}},
  {key: 'trips',     icon: 'map-marker-path',   labels: {ar: 'الرحلات',  en: 'Trips',   hi: 'यात्राएं', bn: 'ট্রিপ',    ur: 'سفر'}},
  {key: 'documents', icon: 'file-document-outline', labels: {ar: 'الوثائق', en: 'Docs', hi: 'दस्तावेज़', bn: 'নথি', ur: 'دستاویز'}},
  {key: 'profile',   icon: 'account-outline',   labels: {ar: 'حسابي',    en: 'Profile', hi: 'प्रोफाइल', bn: 'প্রোফাइল', ur: 'پروفائل'}},
];

const ADMIN_AUDIT_TABS: TabItem[] = [
  {key: 'dashboard', icon: 'view-grid-outline', labels: {ar: 'الرئيسية', en: 'Home',    hi: 'होम',      bn: 'হোম',      ur: 'ہوم'}},
  {key: 'fleet',     icon: 'truck-outline',     labels: {ar: 'الأسطول',  en: 'Fleet',   hi: 'बेड़ा',     bn: 'ফ্লিট',    ur: 'بیڑا'}},
  {key: 'trips',     icon: 'map-marker-path',   labels: {ar: 'الرحلات',  en: 'Trips',   hi: 'यात्राएं', bn: 'ট্রিপ',    ur: 'سفر'}},
  {key: 'documents', icon: 'file-document-outline', labels: {ar: 'الوثائق', en: 'Docs', hi: 'दस्तावेज़', bn: 'নথি', ur: 'دستاویز'}},
  {key: 'audit',     icon: 'clipboard-list-outline', labels: {ar: 'السجل', en: 'Log', hi: 'लॉग', bn: 'লগ', ur: 'لاگ'}},
  {key: 'profile',   icon: 'account-outline',   labels: {ar: 'حسابي',    en: 'Profile', hi: 'प्रोफाइल', bn: 'প্রোফাइল', ur: 'پروفائل'}},
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
  const [techTab, setTechTab] = useState<MaintenanceTechTab>('maintenance');
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
  // Documents screen
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docFormOpen, setDocFormOpen] = useState(false);
  const [docFormId, setDocFormId] = useState<string | null>(null);
  // Contracts (trips tab sub-nav)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [contractFormId, setContractFormId] = useState<string | null>(null);
  // Rentals (trips tab sub-nav)
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [rentalFormOpen, setRentalFormOpen] = useState(false);
  const [rentalFormId, setRentalFormId] = useState<string | null>(null);
  // Trips hub persisted segment (so back from contract/rental form returns to correct tab)
  const [tripsHubSegment, setTripsHubSegment] = useState<'trips' | 'contracts' | 'rentals'>('trips');
  // Maintenance
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);
  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false);
  const [maintenanceFormId, setMaintenanceFormId] = useState<string | null>(null);
  // Fleet screen persisted state
  const [fleetSegment, setFleetSegment] = useState<'drivers' | 'vehicles'>('vehicles');
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetVehicleScroll, setFleetVehicleScroll] = useState(0);
  const [fleetDriverScroll, setFleetDriverScroll] = useState(0);
  // Driver trip detail (separate from admin selectedTripId so back nav is scoped)
  const [driverViewTripId, setDriverViewTripId] = useState<string | null>(null);
  // Driver documents
  const [driverDocFormOpen, setDriverDocFormOpen] = useState(false);
  const [driverDocFormId, setDriverDocFormId] = useState<string | null>(null);
  const [driverSelectedDocId, setDriverSelectedDocId] = useState<string | null>(null);

  // Sync app locale from the user's saved language preference on every login/change
  useEffect(() => {
    const lang = (user as any)?.language;
    if (lang && (['ar', 'en', 'hi', 'bn', 'ur'] as string[]).includes(lang)) {
      setLocale(lang as Locale);
    }
  }, [(user as any)?.language]);

  const isAdmin = user && user.role !== 'DRIVER' && user.role !== 'MAINTENANCE_TECH';

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

  // Register FCM notification tap handler — navigates to documents screen
  useEffect(() => {
    setNotificationTapHandler(data => {
      if (data.notificationType === 'DOCUMENT_EXPIRING') {
        setDocumentsOpen(true);
      }
    });
  }, []);

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

  if (documentsOpen) {
    if (docFormOpen) {
      return (
        <DocumentFormScreen
          documentId={docFormId ?? undefined}
          locale={locale}
          onBack={() => setDocFormOpen(false)}
          onSuccess={() => { setDocFormOpen(false); }}
        />
      );
    }
    if (selectedDocId) {
      return (
        <DocumentDetailScreen
          documentId={selectedDocId}
          locale={locale}
          onBack={() => setSelectedDocId(null)}
          onEdit={() => { setDocFormId(selectedDocId); setDocFormOpen(true); }}
          onDeleted={() => setSelectedDocId(null)}
        />
      );
    }
    return (
      <AdminDocumentsScreen
        locale={locale}
        onAddPress={() => { setDocFormId(null); setDocFormOpen(true); }}
        onSelectDoc={doc => setSelectedDocId(doc.id)}
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

  // Full-screen driver detail — rendered as overlay inside admin shell (see below)

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

  // Full-screen contract form
  if (contractFormOpen) {
    return (
      <ContractFormScreen
        contractId={contractFormId ?? undefined}
        locale={locale}
        onBack={() => setContractFormOpen(false)}
        onSuccess={() => setContractFormOpen(false)}
      />
    );
  }

  // Full-screen contract detail
  if (selectedContractId) {
    return (
      <ContractDetailScreen
        contractId={selectedContractId}
        locale={locale}
        onBack={() => setSelectedContractId(null)}
        onEdit={() => {
          setContractFormId(selectedContractId);
          setContractFormOpen(true);
        }}
        onSelectTrip={tripId => {
          setSelectedContractId(null);
          setSelectedTripId(tripId);
        }}
      />
    );
  }

  // Full-screen rental form
  if (rentalFormOpen) {
    return (
      <RentalFormScreen
        rentalId={rentalFormId ?? undefined}
        locale={locale}
        onBack={() => setRentalFormOpen(false)}
        onSuccess={() => setRentalFormOpen(false)}
      />
    );
  }

  // Full-screen rental detail
  if (selectedRentalId) {
    return (
      <RentalDetailScreen
        rentalId={selectedRentalId}
        locale={locale}
        onBack={() => setSelectedRentalId(null)}
        onEdit={() => {
          setRentalFormId(selectedRentalId);
          setRentalFormOpen(true);
        }}
      />
    );
  }

  // Full-screen maintenance form
  if (maintenanceFormOpen) {
    return (
      <MaintenanceFormScreen
        maintenanceId={maintenanceFormId ?? undefined}
        locale={locale}
        onBack={() => setMaintenanceFormOpen(false)}
        onSuccess={() => setMaintenanceFormOpen(false)}
      />
    );
  }

  // Full-screen maintenance detail
  if (selectedMaintenanceId) {
    return (
      <MaintenanceDetailScreen
        maintenanceId={selectedMaintenanceId}
        locale={locale}
        onBack={() => setSelectedMaintenanceId(null)}
        onEdit={() => {
          setMaintenanceFormId(selectedMaintenanceId);
          setMaintenanceFormOpen(true);
        }}
        onDeleted={() => setSelectedMaintenanceId(null)}
      />
    );
  }

  // Full-screen maintenance list
  if (maintenanceOpen) {
    return (
      <AdminMaintenanceScreen
        locale={locale}
        onBack={() => setMaintenanceOpen(false)}
        onSelectItem={id => setSelectedMaintenanceId(id)}
        onAddPress={() => { setMaintenanceFormId(null); setMaintenanceFormOpen(true); }}
      />
    );
  }

  // Full-screen vehicle detail (hides tab bar)
  // NOTE: rendered as overlay inside admin shell instead (see below) so fleet screen stays mounted

  // ── Maintenance Tech shell ────────────────────────────────────────────────────
  if (user?.role === 'MAINTENANCE_TECH') {
    return (
      <View style={styles.shell}>
        <View style={styles.screenArea}>
          {techTab === 'maintenance' && (
            <AdminMaintenanceScreen
              locale={locale}
              onBack={() => setTechTab('profile')}
              onSelectItem={id => setSelectedMaintenanceId(id)}
              onAddPress={() => { setMaintenanceFormId(null); setMaintenanceFormOpen(true); }}
            />
          )}
          {techTab === 'profile' && (
            <ProfileScreen locale={locale} onSetLocale={setLocale} onBack={() => setTechTab('maintenance')} />
          )}
        </View>
        <BottomTabBar
          tabs={MAINTENANCE_TECH_TABS}
          activeKey={techTab}
          locale={locale}
          onPress={k => setTechTab(k as MaintenanceTechTab)}
        />
      </View>
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

    // Driver doc form (full-screen)
    if (driverDocFormOpen) {
      return (
        <DocumentFormScreen
          locale={locale}
          documentId={driverDocFormId ?? undefined}
          driverOnly
          onBack={() => { setDriverDocFormOpen(false); setDriverDocFormId(null); }}
          onSuccess={() => { setDriverDocFormOpen(false); setDriverDocFormId(null); }}
        />
      );
    }

    // Driver doc detail (full-screen)
    if (driverSelectedDocId) {
      return (
        <DocumentDetailScreen
          locale={locale}
          documentId={driverSelectedDocId}
          driverView
          onBack={() => setDriverSelectedDocId(null)}
          onDeleted={() => setDriverSelectedDocId(null)}
          onEdit={() => {
            const id = driverSelectedDocId;
            setDriverSelectedDocId(null);
            setDriverDocFormId(id);
            setDriverDocFormOpen(true);
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
            />
          )}
          {driverTab === 'documents' && (
            <DriverDocumentsScreen
              locale={locale}
              onSelectDoc={id => setDriverSelectedDocId(id)}
              onAddPress={() => { setDriverDocFormId(null); setDriverDocFormOpen(true); }}
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
  const canSeeAuditLog = user?.role === 'FLEET_MANAGER' || user?.role === 'DISPATCHER' || user?.role === 'SUPER_ADMIN';
  const activeAdminTabs = canSeeAuditLog ? ADMIN_AUDIT_TABS : ADMIN_TABS;

  return (
    <View style={styles.shell}>
      <View style={styles.screenArea}>
        {adminTab === 'dashboard'     && <AdminDashboardScreen locale={locale} onSelectTrip={setSelectedTripId} onNotificationsPress={() => setNotificationsOpen(true)} unreadNotifications={unreadNotifications} />}
        {/* Fleet screen is always kept mounted when tab is active so scroll position survives navigation */}
        {adminTab === 'fleet'          && <AdminFleetScreen      locale={locale} onSelectVehicle={setSelectedVehicleId} onSelectDriver={setSelectedDriverId} onAddVehicle={() => { setVehicleFormId(null); setVehicleFormOpen(true); }} onAddDriver={() => { setDriverFormId(null); setDriverFormOpen(true); }} onMaintenancePress={() => setMaintenanceOpen(true)} initialSegment={fleetSegment} initialSearch={fleetSearch} onStateChange={(seg, q) => { setFleetSegment(seg); setFleetSearch(q); }} initialVehicleScroll={fleetVehicleScroll} initialDriverScroll={fleetDriverScroll} onScrollChange={(seg, offset) => { if (seg === 'vehicles') setFleetVehicleScroll(offset); else setFleetDriverScroll(offset); }} />}
        {adminTab === 'trips'          && <AdminTripsScreen      locale={locale} onSelectTrip={setSelectedTripId} onAddTrip={() => { setTripFormId(null); setTripFormOpen(true); }} onSelectContract={setSelectedContractId} onAddContract={() => { setContractFormId(null); setContractFormOpen(true); setTripsHubSegment('contracts'); }} onSelectRental={setSelectedRentalId} onAddRental={() => { setRentalFormId(null); setRentalFormOpen(true); setTripsHubSegment('rentals'); }} segment={tripsHubSegment} onSegmentChange={setTripsHubSegment} />}
        {adminTab === 'documents'      && <AdminDocumentsScreen   locale={locale} onAddPress={() => { setDocFormId(null); setDocFormOpen(true); }} onSelectDoc={doc => setSelectedDocId(doc.id)} />}
        {adminTab === 'audit'          && <AuditLogScreen locale={locale} />}
        {adminTab === 'profile'        && <ProfileScreen locale={locale} onSetLocale={setLocale} onBack={() => setAdminTab('dashboard')} />}
      </View>
      <BottomTabBar
        tabs={activeAdminTabs}
        activeKey={adminTab}
        locale={locale}
        onPress={k => setAdminTab(k as AdminTab)}
      />
      {/* Vehicle / driver detail overlays — rendered on top so fleet screen stays mounted */}
      {selectedVehicleId && (
        <View style={StyleSheet.absoluteFill}>
          <VehicleDetailScreen
            vehicleId={selectedVehicleId}
            locale={locale}
            onBack={() => setSelectedVehicleId(null)}
            onEdit={() => {
              setVehicleFormId(selectedVehicleId);
              setVehicleFormOpen(true);
            }}
          />
        </View>
      )}
      {selectedDriverId && (
        <View style={StyleSheet.absoluteFill}>
          <DriverDetailScreen
            driverId={selectedDriverId}
            locale={locale}
            onBack={() => setSelectedDriverId(null)}
            onEdit={() => {
              setDriverFormId(selectedDriverId);
              setDriverFormOpen(true);
            }}
          />
        </View>
      )}
      {/* Document detail overlay */}
      {adminTab === 'documents' && selectedDocId && !docFormOpen && (
        <View style={StyleSheet.absoluteFill}>
          <DocumentDetailScreen
            documentId={selectedDocId}
            locale={locale}
            onBack={() => setSelectedDocId(null)}
            onEdit={() => { setDocFormId(selectedDocId); setDocFormOpen(true); }}
            onDeleted={() => setSelectedDocId(null)}
          />
        </View>
      )}
      {/* Document form overlay */}
      {adminTab === 'documents' && docFormOpen && (
        <View style={StyleSheet.absoluteFill}>
          <DocumentFormScreen
            documentId={docFormId ?? undefined}
            locale={locale}
            onBack={() => setDocFormOpen(false)}
            onSuccess={() => { setDocFormOpen(false); setSelectedDocId(null); }}
          />
        </View>
      )}
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

