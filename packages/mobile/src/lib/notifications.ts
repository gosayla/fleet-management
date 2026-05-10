/**
 * Firebase Cloud Messaging helper.
 *
 * Call `initNotifications()` once on app start (inside AuthProvider after login).
 * Requires:
 *   - google-services.json placed in packages/mobile/android/app/
 *   - @react-native-firebase/app and @react-native-firebase/messaging installed
 */
import messaging from '@react-native-firebase/messaging';
import {Alert, Platform} from 'react-native';

export interface NotificationTapData {
  notificationType?: string;
  referenceId?: string;
  [key: string]: string | undefined;
}

let _onNotificationTap: ((data: NotificationTapData) => void) | null = null;

/** Register a handler that fires whenever the user taps a push notification. */
export function setNotificationTapHandler(handler: (data: NotificationTapData) => void) {
  _onNotificationTap = handler;
}

export async function initNotifications(): Promise<string | null> {
  try {
    // Request permission (iOS asks, Android 13+ asks)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    // Get FCM token to send to backend
    const token = await messaging().getToken();

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      const title = remoteMessage.notification?.title ?? 'Fleet';
      const body = remoteMessage.notification?.body ?? '';
      Alert.alert(title, body);
    });

    // Handle background/quit tap — app was opened from notification
    messaging().onNotificationOpenedApp(remoteMessage => {
      if (_onNotificationTap && remoteMessage.data) {
        _onNotificationTap(remoteMessage.data as NotificationTapData);
      }
    });

    // Check if app was opened from a quit-state notification
    const initial = await messaging().getInitialNotification();
    if (initial?.data && _onNotificationTap) {
      _onNotificationTap(initial.data as NotificationTapData);
    }

    return token;
  } catch {
    // Firebase not configured (missing google-services.json) — skip silently
    return null;
  }
}
