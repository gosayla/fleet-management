import type { Metadata } from 'next';
import { cookies } from 'next/headers';

type LocaleTitle = { ar: string; en: string };

export async function generateLocalizedMetadata(title: LocaleTitle): Promise<Metadata> {
  const cookieLocale = (await cookies()).get('locale')?.value;
  const isAr = cookieLocale !== 'en';
  return { title: isAr ? title.ar : title.en };
}
