import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata({ ar: 'الوقود', en: 'Fuel' });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FuelLog } from '@fleet/shared';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDate, formatNumber } from '@/lib/i18n';
import { useLocale } from '@/providers/locale-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Eye, Trash2, Plus, Fuel } from 'lucide-react';
import Link from 'next/link';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface MonthlyReport {
  vehicleId: string;
  _sum: { liters: number; costSar: number };
}

export default function FuelPage() {
  const { isRTL, locale, t } = useLocale();
  const tc = t.common;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<FuelLog | null>(null);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading: logsLoading } = useQuery<FuelLog[]>({
    queryKey: ['fuel-logs'],
    queryFn: () => api.get('/fuel').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/fuel/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      setDeleteTarget(null);
    },
  });

  const paginated = logs.slice((page - 1) * pageSize, page * pageSize);

  const { data: report = [] } = useQuery<MonthlyReport[]>({
    queryKey: ['fuel-report'],
    queryFn: () => api.get('/fuel/report').then(r => r.data),
  });

  const chartData = report.map(r => ({
    vehicle: r.vehicleId.slice(-6),
    liters: r._sum.liters ?? 0,
    cost: r._sum.costSar ?? 0,
  }));

  return (
    <div className="space-y-6">
            <ConfirmDialog
              open={!!deleteTarget}
              message={locale === 'ar' ? 'هل أنت متأكد من حذف سجل الوقود هذا؟' : 'Are you sure you want to delete this fuel log?'}
              onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              onCancel={() => setDeleteTarget(null)}
              loading={deleteMutation.isPending}
            />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Fuel className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.fuel.title}</h1>
        </div>
        <Link
          href={`/${locale}/dashboard/fuel/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {locale === 'ar' ? 'إضافة سجل وقود' : 'Add Fuel Log'}
        </Link>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t.fuel.chartTitle}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="vehicle" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="cost" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {logsLoading ? (
          <div className="p-8 text-center text-gray-400">{t.common.loading}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t.fuel.empty}</div>
        ) : (
          <>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[t.fuel.vehicle, t.fuel.date, t.fuel.liters, t.fuel.cost, t.fuel.odometer, t.fuel.station, tc.actions].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{(log as any).vehicle?.plateNumber ?? t.common.empty}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(log.filledAt, locale)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatNumber(log.liters, locale)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatNumber(log.costSar, locale)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatNumber(log.odometer, locale)}</td>
                  <td className="px-4 py-3 text-gray-500">{log.station ?? tc.empty}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/${locale}/dashboard/fuel/${log.id}`} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title={tc.view}>
                        <Eye className="w-4 h-4" />
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
          </div>
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
