'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { resolveDocumentFileUrl } from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { ArrowLeft, ArrowRight, Key, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface RentalDetail {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientNationalId?: string;
  contractNumber?: string;
  rentalStart: string;
  rentalEnd: string;
  odometerOut?: number;
  odometerIn?: number;
  dailyRateSar?: number;
  contractFileUrl?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
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

export default function RentalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tr = t.rentals;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [odometerIn, setOdometerIn] = useState('');

  const { data: rental, isLoading, isError } = useQuery<RentalDetail>({
    queryKey: ['rentals', id],
    queryFn: () => api.get(`/rentals/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/rentals/${id}`),
    onSuccess: () => router.push(`/${locale}/dashboard/rentals`),
  });

  const returnMutation = useMutation({
    mutationFn: () => api.post(`/rentals/${id}/return`, odometerIn ? { odometerIn: parseFloat(odometerIn) } : {}).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals', id] });
      setReturnOpen(false);
    },
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">{t.common.loading}</div>;
  if (isError || !rental) return <div className="p-8 text-center text-red-500">{locale === 'ar' ? 'حدث خطأ' : 'An error occurred'}</div>;

  const canReturn = rental.status === 'ACTIVE' || rental.status === 'OVERDUE';

  function statusLabel(status: string) {
    if (status === 'ACTIVE') return tr.statusActive;
    if (status === 'RETURNED') return tr.statusReturned;
    if (status === 'OVERDUE') return tr.statusOverdue;
    if (status === 'CANCELLED') return tr.statusCancelled;
    return status;
  }

  function Detail({ label, value }: { label: string; value?: string | number | null }) {
    if (value == null || value === '') return null;
    return (
      <div>
        <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
        <dd className="text-sm text-gray-900">{String(value)}</dd>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={deleteOpen}
        message={tr.deleteConfirm}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/dashboard/rentals`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowBack className="w-4 h-4" />
          {tr.title}
        </Link>
        <div className="flex gap-2">
          {canReturn && (
            <button
              onClick={() => setReturnOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              {tr.returnVehicle}
            </button>
          )}
          {canReturn && (
            <Link href={`/${locale}/dashboard/rentals/${id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
              {t.common.edit}
            </Link>
          )}
          <button onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            {t.common.delete}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Key className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{rental.clientName}</h1>
        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColors[rental.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {statusLabel(rental.status)}
        </span>
      </div>

      {/* Return modal */}
      {returnOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{tr.returnVehicle}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tr.odometerIn}</label>
              <input
                type="number"
                value={odometerIn}
                onChange={e => setOdometerIn(e.target.value)}
                placeholder="km"
                min="0"
                step="any"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {returnMutation.isError && (
              <p className="text-sm text-red-600">{(returnMutation.error as any)?.response?.data?.message ?? (locale === 'ar' ? 'حدث خطأ' : 'An error occurred')}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => returnMutation.mutate()}
                disabled={returnMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {returnMutation.isPending ? tr.returning : tr.returnVehicle}
              </button>
              <button onClick={() => setReturnOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                {t.common.confirmNo}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Detail label={tr.vehicle} value={`${rental.vehicle.plateNumber} — ${rental.vehicle.make} ${rental.vehicle.model}`} />
          <Detail label={tr.clientPhone} value={rental.clientPhone} />
          <Detail label={tr.clientNationalId} value={rental.clientNationalId} />
          <Detail label={tr.contractNumber} value={rental.contractNumber} />
          <Detail label={tr.rentalStart} value={fmt(rental.rentalStart)} />
          <Detail label={tr.rentalEnd} value={fmt(rental.rentalEnd)} />
          <Detail label={tr.odometerOut} value={rental.odometerOut != null ? `${rental.odometerOut} km` : null} />
          <Detail label={tr.odometerIn} value={rental.odometerIn != null ? `${rental.odometerIn} km` : null} />
          <Detail label={tr.dailyRate} value={rental.dailyRateSar != null ? `${rental.dailyRateSar} SAR` : null} />
          {rental.contractFileUrl && (
            <div>
              <dt className="text-xs font-medium text-gray-500 mb-0.5">{tr.contractFile}</dt>
              <dd>
                <a href={resolveDocumentFileUrl(rental.contractFileUrl!)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  {locale === 'ar' ? 'فتح الملف' : 'Open file'}
                </a>
              </dd>
            </div>
          )}
          {rental.notes && (
            <div className="col-span-2 md:col-span-3">
              <dt className="text-xs font-medium text-gray-500 mb-0.5">{tr.notes}</dt>
              <dd className="text-sm text-gray-700">{rental.notes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
