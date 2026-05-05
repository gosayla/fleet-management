'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CheckCircle2, XCircle, Clock3, CreditCard } from 'lucide-react';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatNumber } from '@/lib/i18n';
import { Pagination } from '@/components/ui/pagination';

type VehicleRow = {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  operationCardNumber?: string | null;
  operationCardExpiryDate?: string | null;
};

type VehiclesResponse = {
  data: VehicleRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type CardStatus = 'missing' | 'expired' | 'expiring' | 'valid' | 'available';
type Filter = 'all' | 'has' | 'none';

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseYyyyMmDd(value?: string | null) {
  if (!value) return undefined;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return { year, month, day };
}

function gregorianDateFromParts(parts?: { year: number; month: number; day: number }) {
  if (!parts) return undefined;
  const date = new Date(parts.year, parts.month - 1, parts.day);
  if (date.getFullYear() !== parts.year || date.getMonth() !== parts.month - 1 || date.getDate() !== parts.day) {
    return undefined;
  }
  return date;
}

function hijriToGregorianDate(h: { year: number; month: number; day: number }): Date | undefined {
  try {
    const jd = Math.floor((11 * h.year + 3) / 30)
      + Math.floor(354 * h.year)
      + Math.floor(30 * h.month)
      - Math.floor((h.month - 1) / 2)
      + h.day
      + 1948440
      - 385;

    let l = jd + 68569;
    const n = Math.floor((4 * l) / 146097);
    l = l - Math.floor((146097 * n + 3) / 4);
    const i = Math.floor((4000 * (l + 1)) / 1461001);
    l = l - Math.floor((1461 * i) / 4) + 31;
    const j = Math.floor((80 * l) / 2447);
    const day = l - Math.floor((2447 * j) / 80);
    l = Math.floor(j / 11);
    const month = j + 2 - 12 * l;
    const year = 100 * (n - 49) + i + l;

    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  } catch {
    return undefined;
  }
}

function parseToGregorianDate(value?: string | null) {
  const parts = parseYyyyMmDd(value);
  if (!parts) return undefined;
  if (parts.year >= 1700) return gregorianDateFromParts(parts);
  return hijriToGregorianDate(parts);
}

function getCardStatus(vehicle: VehicleRow): CardStatus {
  const hasCard = Boolean(vehicle.operationCardNumber?.trim());
  if (!hasCard) return 'missing';

  const expiry = parseToGregorianDate(vehicle.operationCardExpiryDate);
  if (!expiry) return 'available';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(expiry);
  end.setHours(0, 0, 0, 0);
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
}

function StatusBadge({ status, label }: { status: CardStatus; label: string }) {
  if (status === 'missing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }

  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }

  if (status === 'expiring') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <Clock3 className="h-3 w-3" />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle2 className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function OperationCardsPage() {
  const { locale, isRTL, t } = useLocale();
  const tv = t.vehicles;
  const tc = t.common;
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isExporting, setIsExporting] = useState(false);
  const operationCardFilter = filter === 'all' ? undefined : filter === 'has' ? 'has' : 'none';

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const { data, isLoading } = useQuery<VehiclesResponse>({
    queryKey: ['operation-cards-vehicles', filter, page, pageSize],
    queryFn: () =>
      api
        .get('/vehicles', {
          params: {
            page,
            limit: pageSize,
            sortBy: 'operationCardExpiryDate',
            sortOrder: 'asc',
            operationCard: operationCardFilter,
          },
        })
        .then((r) => r.data),
  });

  const { data: summary } = useQuery<{ all: number; has: number; none: number }>({
    queryKey: ['operation-cards-summary'],
    queryFn: async () => {
      const [allRes, hasRes, noneRes] = await Promise.all([
        api.get('/vehicles', { params: { page: 1, limit: 1 } }),
        api.get('/vehicles', { params: { page: 1, limit: 1, operationCard: 'has' } }),
        api.get('/vehicles', { params: { page: 1, limit: 1, operationCard: 'none' } }),
      ]);

      return {
        all: allRes.data.total,
        has: hasRes.data.total,
        none: noneRes.data.total,
      };
    },
  });

  const vehicles = data?.data ?? [];
  const totalVehicles = data?.total ?? 0;

  const stats = useMemo(() => {
    let expiringSoon = 0;
    for (const vehicle of vehicles) {
      const status = getCardStatus(vehicle);
      if (status === 'expiring') expiringSoon += 1;
    }

    return {
      hasCard: summary?.has ?? 0,
      noCard: summary?.none ?? 0,
      all: summary?.all ?? 0,
      expiringSoon,
    };
  }, [vehicles, summary]);

  const noCardVehiclesOnPage = useMemo(
    () => vehicles.filter((vehicle) => getCardStatus(vehicle) === 'missing'),
    [vehicles],
  );

  const statusLabel = (status: CardStatus) => {
    if (status === 'missing') return tv.cardMissing;
    if (status === 'expired') return tv.cardExpired;
    if (status === 'expiring') return tv.cardExpiringSoon;
    if (status === 'valid') return tv.cardValid;
    return tv.cardAvailable;
  };

  const exportNoCardVehicles = async () => {
    if (isExporting) return;
    setIsExporting(true);

    const header = [
      tv.plate,
      tv.vehicle,
      tv.operationCardNumber,
      tv.operationCardExpiryDate,
      tv.cardStatus,
    ];

    try {
      const firstPage = await api.get('/vehicles', {
        params: {
          page: 1,
          limit: 100,
          operationCard: 'none',
          sortBy: 'operationCardExpiryDate',
          sortOrder: 'asc',
        },
      });

      const firstData = firstPage.data as VehiclesResponse;
      const allRows: VehicleRow[] = [...firstData.data];

      for (let p = 2; p <= firstData.totalPages; p += 1) {
        const res = await api.get('/vehicles', {
          params: {
            page: p,
            limit: 100,
            operationCard: 'none',
            sortBy: 'operationCardExpiryDate',
            sortOrder: 'asc',
          },
        });
        const pageData = res.data as VehiclesResponse;
        allRows.push(...pageData.data);
      }

      const rows = allRows.map((vehicle) => [
        vehicle.plateNumber,
        `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        vehicle.operationCardNumber || '',
        vehicle.operationCardExpiryDate || '',
        statusLabel(getCardStatus(vehicle)),
      ]);

      const csv = [header, ...rows]
        .map((row) => row.map((cell) => csvEscape(cell)).join(','))
        .join('\n');

      downloadCsv('operation-cards-missing.csv', csv);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tv.operationCardsTitle}</h1>
          <p className="text-sm text-gray-500">{tv.operationCardsDesc}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{tv.allVehicles}</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.all, locale)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{tv.hasCard}</p>
          <p className="text-xl font-bold text-green-700">{formatNumber(stats.hasCard, locale)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{tv.noCard}</p>
          <p className="text-xl font-bold text-red-700">{formatNumber(stats.noCard, locale)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{tv.cardExpiringSoon}</p>
          <p className="text-xl font-bold text-amber-700">{formatNumber(stats.expiringSoon, locale)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          {tv.allVehicles}
        </button>
        <button
          onClick={() => setFilter('has')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === 'has' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          {tv.hasCard}
        </button>
        <button
          onClick={() => setFilter('none')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === 'none' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          {tv.noCard}
        </button>
        <button
          onClick={exportNoCardVehicles}
          disabled={(summary?.none ?? noCardVehiclesOnPage.length) === 0 || isExporting}
          className="ms-auto rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? `${tc.loading}` : tv.exportNoCardCsv}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">{tc.loading}</div>
        ) : vehicles.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{tc.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.plate}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.vehicle}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.operationCardNumber}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.operationCardExpiryDate}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.cardStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicles.map((vehicle) => {
                  const status = getCardStatus(vehicle);
                  return (
                    <tr key={vehicle.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700">{vehicle.plateNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{vehicle.year} {vehicle.make} {vehicle.model}</td>
                      <td className="px-4 py-3 text-gray-700">{vehicle.operationCardNumber || tc.empty}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {vehicle.operationCardExpiryDate
                          ? formatDate(vehicle.operationCardExpiryDate, locale)
                          : tc.empty}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} label={statusLabel(status)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-4">
              <Pagination
                total={totalVehicles}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
