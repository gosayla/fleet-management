import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = new Set(['ar', 'en']);
const DEFAULT_LOCALE = 'ar';

export default function HomePage() {
  const cookieLocale = cookies().get('locale')?.value;
  const locale = cookieLocale && SUPPORTED_LOCALES.has(cookieLocale)
    ? cookieLocale
    : DEFAULT_LOCALE;

  redirect(`/${locale}/dashboard`);
}
