'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { useState } from 'react';
import { Plus, Eye, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pagination } from '@/components/ui/pagination';

interface Contract {
  id: string;
  clientName: string;
  clientPhone?: string;
  contractNumber?: string;
  origin: string;
  destination: string;
  contractStart: string;
  contractEnd: string;
  departureTime: string;
  returnTime?: string;
  isTwoWay: boolean;
  excludeFridays: boolean;
  excludeSaturdays: boolean;
  notes?: string;
  vehicle: { id: string; plateNumber: string; make: string; model: string };
  driver: { id: string; fullName: string };
  vacations?: { id: string }[];
  _count?: { trips: number };
}

function fmt(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ContractsPage() {
  const { locale, isRTL, t } = useLocale();
  const tc = t.contracts;
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => api.get('/contracts').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setDeleteTarget(null);
    },
  });

  const paginated = contracts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <ConfirmDialog
        open={!!deleteTarget}
        message={tc.deleteConfirm}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{tc.title}</h1>
        </div>
        <Link
          href={`/${locale}/dashboard/contracts/new`}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {tc.add}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">{t.common.loading}</div>
        ) : contracts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{tc.empty}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[tc.contractNumber, tc.clientName, tc.vehicle, tc.driver, `${tc.origin} ${isRTL ? '←' : '→'} ${tc.destination}`, `${tc.contractStart} – ${tc.contractEnd}`, tc.departureTime, tc.trips, t.common.actions].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.contractNumber ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>{c.clientName}</div>
                        {c.clientPhone && <div className="text-xs text-gray-400">{c.clientPhone}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-mono text-xs">{c.vehicle.plateNumber}</div>
                        <div className="text-xs text-gray-400">{c.vehicle.make} {c.vehicle.model}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.driver.fullName}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="text-xs">{!isRTL ? c.destination : c.origin}</span>
                        <span className="mx-1 text-gray-300">{isRTL ? '←' : '→'}</span>
                        <span className="text-xs">{!isRTL ? c.origin : c.destination}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {fmt(c.contractStart)} – {fmt(c.contractEnd)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs whitespace-nowrap">
                        {c.departureTime}
                        {c.isTwoWay && c.returnTime && <span className="text-gray-400 ms-1">/ {c.returnTime}</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                          {c._count?.trips ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/${locale}/dashboard/contracts/${c.id}`} title={t.common.view}>
                            <Eye className="w-4 h-4 text-gray-400 hover:text-blue-600 transition-colors" />
                          </Link>
                          <Link href={`/${locale}/dashboard/contracts/${c.id}/edit`} title={t.common.edit}>
                            <Pencil className="w-4 h-4 text-gray-400 hover:text-amber-500 transition-colors" />
                          </Link>
                          <button onClick={() => setDeleteTarget(c)} title={t.common.delete}>
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {contracts.length > pageSize && (
              <div className="p-4 border-t border-gray-100">
                <Pagination page={page} pageSize={pageSize} total={contracts.length} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
