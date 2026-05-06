export type Locale = 'ar' | 'en';

const messages = {
  ar: {
    appName: 'فليت إس إيه',
    subtitle: 'إدارة الأسطول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول...',
    loginErrorTitle: 'فشل تسجيل الدخول',
    loginErrorMessage: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    formErrorTitle: 'خطأ',
    formErrorMessage: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
    myTrips: 'رحلاتي',
    noTrips: 'لا توجد رحلات مخصصة',
    vehicle: 'المركبة',
    gpsActive: 'تتبع GPS نشط',
    startTrip: 'بدء الرحلة',
    completeTrip: 'إنهاء الرحلة',
    completeTripTitle: 'إنهاء الرحلة',
    completeTripConfirm: 'هل تريد تحديد هذه الرحلة كمكتملة؟',
    cancel: 'إلغاء',
    complete: 'إنهاء',
    languageLabel: 'English',
    notifications: 'الإشعارات',
    noNotifications: 'لا توجد إشعارات',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    logoutTitle: 'تسجيل الخروج',
    logoutConfirm: 'هل تريد تسجيل الخروج؟',
  },
  en: {
    appName: 'FleetSA',
    subtitle: 'Fleet Management',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    loginErrorTitle: 'Login failed',
    loginErrorMessage: 'Invalid email or password',
    formErrorTitle: 'Error',
    formErrorMessage: 'Please enter email and password',
    myTrips: 'My Trips',
    noTrips: 'No trips assigned',
    vehicle: 'Vehicle',
    gpsActive: 'GPS Active',
    startTrip: 'Start Trip',
    completeTrip: 'Complete Trip',
    completeTripTitle: 'Complete Trip',
    completeTripConfirm: 'Mark this trip as completed?',
    cancel: 'Cancel',
    complete: 'Complete',
    languageLabel: 'العربية',
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    profile: 'Profile',
    logout: 'Log Out',
    logoutTitle: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
  },
} as const;

const tripStatusLabels = {
  SCHEDULED: { ar: 'مجدولة', en: 'Scheduled' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In Progress' },
  COMPLETED: { ar: 'مكتملة', en: 'Completed' },
  CANCELLED: { ar: 'ملغاة', en: 'Cancelled' },
} as const;

export function t(locale: Locale) {
  return messages[locale];
}

export function formatDateTime(value: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function tripStatusLabel(status: string, locale: Locale) {
  return tripStatusLabels[status as keyof typeof tripStatusLabels]?.[locale]
    ?? status.replaceAll('_', ' ');
}
