import React, {useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {AuthProvider, useAuth} from './context/AuthContext';
import {LoginScreen} from './screens/LoginScreen';
import {TripsListScreen} from './screens/TripsListScreen';
import {ActiveTripScreen} from './screens/ActiveTripScreen';
import {Trip} from '@fleet/shared';
import {Locale} from './lib/i18n';

function Navigator() {
  const {user, isLoading} = useAuth();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [locale, setLocale] = useState<Locale>('ar');

  function toggleLocale() {
    setLocale((current) => (current === 'ar' ? 'en' : 'ar'));
  }

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

  return <TripsListScreen locale={locale} onToggleLocale={toggleLocale} onSelectTrip={setActiveTrip} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  );
}
