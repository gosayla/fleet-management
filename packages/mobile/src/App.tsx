import React, {useState} from 'react';
import {ActivityIndicator, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {AuthProvider, useAuth} from './context/AuthContext';
import {LoginScreen} from './screens/LoginScreen';
import {TripsListScreen} from './screens/TripsListScreen';
import {ActiveTripScreen} from './screens/ActiveTripScreen';
import {NotificationsScreen} from './screens/NotificationsScreen';
import {ProfileScreen} from './screens/ProfileScreen';
import {Trip} from '@fleet/shared';
import {Locale, t} from './lib/i18n';

type Tab = 'trips' | 'notifications' | 'profile';

function Navigator() {
  const {user, isLoading} = useAuth();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [locale, setLocale] = useState<Locale>('ar');
  const [tab, setTab] = useState<Tab>('trips');

  function toggleLocale() {
    setLocale((current) => (current === 'ar' ? 'en' : 'ar'));
  }

  const i18n = t(locale);

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) return <LoginScreen locale={locale} onToggleLocale={toggleLocale} />;

  if (activeTrip) {
    return (
      <ActiveTripScreen
        trip={activeTrip}
        locale={locale}
        onToggleLocale={toggleLocale}
        onComplete={() => setActiveTrip(null)}
      />
    );
  }

  if (tab === 'notifications') {
    return (
      <NotificationsScreen
        locale={locale}
        onToggleLocale={toggleLocale}
        onBack={() => setTab('trips')}
      />
    );
  }

  if (tab === 'profile') {
    return (
      <ProfileScreen
        locale={locale}
        onToggleLocale={toggleLocale}
        onBack={() => setTab('trips')}
      />
    );
  }

  return (
    <View style={{flex: 1}}>
      <TripsListScreen locale={locale} onToggleLocale={toggleLocale} onSelectTrip={setActiveTrip} />
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('trips')}>
          <Text style={[styles.tabIcon, tab === 'trips' && styles.tabIconActive]}>🚗</Text>
          <Text style={[styles.tabLabel, tab === 'trips' && styles.tabLabelActive]}>
            {i18n.myTrips}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('notifications')}>
          <Text style={[styles.tabIcon, tab === 'notifications' && styles.tabIconActive]}>🔔</Text>
          <Text style={[styles.tabLabel, tab === 'notifications' && styles.tabLabelActive]}>
            {i18n.notifications}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('profile')}>
          <Text style={[styles.tabIcon, tab === 'profile' && styles.tabIconActive]}>👤</Text>
          <Text style={[styles.tabLabel, tab === 'profile' && styles.tabLabelActive]}>
            {i18n.profile}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingBottom: 8,
  },
  tabItem: {flex: 1, alignItems: 'center', paddingTop: 10, gap: 2},
  tabIcon: {fontSize: 22},
  tabIconActive: {},
  tabLabel: {fontSize: 11, color: '#9ca3af'},
  tabLabelActive: {color: '#2563eb', fontWeight: '600'},
});

export default function App() {
  return (
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  );
}
