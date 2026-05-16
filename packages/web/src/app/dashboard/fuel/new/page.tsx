import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata({ ar: 'إدخال وقود', en: 'New Fuel Entry' });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Fuel, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useMemo, useEffect } from 'react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { CreateFuelLogDto, Driver, Vehicle } from '@fleet/shared';
import { DatePicker } from '@/components/ui/date-picker';

export default function NewFuelLogPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tf = t.fuel;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  // Date / time state
  const [filledDate, setFilledDate] = useState<string | undefined>(undefined);
  const [filledTime, setFilledTime] = useState('');

  // ── Vehicle combobox ────────────────────────────────────────────────────────
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const vehicleComboRef = useRef<HTMLDivElement>(null);

  const { data: vehiclesResponse, isLoading: vehiclesLoading } = useQuery<{ data: Vehicle[] } | Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then((r) => r.data),
  });
  const vehicles = Array.isArray(vehiclesResponse) ? vehiclesResponse : (vehiclesResponse?.data ?? []);

  const filteredVehicles = useMemo(() => {
    const q = vehicleQuery.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.plateNumber?.toLowerCase().includes(q) ||
        (v as any).sequenceNumber?.toString().includes(q) ||
        v.make?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q),
    );
  }, [vehicles, vehicleQuery]);

  useEffect(() => {
    if (!vehicleDropdownOpen) return;
    function onOutside(e: MouseEvent) {
      if (vehicleComboRef.current && !vehicleComboRef.current.contains(e.target as Node))
        setVehicleDropdownOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [vehicleDropdownOpen]);

  // ── Driver combobox ─────────────────────────────────────────────────────────
  const [driverId, setDriverId] = useState('');
  const [driverQuery, setDriverQuery] = useState('');
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const driverComboRef = useRef<HTMLDivElement>(null);

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => api.get('/drivers').then((r) => r.data),
  });

  const filteredDrivers = useMemo(() => {
    const q = driverQuery.toLowerCase();
    return drivers.filter(
      (d) => d.fullName.toLowerCase().includes(q) || d.phone.includes(q),
    );
  }, [drivers, driverQuery]);

  useEffect(() => {
    if (!driverDropdownOpen) return;
    function onOutside(e: MouseEvent) {
      if (driverComboRef.current && !driverComboRef.current.contains(e.target as Node))
        setDriverDropdownOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [driverDropdownOpen]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateFuelLogDto) => api.post('/fuel', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      router.push(`/${locale}/dashboard/fuel`);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vehicleId || !filledDate) return;

    const fd = new FormData(e.currentTarget);
    const dateTime = filledTime ? `${filledDate}T${filledTime}` : `${filledDate}T00:00`;

    const payload: CreateFuelLogDto = {
      vehicleId,
      driverId: driverId || undefined,
      liters: Number(fd.get('liters')),
      costSar: Number(fd.get('costSar')),
      odometer: Number(fd.get('odometer')),
      station: String(fd.get('station') ?? '').trim() || undefined,
      filledAt: new Date(dateTime),
    };

    createMutation.mutate(payload);
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/fuel`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {tf.title}
      </Link>

      <div className="flex items-center gap-3">
        <Fuel className="w-6 h-6 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          {locale === 'ar' ? 'إضافة سجل وقود' : 'Add Fuel Log'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Vehicle combobox */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tf.vehicle} *</label>
              <div className="relative" ref={vehicleComboRef}>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <input
                    type="text"
                    value={vehicleQuery}
                    onChange={(e) => { setVehicleQuery(e.target.value); setVehicleDropdownOpen(true); setVehicleId(''); }}
                    onFocus={() => setVehicleDropdownOpen(true)}
                    placeholder={locale === 'ar' ? 'ابحث عن مركبة…' : 'Search vehicle…'}
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                  />
                  {vehicleId && (
                    <button type="button" onClick={() => { setVehicleId(''); setVehicleQuery(''); }} className="px-2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => setVehicleDropdownOpen((o) => !o)} className="px-2 text-gray-400">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {vehicleDropdownOpen && (
                  <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                    {vehiclesLoading ? (
                      <li className="px-3 py-2 text-gray-400">{tc.loading}</li>
                    ) : filteredVehicles.length === 0 ? (
                      <li className="px-3 py-2 text-gray-400">{locale === 'ar' ? 'لا توجد نتائج' : 'No results'}</li>
                    ) : (
                      filteredVehicles.map((v) => (
                        <li
                          key={v.id}
                          onMouseDown={() => { setVehicleId(v.id); setVehicleQuery(`${v.plateNumber} — ${v.make} ${v.model}`); setVehicleDropdownOpen(false); }}
                          className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${vehicleId === v.id ? 'bg-blue-50 font-medium' : ''}`}
                        >
                          {v.plateNumber} — {v.make} {v.model}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Driver combobox (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tf.driver} <span className="text-gray-400 font-normal">({tc.optional ?? 'optional'})</span>
              </label>
              <div className="relative" ref={driverComboRef}>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <input
                    type="text"
                    value={driverQuery}
                    onChange={(e) => { setDriverQuery(e.target.value); setDriverDropdownOpen(true); setDriverId(''); }}
                    onFocus={() => setDriverDropdownOpen(true)}
                    placeholder={locale === 'ar' ? 'ابحث عن سائق…' : 'Search driver…'}
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                  />
                  {driverId && (
                    <button type="button" onClick={() => { setDriverId(''); setDriverQuery(''); }} className="px-2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => setDriverDropdownOpen((o) => !o)} className="px-2 text-gray-400">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {driverDropdownOpen && (
                  <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
                    {driversLoading ? (
                      <li className="px-3 py-2 text-gray-400">{tc.loading}</li>
                    ) : filteredDrivers.length === 0 ? (
                      <li className="px-3 py-2 text-gray-400">{locale === 'ar' ? 'لا توجد نتائج' : 'No results'}</li>
                    ) : (
                      filteredDrivers.map((d) => (
                        <li
                          key={d.id}
                          onMouseDown={() => { setDriverId(d.id); setDriverQuery(d.fullName); setDriverDropdownOpen(false); }}
                          className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${driverId === d.id ? 'bg-blue-50 font-medium' : ''}`}
                        >
                          <span className="font-medium">{d.fullName}</span>
                          <span className="text-gray-400 ms-2 text-xs">{d.phone}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Fill date */}
            <DatePicker
              label={`${tf.filledAt} *`}
              value={filledDate}
              onChange={setFilledDate}
              placeholder={tf.filledAt}
              isRTL={isRTL}
              outputCalendar="gregorian"
            />

            {/* Fill time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'ar' ? 'الوقت' : 'Time'}
              </label>
              <input
                type="time"
                value={filledTime}
                onChange={(e) => setFilledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Liters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tf.liters} *</label>
              <input
                type="number"
                name="liters"
                required
                min={0.1}
                step={0.01}
                placeholder="50"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tf.cost} *</label>
              <input
                type="number"
                name="costSar"
                required
                min={0}
                step={0.01}
                placeholder="275.50"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Odometer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tf.odometer} *</label>
              <input
                type="number"
                name="odometer"
                required
                min={0}
                placeholder="45200"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Station */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tf.station} <span className="text-gray-400 font-normal">({tc.optional ?? 'optional'})</span>
              </label>
              <input
                type="text"
                name="station"
                placeholder={locale === 'ar' ? 'مثال: محطة أدنوك — طريق الملك فهد' : 'e.g. ADNOC Station — King Fahd Rd'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

          </div>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">
            {(createMutation.error as any)?.response?.data?.message ?? 'An error occurred'}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !vehicleId || !filledDate}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending
              ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving...')
              : (locale === 'ar' ? 'حفظ السجل' : 'Save Log')}
          </button>
          <Link
            href={`/${locale}/dashboard/fuel`}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {tc.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}
