import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { LocaleProvider } from '@/providers/locale-provider';
import { Locale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Fleet Management',
  description: 'Saudi Fleet Management — Tamm & Naql integrated',
};

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
