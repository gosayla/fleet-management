import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { LocaleProvider } from '@/providers/locale-provider';
import { Locale } from '@/lib/i18n';

const TITLES: Record<Locale, { default: string; template: string; description: string }> = {
  ar: {
    default: 'الأسطول',
    template: '%s | الأسطول',
    description: 'منصة إدارة الأسطول — متكاملة مع تمم ونقل',
  },
  en: {
    default: 'EFleet',
    template: '%s | EFleet',
    description: 'Saudi Fleet Management — Tamm & Naql integrated',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieLocale = (await cookies()).get('locale')?.value;
  const locale: Locale = cookieLocale === 'en' ? 'en' : 'ar';
  const { default: defaultTitle, template, description } = TITLES[locale];

  return {
    title: { default: defaultTitle, template },
    description,
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieLocale = cookies().get('locale')?.value;
  const locale: Locale = cookieLocale === 'en' ? 'en' : 'ar';

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <QueryProvider>{children}</QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
