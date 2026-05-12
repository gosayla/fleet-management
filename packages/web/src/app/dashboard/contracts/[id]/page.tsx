'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { ArrowLeft, ArrowRight, CalendarDays, RefreshCw, Trash2, Plus, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Vacation { id: string; date: string; reason?: string }
interface Trip {
  id: string;
  tripDate: string;
  leg: 'OUTBOUND' | 'RETURN';
  status: string;
  scheduledStart: string;
}
interface ContractTripsPage {
  items: Trip[];
  nextOffset: number | null;
}
interface ContractDetail {
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
  vacations: Vacation[];
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

function fmt(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

async function fetchAllContractTrips(id: string): Promise<Trip[]> {
  const allTrips: Trip[] = [];
  let nextOffset: number | null = 0;

  while (nextOffset !== null) {
    const response = await api.get<ContractTripsPage>(`/contracts/${id}/trips`, {
      params: { skip: nextOffset, take: 100 },
    });
    const page = response.data;
    allTrips.push(...(Array.isArray(page.items) ? page.items : []));
    nextOffset = typeof page.nextOffset === 'number' ? page.nextOffset : null;
  }

  return allTrips;
}

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tc = t.contracts;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [vacationDate, setVacationDate] = useState('');
  const [vacationReason, setVacationReason] = useState('');
  const [vacationDeleteTarget, setVacationDeleteTarget] = useState<Vacation | null>(null);
  const [tripPage, setTripPage] = useState(1);
  const tripsPerPage = 20;

  const { data: contract, isLoading, isError } = useQuery<ContractDetail>({
    queryKey: ['contracts', id],
    queryFn: () => api.get(`/contracts/${id}`).then(r => r.data),
    enabled: !!id,
  });
  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['contracts', id, 'trips'],
    queryFn: () => fetchAllContractTrips(id),
    enabled: !!id,
  });

  useEffect(() => {
    setTripPage(1);
  }, [id]);

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/generate-trips`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
      queryClient.invalidateQueries({ queryKey: ['contracts', id, 'trips'] });
    },
  });

  const addVacationMutation = useMutation({
    mutationFn: (payload: { date: string; reason?: string }) => api.post(`/contracts/${id}/vacations`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
      setVacationDate('');
      setVacationReason('');
    },
  });

  const removeVacationMutation = useMutation({
    mutationFn: (vacId: string) => api.delete(`/contracts/${id}/vacations/${vacId}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
      setVacationDeleteTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/contracts/${id}`),
    onSuccess: () => router.push(`/${locale}/dashboard/contracts`),
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">{t.common.loading}</div>;
  if (isError || !contract) return <div className="p-8 text-center text-red-500">{locale === 'ar' ? 'حدث خطأ' : 'An error occurred'}</div>;

  const sortedTrips = [...trips].sort((a, b) => new Date(a.tripDate).getTime() - new Date(b.tripDate).getTime() || (a.leg === 'OUTBOUND' ? -1 : 1));
  const paginatedTrips = sortedTrips.slice((tripPage - 1) * tripsPerPage, tripPage * tripsPerPage);

  function Detail({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div>
        <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
        <dd className="text-sm text-gray-900">{value}</dd>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={deleteOpen}
        message={tc.deleteConfirm}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={!!vacationDeleteTarget}
        message={locale === 'ar' ? 'إزالة هذا التاريخ المستثنى؟' : 'Remove this excluded date?'}
        onConfirm={() => vacationDeleteTarget && removeVacationMutation.mutate(vacationDeleteTarget.id)}
        onCancel={() => setVacationDeleteTarget(null)}
        loading={removeVacationMutation.isPending}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/dashboard/contracts`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowBack className="w-4 h-4" />
          {tc.title}
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            {generateMutation.isPending ? tc.generating : tc.generateTrips}
          </button>
          <Link href={`/${locale}/dashboard/contracts/${id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
            {t.common.edit}
          </Link>
          <button onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
            {t.common.delete}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <CalendarDays className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          {contract.clientName}
          {contract.contractNumber && <span className="ms-2 text-base font-normal text-gray-400">#{contract.contractNumber}</span>}
        </h1>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Detail label={tc.vehicle} value={`${contract.vehicle.plateNumber} — ${contract.vehicle.make} ${contract.vehicle.model}`} />
          <Detail label={tc.driver} value={contract.driver.fullName} />
          <Detail label={tc.origin} value={contract.origin} />
          <Detail label={tc.destination} value={contract.destination} />
          <Detail label={tc.contractStart} value={fmt(contract.contractStart)} />
          <Detail label={tc.contractEnd} value={fmt(contract.contractEnd)} />
          <Detail label={tc.departureTime} value={contract.departureTime} />
          {contract.isTwoWay && <Detail label={tc.returnTime} value={contract.returnTime} />}
          <div>
            <dt className="text-xs font-medium text-gray-500 mb-1">{locale === 'ar' ? 'الخيارات' : 'Options'}</dt>
            <dd className="flex flex-wrap gap-2">
              {contract.isTwoWay && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">{tc.isTwoWay}</span>}
              {contract.excludeFridays && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{tc.excludeFridays}</span>}
              {contract.excludeSaturdays && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{tc.excludeSaturdays}</span>}
            </dd>
          </div>
          {contract.notes && (
            <div className="col-span-2 md:col-span-4">
              <dt className="text-xs font-medium text-gray-500 mb-0.5">{tc.notes}</dt>
              <dd className="text-sm text-gray-700">{contract.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Vacations */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">{tc.vacations}</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="date"
            value={vacationDate}
            onChange={e => setVacationDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={vacationReason}
            onChange={e => setVacationReason(e.target.value)}
            placeholder={tc.vacationReason}
            className="flex-1 min-w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => vacationDate && addVacationMutation.mutate({ date: vacationDate, reason: vacationReason || undefined })}
            disabled={!vacationDate || addVacationMutation.isPending}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {tc.addVacation}
          </button>
        </div>
        {contract.vacations.length === 0 ? (
          <p className="text-sm text-gray-400">{locale === 'ar' ? 'لا توجد أيام مستثناة' : 'No excluded dates'}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {contract.vacations.map(v => (
              <span key={v.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800">
                {fmt(v.date)}
                {v.reason && <span className="text-amber-600">— {v.reason}</span>}
                <button onClick={() => setVacationDeleteTarget(v)} className="text-amber-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Trips */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">{tc.trips} ({sortedTrips.length})</h2>
        </div>
        {tripsLoading ? (
          <div className="p-8 text-center text-gray-400">{t.common.loading}</div>
        ) : sortedTrips.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {tc.empty}
            <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="block mx-auto mt-2 text-sm text-blue-600 hover:underline">
              {tc.generateTrips}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[tc.tripDate, tc.leg, 'Status', locale === 'ar' ? 'وقت الانطلاق' : 'Start Time'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedTrips.map(trip => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/${locale}/dashboard/trips/${trip.id}`} className="text-blue-600 hover:underline text-xs font-mono">
                        {fmt(trip.tripDate)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${trip.leg === 'OUTBOUND' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {trip.leg === 'OUTBOUND' ? tc.outbound : tc.return}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{fmtTime(trip.scheduledStart)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sortedTrips.length > tripsPerPage && (
          <div className="px-5 py-3 border-t border-gray-100 flex gap-2 items-center text-sm text-gray-500">
            <button onClick={() => setTripPage(p => Math.max(1, p - 1))} disabled={tripPage === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">{'<'}</button>
            <span>{tripPage} / {Math.ceil(sortedTrips.length / tripsPerPage)}</span>
            <button onClick={() => setTripPage(p => p + 1)} disabled={tripPage >= Math.ceil(sortedTrips.length / tripsPerPage)} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">{'>'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
