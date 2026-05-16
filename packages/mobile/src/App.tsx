import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  ToastAndroid,
  View,
  StyleSheet,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { TripsListScreen } from './screens/TripsListScreen';
import { ActiveTripScreen } from './screens/ActiveTripScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ProfileEditScreen } from './screens/ProfileEditScreen';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { AdminFleetScreen } from './screens/AdminFleetScreen';
import { AdminTripsScreen } from './screens/AdminTripsScreen';
import { VehicleDetailScreen } from './screens/VehicleDetailScreen';
import { VehicleFormScreen } from './screens/VehicleFormScreen';
import { StaffAssignmentFormScreen } from './screens/StaffAssignmentFormScreen';
import { DriverDetailScreen } from './screens/DriverDetailScreen';
import { DriverFormScreen } from './screens/DriverFormScreen';
import { TripDetailScreen } from './screens/TripDetailScreen';
import { TripFormScreen } from './screens/TripFormScreen';
import { DriverDashboardScreen } from './screens/DriverDashboardScreen';
import { DriverFleetScreen } from './screens/DriverFleetScreen';
import { AdminDocumentsScreen } from './screens/AdminDocumentsScreen';
import { DocumentFormScreen } from './screens/DocumentFormScreen';
import { DocumentDetailScreen } from './screens/DocumentDetailScreen';
import { ContractFormScreen } from './screens/ContractFormScreen';
import { ContractDetailScreen } from './screens/ContractDetailScreen';
import { RentalFormScreen } from './screens/RentalFormScreen';
import { RentalDetailScreen } from './screens/RentalDetailScreen';
import { AdminMaintenanceScreen } from './screens/AdminMaintenanceScreen';
import { MaintenanceFormScreen } from './screens/MaintenanceFormScreen';
import { MaintenanceDetailScreen } from './screens/MaintenanceDetailScreen';
import { AdminFuelScreen } from './screens/AdminFuelScreen';
import { FuelFormScreen } from './screens/FuelFormScreen';
import { DriverDocumentsScreen } from './screens/DriverDocumentsScreen';
import { AuditLogScreen } from './screens/AuditLogScreen';
import { Trip } from '@fleet/shared';
import { Locale } from './lib/i18n';
import { Colors } from './lib/theme';
import { BottomTabBar, TabItem } from './components/ui/BottomTabBar';
import { api } from './lib/api';
import { setNotificationTapHandler } from './lib/notifications';
import { AppAlertHost, setAlertLocale } from './lib/alert';

type DriverTab = 'dashboard' | 'fleet' | 'trips' | 'documents' | 'profile';
type AdminTab = 'dashboard' | 'fleet' | 'trips' | 'documents' | 'profile';
type MaintenanceTechTab = 'maintenance' | 'profile';

// ── Tab config ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const DRIVER_TABS: TabItem[] = [
  {
    key: 'dashboard',
    icon: 'view-grid-outline',
    labels: { ar: 'الرئيسية', en: 'Home', hi: 'होम', bn: 'হোম', ur: 'ہوم' },
  },
  {
    key: 'fleet',
    icon: 'truck-outline',
    labels: {
      ar: 'الأسطول',
      en: 'Fleet',
      hi: 'बेड़ा',
      bn: 'ফ্লিট',
      ur: 'بیڑا',
    },
  },
  {
    key: 'trips',
    icon: 'truck-outline',
    labels: {
      ar: 'رحلاتي',
      en: 'Trips',
      hi: 'यात्राएं',
      bn: 'ট্রিপ',
      ur: 'سفر',
    },
  },
  {
    key: 'documents',
    icon: 'file-document-outline',
    labels: {
      ar: 'وثائقي',
      en: 'My Docs',
      hi: 'दस्तावेज़',
      bn: 'নথি',
      ur: 'دستاویز',
    },
  },
  {
    key: 'profile',
    icon: 'account-outline',
    labels: {
      ar: 'حسابي',
      en: 'Profile',
      hi: 'प्रोफाइल',
      bn: 'প্রোফাইল',
      ur: 'پروفائل',
    },
  },
];

const MAINTENANCE_TECH_TABS: TabItem[] = [
  {
    key: 'maintenance',
    icon: 'wrench',
    labels: {
      ar: 'الصيانة',
      en: 'Maintenance',
      hi: 'रखरखाव',
      bn: 'রক্ষণাবেক্ষণ',
      ur: 'دیکھ بھال',
    },
  },
  {
    key: 'profile',
    icon: 'account-outline',
    labels: {
      ar: 'حسابي',
      en: 'Profile',
      hi: 'प्रोफाइल',
      bn: 'প্রোফাইল',
      ur: 'پروفائل',
    },
  },
];

const ADMIN_TABS: TabItem[] = [
  {
    key: 'dashboard',
    icon: 'view-grid-outline',
    labels: { ar: 'الرئيسية', en: 'Home', hi: 'होम', bn: 'হোম', ur: 'ہوم' },
  },
  {
    key: 'fleet',
    icon: 'truck-outline',
    labels: {
      ar: 'الأسطول',
      en: 'Fleet',
      hi: 'बेड़ा',
      bn: 'ফ্লিট',
      ur: 'بیڑا',
    },
  },
  {
    key: 'trips',
    icon: 'map-marker-path',
    labels: {
      ar: 'الرحلات',
      en: 'Trips',
      hi: 'यात्राएं',
      bn: 'ট্রিপ',
      ur: 'سفر',
    },
  },
  {
    key: 'documents',
    icon: 'file-document-outline',
    labels: {
      ar: 'الوثائق',
      en: 'Docs',
      hi: 'दस्तावेज़',
      bn: 'নথি',
      ur: 'دستاویز',
    },
  },
  {
    key: 'profile',
    icon: 'account-outline',
    labels: {
      ar: 'حسابي',
      en: 'Profile',
      hi: 'प्रोफाइल',
      bn: 'প্রোফাইল',
      ur: 'پروفائل',
    },
  },
];

const EXIT_HINT: Record<Locale, string> = {
  ar: 'اضغط رجوع مرة أخرى للخروج',
  en: 'Press back again to exit',
  hi: 'बाहर निकलने के लिए फिर से बैक दबाएं',
  bn: 'অ্যাপ থেকে বের হতে আবার ব্যাক চাপুন',
  ur: 'ایپ سے نکلنے کے لیے دوبارہ بیک دبائیں',
};

function Navigator() {
  const { user, isLoading } = useAuth();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [activeTripMinimized, setActiveTripMinimized] = useState(false);
  const [locale, setLocaleState] = useState<Locale>('ar');
  const userLanguage = (user as { language?: string } | null)?.language;

  // Load persisted locale on startup
  useEffect(() => {
    setAlertLocale(locale);
  }, [locale]);

  useEffect(() => {
    AsyncStorage.getItem('@locale').then((saved) => {
      if (
        saved &&
        (['ar', 'en', 'hi', 'bn', 'ur'] as string[]).includes(saved)
      ) {
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
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [vehicleFormId, setVehicleFormId] = useState<string | null>(null);
  // Staff assignment form
  const [staffAssignFormOpen, setStaffAssignFormOpen] = useState(false);
  const [staffAssignVehicleId, setStaffAssignVehicleId] = useState<string | null>(null);
  const [staffAssignMode, setStaffAssignMode] = useState<'assign' | 'return'>('assign');
  const [staffAssignAssignmentId, setStaffAssignAssignmentId] = useState<string | null>(null);
  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [driverFormId, setDriverFormId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [tripFormId, setTripFormId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  // Documents screen
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docFormOpen, setDocFormOpen] = useState(false);
  const [docFormId, setDocFormId] = useState<string | null>(null);
  // Contracts (trips tab sub-nav)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null
  );
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [contractFormId, setContractFormId] = useState<string | null>(null);
  // Rentals (trips tab sub-nav)
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [rentalFormOpen, setRentalFormOpen] = useState(false);
  const [rentalFormId, setRentalFormId] = useState<string | null>(null);
  // Trips hub persisted segment (so back from contract/rental form returns to correct tab)
  const [tripsHubSegment, setTripsHubSegment] = useState<
    'trips' | 'contracts' | 'rentals'
  >('trips');
  // Maintenance
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<
    string | null
  >(null);
  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false);
  const [maintenanceFormId, setMaintenanceFormId] = useState<string | null>(
    null
  );
  const [fuelOpen, setFuelOpen] = useState(false);
  const [fuelFormOpen, setFuelFormOpen] = useState(false);
  // Audit log
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  // Fleet screen persisted state
  const [fleetSegment, setFleetSegment] = useState<'drivers' | 'vehicles'>(
    'vehicles'
  );
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetVehicleScroll, setFleetVehicleScroll] = useState(0);
  const [fleetDriverScroll, setFleetDriverScroll] = useState(0);
  // Driver trip detail (separate from admin selectedTripId so back nav is scoped)
  const [driverViewTripId, setDriverViewTripId] = useState<string | null>(null);
  // Driver documents
  const [driverDocFormOpen, setDriverDocFormOpen] = useState(false);
  const [driverDocFormId, setDriverDocFormId] = useState<string | null>(null);
  const [driverSelectedDocId, setDriverSelectedDocId] = useState<string | null>(
    null
  );
  const lastBackPressAtRef = useRef(0);

  // Sync app locale from the user's saved language preference on every login/change
  useEffect(() => {
    if (
      userLanguage &&
      (['ar', 'en', 'hi', 'bn', 'ur'] as string[]).includes(userLanguage)
    ) {
      setLocale(userLanguage as Locale);
    }
  }, [userLanguage]);

  const isAdmin =
    user && user.role !== 'DRIVER' && user.role !== 'MAINTENANCE_TECH';

  async function openDriverTripById(tripId: string) {
    try {
      const trip = await api.get<Trip>(`/trips/${tripId}`);
      setActiveTripMinimized(false);
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

    async function loadUnreadNotificationsCount() {
      try {
        const items = await api.get<Array<{ isRead: boolean }>>(
          '/notifications'
        );
        setUnreadNotifications(items.filter((n) => !n.isRead).length);
      } catch {
        // Notifications endpoint may be unavailable temporarily.
      }
    }

    loadUnreadNotificationsCount();
  }, [user]);

  // Register FCM notification tap handler â€” navigates to documents screen
  useEffect(() => {
    setNotificationTapHandler((data) => {
      if (data.notificationType === 'DOCUMENT_EXPIRING') {
        setDocumentsOpen(true);
      }
    });
  }, []);

  // Android hardware back: pop nested screen state before allowing app exit.
  useEffect(() => {
    const onHardwareBackPress = () => {
      if (!user) {
        return false;
      }

      if (activeTrip && !activeTripMinimized) {
        setActiveTripMinimized(true);
        return true;
      }

      if (profileEditOpen) {
        setProfileEditOpen(false);
        return true;
      }

      if (notificationsOpen) {
        setNotificationsOpen(false);
        return true;
      }

      if (auditLogOpen) {
        setAuditLogOpen(false);
        return true;
      }

      if (vehicleFormOpen) {
        setVehicleFormOpen(false);
        return true;
      }

      if (staffAssignFormOpen) {
        setStaffAssignFormOpen(false);
        return true;
      }

      if (driverFormOpen) {
        setDriverFormOpen(false);
        return true;
      }

      if (tripFormOpen) {
        setTripFormOpen(false);
        return true;
      }

      if (selectedTripId) {
        setSelectedTripId(null);
        return true;
      }

      if (contractFormOpen) {
        setContractFormOpen(false);
        return true;
      }

      if (selectedContractId) {
        setSelectedContractId(null);
        return true;
      }

      if (rentalFormOpen) {
        setRentalFormOpen(false);
        return true;
      }

      if (selectedRentalId) {
        setSelectedRentalId(null);
        return true;
      }

      if (maintenanceFormOpen) {
        setMaintenanceFormOpen(false);
        return true;
      }

      if (fuelFormOpen) {
        setFuelFormOpen(false);
        return true;
      }

      if (selectedMaintenanceId) {
        setSelectedMaintenanceId(null);
        return true;
      }

      if (fuelOpen) {
        setFuelOpen(false);
        return true;
      }

      if (maintenanceOpen) {
        setMaintenanceOpen(false);
        return true;
      }

      // Driver nested flows
      if (driverViewTripId) {
        setDriverViewTripId(null);
        return true;
      }

      if (driverDocFormOpen) {
        setDriverDocFormOpen(false);
        setDriverDocFormId(null);
        return true;
      }

      if (driverSelectedDocId) {
        setDriverSelectedDocId(null);
        return true;
      }

      // Admin overlays (fleet/documents)
      if (selectedVehicleId) {
        setSelectedVehicleId(null);
        return true;
      }

      if (selectedDriverId) {
        setSelectedDriverId(null);
        return true;
      }

      if (docFormOpen) {
        setDocFormOpen(false);
        return true;
      }

      if (selectedDocId) {
        setSelectedDocId(null);
        return true;
      }

      if (documentsOpen) {
        setDocumentsOpen(false);
        return true;
      }

      // Shell tab fallback
      if (user.role === 'MAINTENANCE_TECH') {
        if (techTab !== 'maintenance') {
          setTechTab('maintenance');
          return true;
        }
        return false;
      }

      if (user.role === 'DRIVER') {
        if (driverTab !== 'dashboard') {
          setDriverTab('dashboard');
          return true;
        }
        return false;
      }

      if (adminTab !== 'dashboard') {
        setAdminTab('dashboard');
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressAtRef.current < 2000) {
        return false;
      }
      lastBackPressAtRef.current = now;
      ToastAndroid.show(EXIT_HINT[locale] ?? EXIT_HINT.en, ToastAndroid.SHORT);
      return true;
    };

    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress
    );
    return () => sub.remove();
  }, [
    user,
    locale,
    activeTrip,
    activeTripMinimized,
    notificationsOpen,
    auditLogOpen,
    vehicleFormOpen,
    staffAssignFormOpen,
    driverFormOpen,
    tripFormOpen,
    selectedTripId,
    contractFormOpen,
    selectedContractId,
    rentalFormOpen,
    selectedRentalId,
    maintenanceFormOpen,
    fuelFormOpen,
    selectedMaintenanceId,
    fuelOpen,
    maintenanceOpen,
    driverViewTripId,
    driverDocFormOpen,
    driverSelectedDocId,
    selectedVehicleId,
    selectedDriverId,
    docFormOpen,
    selectedDocId,
    documentsOpen,
    profileEditOpen,
    techTab,
    driverTab,
    adminTab,
  ]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <View style={styles.loaderIcon}>
          <Image
            source={require('./assets/app_logo.png')}
            style={styles.loaderLogo}
            resizeMode="contain"
            accessibilityLabel="App logo"
          />
        </View>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loaderSpinner}
        />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen locale={locale} onSetLocale={setLocale} />;
  }

  function renderWithActiveTripOverlay(content: React.ReactElement) {
    if (!activeTrip) {
      return content;
    }

    return (
      <View style={styles.overlayHost}>
        {content}
        <ActiveTripScreen
          trip={activeTrip}
          locale={locale}
          minimized={activeTripMinimized}
          onMinimize={() => setActiveTripMinimized(true)}
          onRestore={() => setActiveTripMinimized(false)}
          onComplete={() => {
            setActiveTrip(null);
            setActiveTripMinimized(false);
          }}
          onBack={() => {
            setActiveTrip(null);
            setActiveTripMinimized(false);
          }}
        />
      </View>
    );
  }

  if (notificationsOpen) {
    return renderWithActiveTripOverlay(
      <NotificationsScreen
        locale={locale}
        onBack={() => setNotificationsOpen(false)}
        onUnreadCountChange={setUnreadNotifications}
      />
    );
  }

  if (documentsOpen) {
    if (docFormOpen) {
      return renderWithActiveTripOverlay(
        <DocumentFormScreen
          documentId={docFormId ?? undefined}
          locale={locale}
          onBack={() => setDocFormOpen(false)}
          onSuccess={() => {
            setDocFormOpen(false);
          }}
        />
      );
    }
    if (selectedDocId) {
      return renderWithActiveTripOverlay(
        <DocumentDetailScreen
          documentId={selectedDocId}
          locale={locale}
          onBack={() => setSelectedDocId(null)}
          onEdit={() => {
            setDocFormId(selectedDocId);
            setDocFormOpen(true);
          }}
          onDeleted={() => setSelectedDocId(null)}
        />
      );
    }
    return renderWithActiveTripOverlay(
      <AdminDocumentsScreen
        locale={locale}
        onAddPress={() => {
          setDocFormId(null);
          setDocFormOpen(true);
        }}
        onSelectDoc={(doc) => setSelectedDocId(doc.id)}
      />
    );
  }

  // Full-screen vehicle form (hides tab bar)
  if (vehicleFormOpen) {
    return renderWithActiveTripOverlay(
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
    return renderWithActiveTripOverlay(
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

  // Full-screen driver detail â€” rendered as overlay inside admin shell (see below)

  // Full-screen trip form
  if (tripFormOpen) {
    return renderWithActiveTripOverlay(
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
    return renderWithActiveTripOverlay(
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
    return renderWithActiveTripOverlay(
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
    return renderWithActiveTripOverlay(
      <ContractDetailScreen
        contractId={selectedContractId}
        locale={locale}
        onBack={() => setSelectedContractId(null)}
        onEdit={() => {
          setContractFormId(selectedContractId);
          setContractFormOpen(true);
        }}
        onSelectTrip={(tripId) => {
          setSelectedContractId(null);
          setSelectedTripId(tripId);
        }}
      />
    );
  }

  // Full-screen rental form
  if (rentalFormOpen) {
    return renderWithActiveTripOverlay(
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
    return renderWithActiveTripOverlay(
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
    return renderWithActiveTripOverlay(
      <MaintenanceFormScreen
        maintenanceId={maintenanceFormId ?? undefined}
        locale={locale}
        onBack={() => setMaintenanceFormOpen(false)}
        onSuccess={() => setMaintenanceFormOpen(false)}
      />
    );
  }

  if (fuelFormOpen) {
    return renderWithActiveTripOverlay(
      <FuelFormScreen
        locale={locale}
        onBack={() => setFuelFormOpen(false)}
        onSuccess={() => setFuelFormOpen(false)}
      />
    );
  }

  // Full-screen maintenance detail
  if (selectedMaintenanceId) {
    return renderWithActiveTripOverlay(
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
    return renderWithActiveTripOverlay(
      <AdminMaintenanceScreen
        locale={locale}
        onBack={() => setMaintenanceOpen(false)}
        onSelectItem={(id) => setSelectedMaintenanceId(id)}
        onAddPress={() => {
          setMaintenanceFormId(null);
          setMaintenanceFormOpen(true);
        }}
      />
    );
  }

  if (fuelOpen) {
    return renderWithActiveTripOverlay(
      <AdminFuelScreen
        locale={locale}
        onBack={() => setFuelOpen(false)}
        onAddPress={() => setFuelFormOpen(true)}
      />
    );
  }

  // Full-screen vehicle detail (hides tab bar)
  // NOTE: rendered as overlay inside admin shell instead (see below) so fleet screen stays mounted

  // Maintenance Tech shell
  if (user?.role === 'MAINTENANCE_TECH') {
    if (profileEditOpen) {
      return renderWithActiveTripOverlay(
        <ProfileEditScreen
          locale={locale}
          onBack={() => setProfileEditOpen(false)}
          onSuccess={() => setProfileEditOpen(false)}
        />
      );
    }

    return renderWithActiveTripOverlay(
      <View style={styles.shell}>
        <View style={styles.screenArea}>
          {techTab === 'maintenance' && (
            <AdminMaintenanceScreen
              locale={locale}
              onBack={() => setTechTab('profile')}
              onSelectItem={(id) => setSelectedMaintenanceId(id)}
              onAddPress={() => {
                setMaintenanceFormId(null);
                setMaintenanceFormOpen(true);
              }}
            />
          )}
          {techTab === 'profile' && (
            <ProfileScreen
              locale={locale}
              onSetLocale={setLocale}
              onBack={() => setTechTab('maintenance')}
              onEditProfile={() => setProfileEditOpen(true)}
            />
          )}
        </View>
        <BottomTabBar
          tabs={MAINTENANCE_TECH_TABS}
          activeKey={techTab}
          locale={locale}
          onPress={(k) => setTechTab(k as MaintenanceTechTab)}
        />
      </View>
    );
  }

  // Driver shell
  if (!isAdmin) {
    if (profileEditOpen) {
      return renderWithActiveTripOverlay(
        <ProfileEditScreen
          locale={locale}
          onBack={() => setProfileEditOpen(false)}
          onSuccess={() => setProfileEditOpen(false)}
        />
      );
    }

    // Driver trip detail view
    if (driverViewTripId) {
      return renderWithActiveTripOverlay(
        <TripDetailScreen
          tripId={driverViewTripId}
          locale={locale}
          onBack={() => setDriverViewTripId(null)}
          onStartTrip={(trip) => {
            setDriverViewTripId(null);
            openDriverTripById(trip.id);
          }}
        />
      );
    }

    // Driver doc form (full-screen)
    if (driverDocFormOpen) {
      return renderWithActiveTripOverlay(
        <DocumentFormScreen
          locale={locale}
          documentId={driverDocFormId ?? undefined}
          driverOnly
          onBack={() => {
            setDriverDocFormOpen(false);
            setDriverDocFormId(null);
          }}
          onSuccess={() => {
            setDriverDocFormOpen(false);
            setDriverDocFormId(null);
          }}
        />
      );
    }

    // Driver doc detail (full-screen)
    if (driverSelectedDocId) {
      return renderWithActiveTripOverlay(
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

    return renderWithActiveTripOverlay(
      <View style={styles.shell}>
        <View style={styles.screenArea}>
          {driverTab === 'dashboard' && (
            <DriverDashboardScreen
              locale={locale}
              onNotificationsPress={() => setNotificationsOpen(true)}
              unreadNotifications={unreadNotifications}
              onSelectTrip={setDriverViewTripId}
              onStartTrip={(trip) => openDriverTripById(trip.id)}
            />
          )}
          {driverTab === 'trips' && (
            <TripsListScreen
              locale={locale}
              onSelectTrip={(trip) => setDriverViewTripId(trip.id)}
            />
          )}
          {driverTab === 'fleet' && <DriverFleetScreen locale={locale} />}
          {driverTab === 'documents' && (
            <DriverDocumentsScreen
              locale={locale}
              onSelectDoc={(id) => setDriverSelectedDocId(id)}
              onAddPress={() => {
                setDriverDocFormId(null);
                setDriverDocFormOpen(true);
              }}
            />
          )}
          {driverTab === 'profile' && (
            <ProfileScreen
              locale={locale}
              onSetLocale={setLocale}
              onBack={() => setDriverTab('dashboard')}
              onEditProfile={() => setProfileEditOpen(true)}
            />
          )}
        </View>
        <BottomTabBar
          tabs={DRIVER_TABS}
          activeKey={driverTab}
          locale={locale}
          onPress={(k) => setDriverTab(k as DriverTab)}
        />
      </View>
    );
  }

  // ── Admin shell
  const canSeeAuditLog =
    user?.role === 'FLEET_MANAGER' ||
    user?.role === 'DISPATCHER' ||
    user?.role === 'SUPER_ADMIN';

  // Full-screen audit log (opened from Profile screen)
  if (auditLogOpen) {
    return renderWithActiveTripOverlay(
      <AuditLogScreen locale={locale} onBack={() => setAuditLogOpen(false)} />
    );
  }

  if (profileEditOpen) {
    return renderWithActiveTripOverlay(
      <ProfileEditScreen
        locale={locale}
        onBack={() => setProfileEditOpen(false)}
        onSuccess={() => setProfileEditOpen(false)}
      />
    );
  }

  return renderWithActiveTripOverlay(
    <View style={styles.shell}>
      <View style={styles.screenArea}>
        {adminTab === 'dashboard' && (
          <AdminDashboardScreen
            locale={locale}
            onSelectTrip={setSelectedTripId}
            onNotificationsPress={() => setNotificationsOpen(true)}
            unreadNotifications={unreadNotifications}
          />
        )}
        {/* Fleet screen is always kept mounted when tab is active so scroll position survives navigation */}
        {adminTab === 'fleet' && (
          <AdminFleetScreen
            locale={locale}
            onSelectVehicle={setSelectedVehicleId}
            onSelectDriver={setSelectedDriverId}
            onAddVehicle={() => {
              setVehicleFormId(null);
              setVehicleFormOpen(true);
            }}
            onAddDriver={() => {
              setDriverFormId(null);
              setDriverFormOpen(true);
            }}
            onMaintenancePress={() => setMaintenanceOpen(true)}
            onFuelPress={() => setFuelOpen(true)}
            initialSegment={fleetSegment}
            initialSearch={fleetSearch}
            onStateChange={(seg, q) => {
              setFleetSegment(seg);
              setFleetSearch(q);
            }}
            initialVehicleScroll={fleetVehicleScroll}
            initialDriverScroll={fleetDriverScroll}
            onScrollChange={(seg, offset) => {
              if (seg === 'vehicles') {
                setFleetVehicleScroll(offset);
              } else {
                setFleetDriverScroll(offset);
              }
            }}
          />
        )}
        {adminTab === 'trips' && (
          <AdminTripsScreen
            locale={locale}
            onSelectTrip={setSelectedTripId}
            onAddTrip={() => {
              setTripFormId(null);
              setTripFormOpen(true);
            }}
            onSelectContract={setSelectedContractId}
            onAddContract={() => {
              setContractFormId(null);
              setContractFormOpen(true);
              setTripsHubSegment('contracts');
            }}
            onSelectRental={setSelectedRentalId}
            onAddRental={() => {
              setRentalFormId(null);
              setRentalFormOpen(true);
              setTripsHubSegment('rentals');
            }}
            segment={tripsHubSegment}
            onSegmentChange={setTripsHubSegment}
          />
        )}
        {adminTab === 'documents' && (
          <AdminDocumentsScreen
            locale={locale}
            onAddPress={() => {
              setDocFormId(null);
              setDocFormOpen(true);
            }}
            onSelectDoc={(doc) => setSelectedDocId(doc.id)}
          />
        )}
        {adminTab === 'profile' && (
          <ProfileScreen
            locale={locale}
            onSetLocale={setLocale}
            onBack={() => setAdminTab('dashboard')}
            onAuditLogPress={
              canSeeAuditLog ? () => setAuditLogOpen(true) : undefined
            }
            onEditProfile={() => setProfileEditOpen(true)}
          />
        )}
      </View>
      <BottomTabBar
        tabs={ADMIN_TABS}
        activeKey={adminTab}
        locale={locale}
        onPress={(k) => setAdminTab(k as AdminTab)}
      />
      {/* Vehicle / driver detail overlays ─ rendered on top so fleet screen stays mounted */}
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
            onAssignStaff={() => {
              setStaffAssignVehicleId(selectedVehicleId);
              setStaffAssignMode('assign');
              setStaffAssignAssignmentId(null);
              setStaffAssignFormOpen(true);
            }}
            onReturnStaff={(assignmentId) => {
              setStaffAssignVehicleId(selectedVehicleId);
              setStaffAssignMode('return');
              setStaffAssignAssignmentId(assignmentId);
              setStaffAssignFormOpen(true);
            }}
          />
          {staffAssignFormOpen && staffAssignVehicleId && (
            <View style={StyleSheet.absoluteFill}>
              <StaffAssignmentFormScreen
                mode={staffAssignMode}
                vehicleId={staffAssignVehicleId}
                assignmentId={staffAssignAssignmentId ?? undefined}
                locale={locale}
                onBack={() => setStaffAssignFormOpen(false)}
                onSuccess={() => {
                  setStaffAssignFormOpen(false);
                  // VehicleDetailScreen will re-fetch on its own when re-opened;
                  // force a refresh by briefly clearing and resetting selectedVehicleId
                  const vid = selectedVehicleId;
                  setSelectedVehicleId(null);
                  setTimeout(() => setSelectedVehicleId(vid), 50);
                }}
              />
            </View>
          )}
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
            onEdit={() => {
              setDocFormId(selectedDocId);
              setDocFormOpen(true);
            }}
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
            onSuccess={() => {
              setDocFormOpen(false);
              setSelectedDocId(null);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  loaderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderLogo: { width: 44, height: 44 },
  loaderSpinner: { marginTop: 24 },
  overlayHost: { flex: 1 },
  shell: { flex: 1, backgroundColor: Colors.bg },
  screenArea: { flex: 1 },
  appRoot: { flex: 1 },
});

export default function App() {
  return (
    <AuthProvider>
      <View style={styles.appRoot}>
        <Navigator />
        <AppAlertHost />
      </View>
    </AuthProvider>
  );
}
