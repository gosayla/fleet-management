'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Locale, messages } from '@/lib/i18n';

type LocaleContextValue = {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (typeof messages)[Locale];
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = 'ar',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    const fromPath = pathname?.split('/')[1];
    if (fromPath === 'ar' || fromPath === 'en') {
      setLocale(fromPath);
      return;
    }

    const saved = window.localStorage.getItem('locale');
    if (saved === 'ar' || saved === 'en') {
      setLocale(saved);
    }
  }, [pathname]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem('locale', locale);
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
  }, [locale]);

  function setAndNavigate(nextLocale: Locale) {
    setLocale(nextLocale);

    const currentPath = pathname || '/';
    const withoutPrefix = currentPath.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';
    const target = `/${nextLocale}${withoutPrefix === '/' ? '' : withoutPrefix}`;

    if (target !== currentPath) {
      router.push(target);
    }
  }

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      isRTL: locale === 'ar',
      setLocale: setAndNavigate,
      toggleLocale: () => setAndNavigate(locale === 'ar' ? 'en' : 'ar'),
      t: messages[locale],
    }),
    [locale, pathname],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}