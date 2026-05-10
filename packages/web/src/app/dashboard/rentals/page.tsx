'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { useState } from 'react';
import { Plus, Eye, Pencil, Trash2, Key } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';

interface Rental {
  id: string;
  clientName: string;
  clientPhone?: string;
  contractNumber?: string;
  rentalStart: string;
  rentalEnd: string;
  dailyRateSar?: number;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'CANCELLED';
  vehicle: { id: string; plateNumber: string; make: string; model: string };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  RETURNED: 'bg-gray-100 text-gray-600',
  OVERDUE: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function fmt(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function RentalsPage() {
  const { locale, isRTL, t } = useLocale();
  const tr = t.rentals;
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<Rental | null>(null);
  const queryClient = useQueryClient();

  const { data: rentals = [], isLoading } = useQuery<Rental[]>({
    queryKey: ['rentals'],
    queryFn: () => api.get('/rentals').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rentals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      setDeleteTarget(null);
    },
  });

  const paginated = rentals.slice((page - 1) * pageSize, page * pageSize);

  function statusLabel(status: string) {
    if (status === 'ACTIVE') return tr.statusActive;
    if (status === 'RETURNED') return tr.statusReturned;
    if (status === 'OVERDUE') return tr.statusOverdue;
    if (status === 'CANCELLED') return tr.statusCancelled;
    return status;
  }

  return (
    <div>
      <ConfirmDialog
        open={!!deleteTarget}
        message={tr.deleteConfirm}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{tr.title}</h1>
        </div>
        <Link
          href={`/${locale}/dashboard/rentals/new`}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {tr.add}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">{t.common.loading}</div>
        ) : rentals.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{tr.empty}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[tr.vehicle, tr.clientName, tr.rentalStart, tr.rentalEnd, tr.dailyRate, tr.status, t.common.actions].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold">{r.vehicle.plateNumber}</div>
                        <div className="text-xs text-gray-400">{r.vehicle.make} {r.vehicle.model}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>{r.clientName}</div>
                        {r.clientPhone && <div className="text-xs text-gray-400">{r.clientPhone}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{fmt(r.rentalStart)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{fmt(r.rentalEnd)}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">
                        {r.dailyRateSar != null ? `${r.dailyRateSar} SAR` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/${locale}/dashboard/rentals/${r.id}`} title={t.common.view}>
                            <Eye className="w-4 h-4 text-gray-400 hover:text-blue-600 transition-colors" />
                          </Link>
                          <Link href={`/${locale}/dashboard/rentals/${r.id}/edit`} title={t.common.edit}>
                            <Pencil className="w-4 h-4 text-gray-400 hover:text-amber-500 transition-colors" />
                          </Link>
                          <button onClick={() => setDeleteTarget(r)} title={t.common.delete}>
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rentals.length > pageSize && (
              <div className="p-4 border-t border-gray-100">
                <Pagination page={page} pageSize={pageSize} total={rentals.length} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
