import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { AuthTokenPayload } from '@fleet/shared';
import { initNotifications } from '../lib/notifications';

interface AuthContextType {
  user: AuthTokenPayload | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  updateLanguage: (language: 'ar' | 'en' | 'hi' | 'bn' | 'ur') => Promise<void>;
  updateProfile: (payload: {
    fullName?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthTokenPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function clearSession() {
    await AsyncStorage.multiRemove(['accessToken', 'user']);
    setUser(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const [token, rawUser] = await AsyncStorage.multiGet([
          'accessToken',
          'user',
        ]).then((entries) => entries.map(([, value]) => value));

        if (!token || !rawUser) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const currentUser = await api.get<AuthTokenPayload>('/auth/me');

        if (!cancelled) {
          await AsyncStorage.setItem('user', JSON.stringify(currentUser));
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          await clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(phone: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthTokenPayload }>(
      '/auth/login',
      { phone, password }
    );
    await AsyncStorage.setItem('accessToken', res.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    // Register FCM token with backend (best-effort, silently skip if Firebase not configured)
    initNotifications()
      .then((fcmToken) => {
        if (fcmToken) {
          api.patch('/auth/fcm-token', { fcmToken }).catch(() => {});
        }
      })
      .catch(() => {});
  }

  async function logout() {
    await clearSession();
  }

  async function updateLanguage(language: 'ar' | 'en' | 'hi' | 'bn' | 'ur') {
    const updatedUser = await api.patch<AuthTokenPayload>('/auth/language', {
      language,
    });
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }

  async function updateProfile(payload: {
    fullName?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    const updatedProfile = await api.patch<Partial<AuthTokenPayload>>(
      '/settings/profile',
      payload
    );
    setUser((current) => {
      if (!current) {
        return current;
      }
      const nextUser = { ...current, ...updatedProfile };
      AsyncStorage.setItem('user', JSON.stringify(nextUser)).catch(() => {});
      return nextUser;
    });
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, updateLanguage, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
