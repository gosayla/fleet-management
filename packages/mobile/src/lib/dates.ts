/**
 * Date formatting utilities that handle both Hijri and Gregorian date strings.
 *
 * Hijri dates are stored as strings (e.g. "1448/03/20" or "1448-03-20")
 * because they cannot be represented accurately as JS Date objects.
 * Passing a Hijri string to `new Date()` gives a wrong year (JS treats it as
 * Gregorian), so we detect and handle them separately.
 */

const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi I', 'Rabi II',
  'Jumada I', 'Jumada II', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijjah',
];

/**
 * Returns true if the string looks like a Hijri date.
 * Heuristic: parse any numeric year component — if it falls in [1200, 1600]
 * it is almost certainly a Hijri year.
 */
function isHijriString(value: string): boolean {
  // Accepts formats: YYYY/MM/DD  YYYY-MM-DD  DD/MM/YYYY  DD-MM-YYYY
  const parts = value.split(/[-\/]/).map(Number).filter(n => !isNaN(n));
  if (parts.length < 2) return false;
  return parts.some(n => n >= 1200 && n <= 1600);
}

/**
 * Format a Hijri date string ("YYYY/MM/DD", "YYYY-MM-DD", "DD/MM/YYYY", or "DD-MM-YYYY")
 * using proper Hijri month names.
 */
function formatHijri(value: string, lang: 'ar' | 'other'): string {
  const parts = value.split(/[-\/]/).map(Number);
  if (parts.length < 3) return value;

  let year: number, month: number, day: number;

  // Detect order: if first part is plausibly a Hijri year (>1200)
  if (parts[0] > 1200) {
    [year, month, day] = parts;
  } else {
    // DD/MM/YYYY
    [day, month, year] = parts;
  }

  const monthIndex = month - 1;
  if (monthIndex < 0 || monthIndex > 11) return value;

  const monthName = lang === 'ar' ? HIJRI_MONTHS_AR[monthIndex] : HIJRI_MONTHS_EN[monthIndex];
  const dd = String(day).padStart(2, '0');

  return `${dd} ${monthName} ${year}`;
}

/**
 * Format any date string (Hijri or Gregorian ISO) for display.
 * - Hijri strings → formatted with proper Hijri month names
 * - Gregorian ISO strings → formatted with toLocaleDateString
 *
 * @param value  Raw date string from the server (may be Hijri or ISO 8601)
 * @param locale App locale code ('ar' | 'en' | 'hi' | 'bn' | 'ur')
 */
export function formatDateSmart(value: string | null | undefined, locale: string): string {
  if (!value) return '—';

  const trimmed = value.trim();
  if (!trimmed) return '—';

  if (isHijriString(trimmed)) {
    return formatHijri(trimmed, locale === 'ar' ? 'ar' : 'other');
  }

  // Gregorian ISO
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed; // unparseable — show as-is

  const localeCode: Record<string, string> = {
    ar: 'ar-SA', en: 'en-GB', hi: 'hi-IN', bn: 'bn-BD', ur: 'ur-PK',
  };
  return d.toLocaleDateString(localeCode[locale] ?? 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
