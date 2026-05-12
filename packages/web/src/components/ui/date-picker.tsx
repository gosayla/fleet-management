'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

type CalendarType = 'gregorian' | 'hijri';

type DatePickerProps = {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
  placeholder?: string;
  isRTL?: boolean;
  outputCalendar?: CalendarType;
};

type DateParts = { year: number; month: number; day: number };

function normalizeDateInput(value: string): string {
  return value
    // Arabic-Indic digits
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    // Eastern Arabic/Persian digits
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    // Common separators to hyphen
    .replace(/[\/.]/g, '-')
    // Strip bidi/invisible marks that often appear in RTL inputs
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .trim();
}

function parseYyyyMmDd(value?: string): DateParts | undefined {
  if (!value) return undefined;
  const normalized = normalizeDateInput(value);
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return { year, month, day };
}

function partsToYyyyMmDd(parts?: DateParts): string | undefined {
  if (!parts) return undefined;
  const y = `${parts.year}`.padStart(4, '0');
  const m = `${parts.month}`.padStart(2, '0');
  const d = `${parts.day}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function gregorianDateFromParts(parts?: DateParts): Date | undefined {
  if (!parts) return undefined;
  const date = new Date(parts.year, parts.month - 1, parts.day);
  if (
    date.getFullYear() !== parts.year ||
    date.getMonth() !== parts.month - 1 ||
    date.getDate() !== parts.day
  ) {
    return undefined;
  }
  return date;
}

function toGregorianYyyyMmDd(date?: Date): string | undefined {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getHijriPartsFromGregorian(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '0');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '0');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '0');
  return { year, month, day };
}

function toHijriYyyyMmDd(date?: Date): string | undefined {
  if (!date) return undefined;
  return partsToYyyyMmDd(getHijriPartsFromGregorian(date));
}

function hijriToGregorianDate(hijri: DateParts): Date | undefined {
  // Approximation: Hijri year maps roughly near Gregorian year 622 + 0.97 * Hijri year.
  const approxGregorianYear = Math.floor(622 + hijri.year * 0.97);
  const start = new Date(approxGregorianYear - 2, 0, 1);
  const end = new Date(approxGregorianYear + 2, 11, 31);

  const target = partsToYyyyMmDd(hijri);
  const cursor = new Date(start);

  while (cursor <= end) {
    if (toHijriYyyyMmDd(cursor) === target) {
      return new Date(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return undefined;
}

function detectCalendarType(value?: string): CalendarType | undefined {
  const parts = parseYyyyMmDd(value);
  if (!parts) return undefined;
  return parts.year >= 1700 ? 'gregorian' : 'hijri';
}

function parseToGregorianDate(value?: string): Date | undefined {
  const parts = parseYyyyMmDd(value);
  if (!parts) return undefined;

  const kind = detectCalendarType(value);
  if (kind === 'gregorian') {
    return gregorianDateFromParts(parts);
  }

  return hijriToGregorianDate(parts);
}

function humanDate(value: string, isRTL?: boolean, calendarType?: CalendarType): string {
  const date = parseToGregorianDate(value);
  if (!date) return value;

  if (calendarType === 'hijri') {
    return new Intl.DateTimeFormat(isRTL ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder,
  isRTL,
  outputCalendar = 'gregorian',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => parseToGregorianDate(value), [value]);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener('mousedown', onClickOutside);
    }

    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const gregorianMirror = selectedDate ? toGregorianYyyyMmDd(selectedDate) : undefined;
  const hijriMirror = selectedDate ? toHijriYyyyMmDd(selectedDate) : undefined;

  const hintText = outputCalendar === 'hijri'
    ? `Hijri ${hijriMirror ?? '---- -- --'} • Gregorian ${gregorianMirror ?? '---- -- --'}`
    : `Gregorian ${gregorianMirror ?? '---- -- --'} • Hijri ${hijriMirror ?? '---- -- --'}`;

  const outputBadge = outputCalendar === 'hijri'
    ? (isRTL ? 'مخرجات هجري' : 'Hijri Output')
    : (isRTL ? 'مخرجات ميلادي' : 'Gregorian Output');

  const outputBadgeClass = outputCalendar === 'hijri'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';

  const commitDraft = () => {
    const parsed = parseToGregorianDate(draft);
    if (!parsed) {
      if (!draft.trim()) {
        onChange(undefined);
      }
      return;
    }

    onChange(outputCalendar === 'hijri' ? toHijriYyyyMmDd(parsed) : toGregorianYyyyMmDd(parsed));
  };

  return (
    <div className="relative" ref={ref}>
      <div className={`mb-1 flex items-center gap-2 ${isRTL ? 'justify-between' : 'justify-between'}`}>
        <label className={`block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {label}
        </label>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${outputBadgeClass}`}>
          {outputBadge}
        </span>
      </div>

      <div className="relative">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          placeholder={placeholder ?? (outputCalendar === 'hijri' ? '1447-11-20 or 2026-05-04' : '2026-05-04 or 1447-11-20')}
          className={`w-full px-3 py-2.5 pr-20 border border-slate-200 rounded-xl text-sm bg-white hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm ${isRTL ? 'text-right pl-20 pr-3' : 'text-left'}`}
        />

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-slate-400 hover:text-slate-600`}
          aria-label="Open calendar"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setDraft('');
            }}
            className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-9' : 'right-9'} text-slate-400 hover:text-slate-600`}
            aria-label="Clear date"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className={`mt-1 text-[11px] text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>
        {value ? hintText : outputCalendar === 'hijri' ? 'Accepts Hijri and Gregorian input.' : 'Accepts Gregorian and Hijri input.'}
      </p>

      {value && (
        <p className={`mt-0.5 text-xs text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {humanDate(value, isRTL, outputCalendar)}
        </p>
      )}

      {open && (
        <div className={`absolute z-30 mt-2 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-3 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 ${isRTL ? 'left-0' : 'right-0'}`}>
          <DayPicker
            mode="single"
            showOutsideDays
            fixedWeeks
            captionLayout="dropdown"
            startMonth={new Date(1990, 0)}
            endMonth={new Date(2060, 11)}
            selected={selectedDate}
            onSelect={(date) => {
              const next = outputCalendar === 'hijri' ? toHijriYyyyMmDd(date) : toGregorianYyyyMmDd(date);
              onChange(next);
              setOpen(false);
            }}
            className="fleet-date-picker"
          />
        </div>
      )}
    </div>
  );
}
