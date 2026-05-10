'use client';
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Trip, TripStatus, TripType } from '@fleet/shared';
import { formatDateTime, formatEnumLabel } from '@/lib/i18n';
import { useLocale } from '@/providers/locale-provider';
import Link from 'next/link';
import { Eye, Plus, XCircle } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const statusColors: Record<TripStatus, string> = {
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

const typeColors: Record<TripType, string> = {
  ONE_TIME: 'bg-blue-50 text-blue-600',
  DAILY: 'bg-amber-50 text-amber-600',
  CAR_RENT: 'bg-purple-50 text-purple-700',
};

const ALL_STATUS = 'ALL_STATUS';
const ALL_TYPE = 'ALL_TYPE';
type StatusFilter = TripStatus | typeof ALL_STATUS;
type TypeFilter = TripType | typeof ALL_TYPE;

export default function TripsPage() {
  const { isRTL, locale, t } = useLocale();
  const tt = t.trips;
  const tc = t.common;
  const [userRole, setUserRole] = useState<string | null>(null);
  const isDriver = userRole === 'DRIVER';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUS);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(ALL_TYPE);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cancelTarget, setCancelTarget] = useState<Trip | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole'));
  }, []);

  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: () => api.get('/trips').then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/trips/${id}`, { status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setCancelTarget(null);
    },
  });

  const tripTypeLabelMap: Record<TripType, string> = {
    ONE_TIME: tt.typeOneTime,
    DAILY: tt.typeDaily,
    CAR_RENT: tt.typeCarRent,
  };

  const filtered = trips.filter(tr => {
    const matchStatus = statusFilter === ALL_STATUS || tr.status === statusFilter;
    const matchType = typeFilter === ALL_TYPE || (tr as any).tripType === typeFilter;
    return matchStatus && matchType;
  });
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={!!cancelTarget}
        message={locale === 'ar' ? 'هل تريد إلغاء هذه الرحلة؟' : 'Are you sure you want to cancel this trip?'}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
        loading={cancelMutation.isPending}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{tt.title}</h1>
        {!isDriver && (
          <Link
            href={`/${locale}/dashboard/trips/new`}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {locale === 'ar' ? 'إضافة رحلة' : 'Add Trip'}
          </Link>
        )}
      </div>

      {/* Type + Status filter row */}
      <div className="flex gap-2 flex-wrap items-center">
        {([ALL_TYPE, 'ONE_TIME', 'DAILY', 'CAR_RENT'] as TypeFilter[]).map(tp => (
          <button
            key={tp}
            onClick={() => { setTypeFilter(tp); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              typeFilter === tp ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tp === ALL_TYPE ? tt.all : tripTypeLabelMap[tp as TripType]}
          </button>
        ))}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        {([ALL_STATUS, 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === ALL_STATUS ? (locale === 'ar' ? 'كل الحالات' : 'All Statuses') : formatEnumLabel('tripStatus', s, locale)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">{tc.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{tt.empty}</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[tt.type, tt.route, tt.driver, tt.vehicle, tt.scheduled, tt.status, tc.actions].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(trip => {
                  const tripType: TripType = (trip as any).tripType ?? 'ONE_TIME';
                  return (
                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                      {/* Type badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[tripType]}`}>
                          {tripTypeLabelMap[tripType]}
                        </span>
                      </td>

                      {/* Route + optional client/contract sub-info */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{trip.origin} → {trip.destination}</div>
                        {(trip as any).clientName && (
                          <div className="text-xs text-gray-400 mt-0.5">{tt.clientName}: {(trip as any).clientName}</div>
                        )}
                        {(trip as any).contractNumber && (
                          <div className="text-xs text-gray-400">{tt.contractNumber}: <span className="font-mono">{(trip as any).contractNumber}</span></div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-500">{(trip as any).driver?.fullName ?? tc.empty}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{(trip as any).vehicle?.plateNumber ?? tc.empty}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(trip.scheduledStart, locale)}</td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[trip.status]}`}>
                          {formatEnumLabel('tripStatus', trip.status, locale)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/${locale}/dashboard/trips/${trip.id}`}
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title={tc.view}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {!isDriver && (trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS') && (
                            <button
                              onClick={() => setCancelTarget(trip)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title={locale === 'ar' ? 'إلغاء' : 'Cancel'}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-4">
              <Pagination
                total={filtered.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
