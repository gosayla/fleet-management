'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Driver, DriverStatus } from '@fleet/shared';
import Link from 'next/link';
import { formatDate, formatEnumLabel } from '@/lib/i18n';
import { useLocale } from '@/providers/locale-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const statusColors: Record<DriverStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  OFF_DUTY: 'bg-gray-100 text-gray-600',
  ON_LEAVE: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

export default function DriversPage() {
  const { isRTL, locale, t } = useLocale();
  const tc = t.common;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => api.get('/drivers').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/drivers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDeleteTarget(null);
    },
  });

  const paginated = drivers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
            <ConfirmDialog
              open={!!deleteTarget}
              onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              onCancel={() => setDeleteTarget(null)}
              loading={deleteMutation.isPending}
            />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.drivers.title}</h1>
        <Link
          href="/dashboard/drivers/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.drivers.add}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">{t.common.loading}</div>
        ) : drivers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t.drivers.empty}</div>
        ) : (
              <>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[t.drivers.name, t.drivers.nationalId, t.drivers.licenseExpiry, t.drivers.status, t.drivers.assignedVehicle, tc.actions].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.fullName}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{d.nationalId}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(d.licenseExpiry, locale)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[d.status]}`}>
                      {formatEnumLabel('driverStatus', d.status, locale)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{(d as any).vehicles?.[0]?.plateNumber ?? t.common.empty}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                      <Link href={`/dashboard/drivers/${d.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title={tc.view}>
                                        <Eye className="w-4 h-4" />
                                      </Link>
                                      <Link href={`/dashboard/drivers/${d.id}/edit`} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title={tc.edit}>
                                        <Pencil className="w-4 h-4" />
                                      </Link>
                                      <button onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={tc.delete}>
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="border-t border-gray-100 px-4">
            <Pagination
              total={drivers.length}
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
