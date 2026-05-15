'use client';

import {MoveRight, Undo2} from 'lucide-react';

type TripLegValue = 'OUTBOUND' | 'RETURN';

interface Props {
  leg?: TripLegValue | string | null;
  locale: string;
}

const LEG_META: Record<TripLegValue, {className: string; label: Record<string, string>; Icon: typeof MoveRight}> = {
  OUTBOUND: {
    className: 'bg-blue-50 text-blue-700 border-blue-100',
    label: {ar: 'ذهاب', en: 'Outbound', hi: 'जाना', bn: 'যাওয়া', ur: 'جانا'},
    Icon: MoveRight,
  },
  RETURN: {
    className: 'bg-violet-50 text-violet-700 border-violet-100',
    label: {ar: 'إياب', en: 'Return', hi: 'वापसी', bn: 'ফেরা', ur: 'واپسی'},
    Icon: Undo2,
  },
};

export function TripLegBadge({leg, locale}: Props) {
  if (leg !== 'OUTBOUND' && leg !== 'RETURN') return null;

  const meta = LEG_META[leg];
  const label = meta.label[locale] ?? meta.label.en;
  const Icon = meta.Icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}