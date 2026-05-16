'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

interface Vehicle { id: string; plateNumber: string; make: string; model: string; sequenceNumber?: string | null }
interface Driver { id: string; fullName: string; phone: string }

function Field({ label, name, type = 'text', placeholder, required = false }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ms-0.5">*</span>}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function CheckboxField({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4 accent-blue-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export default function ContractsNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tc = t.contracts;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const [vehicleQuery, setVehicleQuery] = useState('');
  const [driverQuery, setDriverQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>(undefined);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [isTwoWay, setIsTwoWay] = useState(true);
  const [contractStart, setContractStart] = useState<string | undefined>(undefined);
  const [contractEnd, setContractEnd] = useState<string | undefined>(undefined);
  const vehicleComboRef = useRef<HTMLDivElement>(null);
  const driverComboRef = useRef<HTMLDivElement>(null);

  const { data: vehiclesRes, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });
  const vehicles = vehiclesRes ?? [];

  const { data: driversRes, isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => api.get('/drivers').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });
  const drivers = driversRes ?? [];

  const filteredVehicles = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(v =>
      v.plateNumber.toLowerCase().includes(q) ||
      (v.sequenceNumber ?? '').toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q),
    );
  }, [vehicles, vehicleQuery]);

  const filteredDrivers = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(d => d.fullName.toLowerCase().includes(q) || d.phone.includes(q));
  }, [drivers, driverQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (vehicleComboRef.current && !vehicleComboRef.current.contains(e.target as Node))
        setVehicleDropdownOpen(false);
    };
    if (vehicleDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [vehicleDropdownOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (driverComboRef.current && !driverComboRef.current.contains(e.target as Node))
        setDriverDropdownOpen(false);
    };
    if (driverDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [driverDropdownOpen]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/contracts', payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      router.push(`/${locale}/dashboard/contracts`);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedVehicleId || !selectedDriverId || !contractStart || !contractEnd) return;
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    createMutation.mutate({
      vehicleId: selectedVehicleId,
      driverId: selectedDriverId,
      clientName: get('clientName'),
      clientPhone: get('clientPhone') || undefined,
      contractNumber: get('contractNumber') || undefined,
      origin: get('origin'),
      destination: get('destination'),
      contractStart,
      contractEnd,
      departureTime: get('departureTime'),
      returnTime: isTwoWay ? (get('returnTime') || undefined) : undefined,
      isTwoWay,
      excludeFridays: fd.get('excludeFridays') === 'on',
      excludeSaturdays: fd.get('excludeSaturdays') === 'on',
      notes: get('notes') || undefined,
    });
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        href={`/${locale}/dashboard/contracts`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {tc.title}
      </Link>

      <div className="flex items-center gap-3">
        <CalendarDays className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{tc.newTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Client & Contract Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {locale === 'ar' ? 'بيانات العميل' : 'Client Information'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={tc.clientName} name="clientName" required placeholder={locale === 'ar' ? 'اسم العميل' : 'Client name'} />
            <Field label={tc.clientPhone} name="clientPhone" placeholder={locale === 'ar' ? 'اختياري' : 'Optional'} />
            <Field label={tc.contractNumber} name="contractNumber" placeholder={locale === 'ar' ? 'مثال: CNT-2026-001' : 'e.g. CNT-2026-001'} />
          </div>
        </div>

        {/* Vehicle & Driver */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {locale === 'ar' ? 'المركبة والسائق' : 'Vehicle & Driver'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle combobox */}
            <div className="relative" ref={vehicleComboRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tc.vehicle}<span className="text-red-500 ms-0.5">*</span></label>
              <input
                type="text"
                value={vehicleQuery}
                placeholder={vehiclesLoading ? (locale === 'ar' ? 'جاري التحميل…' : 'Loading…') : (locale === 'ar' ? 'ابحث عن مركبة' : 'Search vehicle')}
                disabled={vehiclesLoading}
                autoComplete="off"
                onChange={e => { setVehicleQuery(e.target.value); setSelectedVehicleId(undefined); setVehicleDropdownOpen(true); }}
                onFocus={() => setVehicleDropdownOpen(true)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {vehicleDropdownOpen && filteredVehicles.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                  {filteredVehicles.map(v => (
                    <li key={v.id}>
                      <button type="button" className={`w-full px-3 py-2 text-start hover:bg-blue-50 hover:text-blue-700 ${selectedVehicleId === v.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
                        onClick={() => { setSelectedVehicleId(v.id); setVehicleQuery(`${v.plateNumber} — ${v.make} ${v.model}`); setVehicleDropdownOpen(false); }}>
                        <span className="font-mono font-semibold">{v.plateNumber}</span>
                        <span className="text-gray-500 ms-1">— {v.make} {v.model}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Driver combobox */}
            <div className="relative" ref={driverComboRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tc.driver}<span className="text-red-500 ms-0.5">*</span></label>
              <input
                type="text"
                value={driverQuery}
                placeholder={driversLoading ? (locale === 'ar' ? 'جاري التحميل…' : 'Loading…') : (locale === 'ar' ? 'ابحث عن سائق' : 'Search driver')}
                disabled={driversLoading}
                autoComplete="off"
                onChange={e => { setDriverQuery(e.target.value); setSelectedDriverId(undefined); setDriverDropdownOpen(true); }}
                onFocus={() => setDriverDropdownOpen(true)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {driverDropdownOpen && filteredDrivers.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                  {filteredDrivers.map(d => (
                    <li key={d.id}>
                      <button type="button" className={`w-full px-3 py-2 text-start hover:bg-blue-50 hover:text-blue-700 ${selectedDriverId === d.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
                        onClick={() => { setSelectedDriverId(d.id); setDriverQuery(d.fullName); setDriverDropdownOpen(false); }}>
                        {d.fullName}
                        <span className="text-gray-400 text-xs ms-2">{d.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Route & Schedule */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {locale === 'ar' ? 'المسار والجدول' : 'Route & Schedule'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={tc.origin} name="origin" required placeholder={locale === 'ar' ? 'نقطة الانطلاق' : 'Starting point'} />
            <Field label={tc.destination} name="destination" required placeholder={locale === 'ar' ? 'الوجهة' : 'Endpoint'} />
            <div>
              <DatePicker label={tc.contractStart} value={contractStart} onChange={setContractStart} placeholder={tc.contractStart} isRTL={isRTL} outputCalendar="gregorian" />
            </div>
            <div>
              <DatePicker label={tc.contractEnd} value={contractEnd} onChange={setContractEnd} placeholder={tc.contractEnd} isRTL={isRTL} outputCalendar="gregorian" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tc.departureTime}<span className="text-red-500 ms-0.5">*</span></label>
              <input type="time" name="departureTime" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {isTwoWay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tc.returnTime}</label>
                <input type="time" name="returnTime" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-6 mt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={isTwoWay} onChange={e => setIsTwoWay(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">{tc.isTwoWay}</span>
            </label>
            <CheckboxField label={tc.excludeFridays} name="excludeFridays" defaultChecked />
            <CheckboxField label={tc.excludeSaturdays} name="excludeSaturdays" />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">{tc.notes}</label>
          <textarea name="notes" rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">
            {(createMutation.error as any)?.response?.data?.message ?? (locale === 'ar' ? 'حدث خطأ' : 'An error occurred')}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !selectedVehicleId || !selectedDriverId || !contractStart || !contractEnd}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ العقد' : 'Save Contract')}
          </button>
          <Link href={`/${locale}/dashboard/contracts`} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {t.common.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}