'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { ArrowLeft, ArrowRight, Key } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

interface Vehicle { id: string; plateNumber: string; make: string; model: string; sequenceNumber?: string | null }
interface RentalDetail {
  id: string; clientName: string; clientPhone?: string; clientNationalId?: string; contractNumber?: string;
  rentalStart: string; rentalEnd: string; odometerOut?: number; odometerIn?: number; dailyRateSar?: number;
  contractFileUrl?: string; status: string; notes?: string;
  vehicle: { id: string; plateNumber: string; make: string; model: string };
}

export default function RentalEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tr = t.rentals;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const { data: rental, isLoading } = useQuery<RentalDetail>({
    queryKey: ['rentals', id],
    queryFn: () => api.get(`/rentals/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const [vehicleQuery, setVehicleQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [rentalStart, setRentalStart] = useState<string | undefined>(undefined);
  const [rentalEnd, setRentalEnd] = useState<string | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);
  const vehicleComboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rental && !initialized) {
      setSelectedVehicleId(rental.vehicle.id);
      setVehicleQuery(`${rental.vehicle.plateNumber} — ${rental.vehicle.make} ${rental.vehicle.model}`);
      setRentalStart(rental.rentalStart.split('T')[0]);
      setRentalEnd(rental.rentalEnd.split('T')[0]);
      setInitialized(true);
    }
  }, [rental, initialized]);

  const { data: vehiclesRes } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });
  const vehicles = vehiclesRes ?? [];

  const filteredVehicles = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    if (!q || selectedVehicleId) return vehicles;
    return vehicles.filter(v => v.plateNumber.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q));
  }, [vehicles, vehicleQuery, selectedVehicleId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (vehicleComboRef.current && !vehicleComboRef.current.contains(e.target as Node)) setVehicleDropdownOpen(false); };
    if (vehicleDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [vehicleDropdownOpen]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch(`/rentals/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals', id] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      router.push(`/${locale}/dashboard/rentals/${id}`);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedVehicleId || !rentalStart || !rentalEnd) return;
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const odometerOut = get('odometerOut') ? parseFloat(get('odometerOut')) : undefined;
    const dailyRateSar = get('dailyRateSar') ? parseFloat(get('dailyRateSar')) : undefined;
    updateMutation.mutate({
      vehicleId: selectedVehicleId,
      clientName: get('clientName'),
      clientPhone: get('clientPhone') || undefined,
      clientNationalId: get('clientNationalId') || undefined,
      contractNumber: get('contractNumber') || undefined,
      rentalStart,
      rentalEnd,
      odometerOut,
      dailyRateSar,
      contractFileUrl: get('contractFileUrl') || undefined,
      notes: get('notes') || undefined,
    });
  }

  if (isLoading || !rental) return <div className="p-8 text-center text-gray-400">{t.common.loading}</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <Link href={`/${locale}/dashboard/rentals/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowBack className="w-4 h-4" />
        {rental.clientName}
      </Link>

      <div className="flex items-center gap-3">
        <Key className="w-6 h-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900">{t.common.edit} — {rental.clientName}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{locale === 'ar' ? 'بيانات العميل' : 'Client Information'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: tr.clientName, name: 'clientName', defaultValue: rental.clientName, required: true },
              { label: tr.clientPhone, name: 'clientPhone', defaultValue: rental.clientPhone ?? '' },
              { label: tr.clientNationalId, name: 'clientNationalId', defaultValue: rental.clientNationalId ?? '' },
              { label: tr.contractNumber, name: 'contractNumber', defaultValue: rental.contractNumber ?? '' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="text" name={f.name} defaultValue={f.defaultValue} required={f.required} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{tr.vehicle}</p>
          <div className="relative" ref={vehicleComboRef}>
            <input type="text" value={vehicleQuery} autoComplete="off"
              onChange={e => { setVehicleQuery(e.target.value); setSelectedVehicleId(undefined); setVehicleDropdownOpen(true); }}
              onFocus={() => { setSelectedVehicleId(undefined); setVehicleDropdownOpen(true); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {vehicleDropdownOpen && filteredVehicles.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                {filteredVehicles.map(v => (
                  <li key={v.id}>
                    <button type="button" className="w-full px-3 py-2 text-start hover:bg-blue-50 hover:text-blue-700 text-gray-800"
                      onClick={() => { setSelectedVehicleId(v.id); setVehicleQuery(`${v.plateNumber} — ${v.make} ${v.model}`); setVehicleDropdownOpen(false); }}>
                      <span className="font-mono font-semibold">{v.plateNumber}</span>
                      <span className="text-gray-500 ms-1">— {v.make} {v.model}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{locale === 'ar' ? 'تفاصيل الإيجار' : 'Rental Details'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker label={tr.rentalStart} value={rentalStart} onChange={setRentalStart} placeholder={tr.rentalStart} isRTL={isRTL} outputCalendar="gregorian" />
            <DatePicker label={tr.rentalEnd} value={rentalEnd} onChange={setRentalEnd} placeholder={tr.rentalEnd} isRTL={isRTL} outputCalendar="gregorian" />
            {[
              { label: tr.odometerOut, name: 'odometerOut', defaultValue: rental.odometerOut?.toString() ?? '', type: 'number' },
              { label: tr.dailyRate, name: 'dailyRateSar', defaultValue: rental.dailyRateSar?.toString() ?? '', type: 'number' },
              { label: tr.contractFile, name: 'contractFileUrl', defaultValue: rental.contractFileUrl ?? '', type: 'url' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} name={f.name} defaultValue={f.defaultValue} min={f.type === 'number' ? '0' : undefined} step={f.type === 'number' ? 'any' : undefined} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">{tr.notes}</label>
          <textarea name="notes" rows={3} defaultValue={rental.notes ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {updateMutation.isError && (
          <p className="text-sm text-red-600">{(updateMutation.error as any)?.response?.data?.message ?? (locale === 'ar' ? 'حدث خطأ' : 'An error occurred')}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={updateMutation.isPending || !selectedVehicleId}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {updateMutation.isPending ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
          </button>
          <Link href={`/${locale}/dashboard/rentals/${id}`} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {t.common.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}
