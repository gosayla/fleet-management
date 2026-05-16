import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata({ ar: 'الوقود', en: 'Fuel' });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
