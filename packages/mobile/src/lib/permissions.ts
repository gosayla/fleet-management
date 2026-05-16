import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Request all permissions the app needs, upfront after login.
 * Should be called once per session (results are cached by Android).
 */
export async function requestAppPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const permissions: string[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.CAMERA,
  ];

  // Android 13+ uses READ_MEDIA_IMAGES instead of READ_EXTERNAL_STORAGE
  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
    // Android 13+ requires explicit runtime permission for notifications
    permissions.push('android.permission.POST_NOTIFICATIONS');
  } else {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  }

  await PermissionsAndroid.requestMultiple(permissions as any[]);
}

/**
 * Ensure camera + media permissions before opening the image picker.
 * Returns true if both are granted.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const camera = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );
  return camera === PermissionsAndroid.RESULTS.GRANTED;
}

export async function ensureMediaPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const perm =
    Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const result = await PermissionsAndroid.request(perm);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
