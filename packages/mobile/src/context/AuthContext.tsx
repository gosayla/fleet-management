import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from '../lib/api';
import {AuthTokenPayload} from '@fleet/shared';
import {initNotifications} from '../lib/notifications';

interface AuthContextType {
  user: AuthTokenPayload | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<AuthTokenPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session
    AsyncStorage.getItem('user').then(raw => {
      if (raw) setUser(JSON.parse(raw) as AuthTokenPayload);
      setIsLoading(false);
    });
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{accessToken: string; user: AuthTokenPayload}>(
      '/auth/login',
      {email, password},
    );
    await AsyncStorage.setItem('accessToken', res.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    // Register FCM token with backend (best-effort)
    initNotifications().then(fcmToken => {
      if (fcmToken) {
        api.post('/notifications/register', {token: fcmToken}).catch(() => {});
      }
    });
  }

  async function logout() {
    await AsyncStorage.multiRemove(['accessToken', 'user']);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{user, isLoading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
