'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Vehicle } from '@fleet/shared';
import { Truck, Plus, Search, Upload, ChevronUp, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const PAGE_SIZE_DEFAULT = 10;

// Hijri/Gregorian conversion utilities
function parseYyyyMmDd(value?: string) {
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

// Fast O(1) Hijri to Gregorian using Julian Day Number algorithm
function hijriToGregorianDate(h: { year: number; month: number; day: number }): Date | undefined {
  try {
    // Convert Hijri to Julian Day Number (Umm al-Qura approximation)
    const jd = Math.floor((11 * h.year + 3) / 30)
      + Math.floor(354 * h.year)
      + Math.floor(30 * h.month)
      - Math.floor((h.month - 1) / 2)
      + h.day
      + 1948440
      - 385;

    // Convert Julian Day Number to Gregorian
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

function detectCalendarType(value?: string) {
  const parts = parseYyyyMmDd(value);
  if (!parts) return undefined;
  return parts.year >= 1700 ? 'gregorian' : 'hijri';
}

function parseToGregorianDate(value?: string) {
  const parts = parseYyyyMmDd(value);
  if (!parts) return undefined;
  const kind = detectCalendarType(value);
  if (kind === 'gregorian') {
    return gregorianDateFromParts(parts);
  }
  return hijriToGregorianDate(parts);
}

function getExpiryStatus(expiryDate?: string | null): 'expired' | 'expiring' | 'valid' | 'unknown' {
  const date = parseDate(expiryDate);
  if (!date) {
    return 'unknown';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryOnly = new Date(date);
  expiryOnly.setHours(0, 0, 0, 0);

  const msDiff = expiryOnly.getTime() - today.getTime();
  const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return 'expired';
  }

  if (daysLeft <= 30) {
    return 'expiring';
  }

  return 'valid';
}

function ExpiryStatusBadge({ expiryDate, label }: { expiryDate?: string | null; label: string }) {
  const status = getExpiryStatus(expiryDate);

  if (!expiryDate) {
    return <span className="text-gray-400 text-xs">{label}</span>;
  }

  const statusConfig = {
    expired: { bg: 'bg-red-100', text: 'text-red-800', icon: true, tooltip: 'License Expired' },
    expiring: { bg: 'bg-amber-100', text: 'text-amber-800', icon: true, tooltip: 'Expiring Soon' },
    valid: { bg: 'bg-green-100', text: 'text-green-800', icon: true, tooltip: 'Valid' },
    unknown: { bg: 'bg-gray-100', text: 'text-gray-600', icon: false, tooltip: 'Unknown' },
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${config.bg} ${config.text} text-xs font-medium`} title={config.tooltip}>
      {status === 'expired' && <AlertCircle className="w-3.5 h-3.5" />}
      {status === 'expiring' && <AlertCircle className="w-3.5 h-3.5" />}
      {status === 'valid' && <CheckCircle className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </div>
  );
}

type SortBy = 'insuranceExpiry' | 'licenseExpiry' | 'operationCardExpiry' | 'inspectionExpiry' | null;
type SortOrder = 'asc' | 'desc';

// Module-level cache — persists across renders, shared for all vehicles
const dateCache = new Map<string, Date | null>();

const parseDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  if (dateCache.has(dateStr)) return dateCache.get(dateStr) ?? null;
  const result = parseToGregorianDate(dateStr) ?? null;
  dateCache.set(dateStr, result);
  return result;
};

export default function VehiclesPage() {
  const { isRTL, locale, t } = useLocale();
  const tc = t.common;
  const base = `/${locale}`;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const queryClient = useQueryClient();

  const sortFieldMap: Record<NonNullable<SortBy>, string> = {
    insuranceExpiry: 'insuranceExpiryDate',
    licenseExpiry: 'licenseExpiryDate',
    operationCardExpiry: 'operationCardExpiryDate',
    inspectionExpiry: 'inspectionExpiryDate',
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ['vehicles', search, page, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get('/vehicles', {
        params: {
          search: search || undefined,
          page,
          limit: pageSize,
          sortBy: sortBy ? sortFieldMap[sortBy] : undefined,
          sortOrder: sortBy ? sortOrder : undefined,
        },
      });
      return res.data as { data: Vehicle[]; total: number; page: number; limit: number; totalPages: number };
    },
    placeholderData: (prev) => prev,
  });

  const vehicles = response?.data ?? [];
  const totalVehicles = response?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteTarget(null);
    },
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortableHeader = ({ column, label }: { column: SortBy; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 w-full hover:text-blue-600 transition-colors"
    >
      <span>{label}</span>
      {sortBy === column && (
        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.vehicles.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${base}/dashboard/vehicles/import`}
            className="flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t.vehicles.import}
          </Link>
          <Link
            href={`${base}/dashboard/vehicles/new`}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.vehicles.add}
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
        <input
          className={`w-full py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'}`}
          placeholder={t.vehicles.search}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.vehicles.plate}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.vehicles.sequenceNumber}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.vehicles.vehicle}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                  <SortableHeader column="insuranceExpiry" label={t.vehicles.insuranceExpiryDate} />
                </th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                  <SortableHeader column="licenseExpiry" label={t.vehicles.licenseExpiryDate} />
                </th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                  <SortableHeader column="operationCardExpiry" label={t.vehicles.operationCardExpiryDate} />
                </th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                  <SortableHeader column="inspectionExpiry" label={t.vehicles.inspectionExpiryDate} />
                </th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{tc.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{v.plateNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{(v as any).sequenceNumber ?? tc.empty}</td>
                  <td className="px-4 py-3">{v.year} {v.make} {v.model}</td>
                  <td className="px-4 py-3">
                    <ExpiryStatusBadge expiryDate={(v as any).insuranceExpiryDate} label={(v as any).insuranceExpiryDate ?? tc.empty} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryStatusBadge expiryDate={(v as any).licenseExpiryDate} label={(v as any).licenseExpiryDate ?? tc.empty} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryStatusBadge expiryDate={(v as any).operationCardExpiryDate} label={(v as any).operationCardExpiryDate ?? tc.empty} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryStatusBadge expiryDate={(v as any).inspectionExpiryDate} label={(v as any).inspectionExpiryDate ?? tc.empty} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`${base}/dashboard/vehicles/${v.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title={tc.view}>
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link href={`${base}/dashboard/vehicles/${v.id}/edit`} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title={tc.edit}>
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button onClick={() => setDeleteTarget(v)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={tc.delete}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {totalVehicles === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    {t.vehicles.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
                  <div className="border-t border-gray-100 px-4">
                    <Pagination
                      total={totalVehicles}
                      page={page}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    />
                  </div>
        </div>
      )}
    </div>
  );
}
