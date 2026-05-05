'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MaintenanceLog, MaintenanceStatus } from '@fleet/shared';
import { formatDate, formatEnumLabel, formatNumber } from '@/lib/i18n';
import { useLocale } from '@/providers/locale-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const statusColors: Record<MaintenanceStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function MaintenancePage() {
  const { isRTL, locale, t } = useLocale();
  const tc = t.common;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceLog | null>(null);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ['maintenance'],
    queryFn: () => api.get('/maintenance').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/maintenance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setDeleteTarget(null);
    },
  });

  const paginated = logs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.maintenance.title}</h1>
        <Link
          href={`/${locale}/dashboard/maintenance/new`}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {locale === 'ar' ? 'إضافة سجل صيانة' : 'Add Maintenance'}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">{tc.loading}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t.maintenance.empty}</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[t.maintenance.vehicle, t.maintenance.type, t.maintenance.description, t.maintenance.scheduled, t.maintenance.cost, t.maintenance.status, tc.actions].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{(log as any).vehicle?.plateNumber ?? tc.empty}</td>
                    <td className="px-4 py-3 text-gray-700">{formatEnumLabel('maintenanceType', log.type, locale)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.description}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(log.scheduledDate, locale)}</td>
                    <td className="px-4 py-3 text-gray-700">{log.costSar != null ? formatNumber(log.costSar, locale) : tc.empty}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[log.status]}`}>
                        {formatEnumLabel('maintenanceStatus', log.status, locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/${locale}/dashboard/maintenance/${log.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title={tc.view}>
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/${locale}/dashboard/maintenance/${log.id}/edit`} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title={tc.edit}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteTarget(log)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={tc.delete}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-4">
              <Pagination
                total={logs.length}
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
