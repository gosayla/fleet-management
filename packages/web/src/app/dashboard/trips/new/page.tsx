import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata({ ar: 'رحلة جديدة', en: 'New Trip' });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Route } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import type { CreateTripDto, Driver, Vehicle } from '@fleet/shared';
import { DatePicker } from '@/components/ui/date-picker';

type TripType = NonNullable<CreateTripDto['tripType']>;

const TRIP_TYPE_LABELS: Record<TripType, { en: string; ar: string }> = {
  ONE_TIME: { en: 'One-Time', ar: 'رحلة واحدة' },
  DAILY: { en: 'Daily Contract', ar: 'عقد يومي' },
  CAR_RENT: { en: 'Car Rental', ar: 'إيجار سيارة' },
};

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default function NewTripPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tt = t.trips;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const [tripType, setTripType] = useState<TripType>('ONE_TIME' as TripType);
  const [scheduledStartDate, setScheduledStartDate] = useState<string | undefined>(undefined);
  const [scheduledEndDate, setScheduledEndDate] = useState<string | undefined>(undefined);
  const [contractStartDate, setContractStartDate] = useState<string | undefined>(undefined);
  const [contractEndDate, setContractEndDate] = useState<string | undefined>(undefined);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [driverQuery, setDriverQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>(undefined);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const vehicleComboRef = useRef<HTMLDivElement>(null);
  const driverComboRef = useRef<HTMLDivElement>(null);

  const { data: vehiclesResponse, isLoading: vehiclesLoading, isError: vehiclesError } = useQuery<{ data: Vehicle[] } | Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then(r => r.data),
  });
  const vehicles = Array.isArray(vehiclesResponse) ? vehiclesResponse : (vehiclesResponse?.data ?? []);

  const { data: driversResponse, isLoading: driversLoading, isError: driversError } = useQuery<{ data: Driver[] } | Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => api.get('/drivers').then(r => r.data),
  });
  const drivers = Array.isArray(driversResponse) ? driversResponse : (driversResponse?.data ?? []);

  const vehicleOptions = useMemo(() =>
    vehicles.map((v) => ({
      id: v.id,
      plateNumber: v.plateNumber,
      sequenceNumber: (v as any).sequenceNumber as string | null | undefined,
      make: v.make,
      model: v.model,
      label: `${v.plateNumber} — ${v.make} ${v.model}`,
    })),
  [vehicles]);

  const driverOptions = useMemo(() =>
    drivers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      phone: d.phone,
      label: d.fullName,
    })),
  [drivers]);

  const filteredVehicleOptions = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    if (!q) return vehicleOptions;
    return vehicleOptions.filter((v) =>
      v.plateNumber.toLowerCase().includes(q) ||
      String(v.sequenceNumber ?? '').toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q),
    );
  }, [vehicleOptions, vehicleQuery]);

  const filteredDriverOptions = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    if (!q) return driverOptions;
    return driverOptions.filter((d) =>
      d.fullName.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q),
    );
  }, [driverOptions, driverQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (vehicleComboRef.current && !vehicleComboRef.current.contains(e.target as Node)) {
        setVehicleDropdownOpen(false);
      }
    }
    if (vehicleDropdownOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [vehicleDropdownOpen]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (driverComboRef.current && !driverComboRef.current.contains(e.target as Node)) {
        setDriverDropdownOpen(false);
      }
    }
    if (driverDropdownOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [driverDropdownOpen]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateTripDto) => api.post('/trips', payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.push(`/${locale}/dashboard/trips`);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const startTime = get('scheduledStartTime') || '00:00';
    const endTime = get('scheduledEndTime') || '00:00';

    if (!scheduledStartDate || !scheduledEndDate) return;
    if (!selectedVehicleId || !selectedDriverId) return;

    const scheduledStart = new Date(`${scheduledStartDate}T${startTime}`);
    const scheduledEnd = new Date(`${scheduledEndDate}T${endTime}`);
    if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) return;

    const payload: CreateTripDto = {
      vehicleId: selectedVehicleId,
      driverId: selectedDriverId,
      tripType,
      origin: get('origin'),
      destination: get('destination'),
      scheduledStart,
      scheduledEnd,
      notes: get('notes') || undefined,
      clientName: get('clientName') || undefined,
      contractNumber: get('contractNumber') || undefined,
      contractStart: contractStartDate ? new Date(contractStartDate) : undefined,
      contractEnd: contractEndDate ? new Date(contractEndDate) : undefined,
    };

    createMutation.mutate(payload);
  }

  const isContractType = false; // DAILY trips managed via /contracts, CAR_RENT via /rentals
  const canSubmit =
    vehicles.length > 0 &&
    drivers.length > 0 &&
    !vehiclesLoading &&
    !driversLoading &&
    !!selectedVehicleId &&
    !!selectedDriverId;

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/trips`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {tt.title}
      </Link>

      <div className="flex items-center gap-3">
        <Route className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          {locale === 'ar' ? 'إضافة رحلة جديدة' : 'Add New Trip'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trip type selector */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{tt.type}</p>
          <div className="flex gap-3 flex-wrap">
            {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map(tp => (
              <button
                key={tp}
                type="button"
                onClick={() => setTripType(tp)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tripType === tp
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {TRIP_TYPE_LABELS[tp][locale === 'ar' ? 'ar' : 'en']}
              </button>
            ))}
          </div>
        </div>

        {/* Core trip fields — ONE_TIME only */}
        {(tripType as string) === 'ONE_TIME' && (<>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {locale === 'ar' ? 'تفاصيل الرحلة' : 'Trip Details'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle */}
            <div className="relative" ref={vehicleComboRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tt.vehicle}</label>
              <div className="relative">
                <input
                  type="text"
                  value={vehicleQuery}
                  placeholder={vehiclesLoading ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...') : (locale === 'ar' ? 'ابحث باللوحة أو التسلسل أو الشركة أو الموديل' : 'Search by plate, sequence, make, or model')}
                  autoComplete="off"
                  disabled={vehiclesLoading || vehicles.length === 0}
                  className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  onChange={(e) => {
                    setVehicleQuery(e.target.value);
                    setSelectedVehicleId(undefined);
                    setVehicleDropdownOpen(true);
                  }}
                  onFocus={() => setVehicleDropdownOpen(true)}
                />
                {selectedVehicleId && (
                  <button
                    type="button"
                    onClick={() => { setSelectedVehicleId(undefined); setVehicleQuery(''); setVehicleDropdownOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    ×
                  </button>
                )}
              </div>
              {vehicleDropdownOpen && filteredVehicleOptions.length > 0 && !vehiclesLoading && (
                <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                  {filteredVehicleOptions.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-start hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                          selectedVehicleId === v.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'
                        }`}
                        onClick={() => {
                          setSelectedVehicleId(v.id);
                          setVehicleQuery(v.label);
                          setVehicleDropdownOpen(false);
                        }}
                      >
                        <span className="font-mono font-semibold">{v.plateNumber}</span>
                        {v.sequenceNumber && <span className="text-gray-400 text-xs ms-2">#{v.sequenceNumber}</span>}
                        <span className="text-gray-500 ms-1">— {v.make} {v.model}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {vehicleDropdownOpen && vehicleQuery.trim() && filteredVehicleOptions.length === 0 && !vehiclesLoading && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                  {locale === 'ar' ? 'لا توجد مركبات مطابقة' : 'No vehicles found'}
                </div>
              )}
              {vehiclesError && (
                <p className="text-xs text-red-600 mt-1">
                  {locale === 'ar' ? 'تعذر تحميل المركبات' : 'Unable to load vehicles'}
                </p>
              )}
              {!vehiclesLoading && !vehiclesError && vehicles.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  {locale === 'ar' ? 'لا توجد مركبات. ' : 'No vehicles found. '}
                  <Link href={`/${locale}/dashboard/vehicles/new`} className="underline font-medium">
                    {locale === 'ar' ? 'أضف مركبة أولاً' : 'Add a vehicle first'}
                  </Link>
                </p>
              )}
            </div>

            {/* Driver */}
            <div className="relative" ref={driverComboRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tt.driver}</label>
              <div className="relative">
                <input
                  type="text"
                  value={driverQuery}
                  placeholder={driversLoading ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...') : (locale === 'ar' ? 'ابحث بالاسم أو الجوال' : 'Search by name or phone')}
                  autoComplete="off"
                  disabled={driversLoading || drivers.length === 0}
                  className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  onChange={(e) => {
                    setDriverQuery(e.target.value);
                    setSelectedDriverId(undefined);
                    setDriverDropdownOpen(true);
                  }}
                  onFocus={() => setDriverDropdownOpen(true)}
                />
                {selectedDriverId && (
                  <button
                    type="button"
                    onClick={() => { setSelectedDriverId(undefined); setDriverQuery(''); setDriverDropdownOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    ×
                  </button>
                )}
              </div>
              {driverDropdownOpen && filteredDriverOptions.length > 0 && !driversLoading && (
                <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                  {filteredDriverOptions.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-start hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                          selectedDriverId === d.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'
                        }`}
                        onClick={() => {
                          setSelectedDriverId(d.id);
                          setDriverQuery(d.label);
                          setDriverDropdownOpen(false);
                        }}
                      >
                        <span className="font-semibold">{d.fullName}</span>
                        <span className="text-gray-400 text-xs ms-2">{d.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {driverDropdownOpen && driverQuery.trim() && filteredDriverOptions.length === 0 && !driversLoading && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                  {locale === 'ar' ? 'لا يوجد سائقون مطابقون' : 'No drivers found'}
                </div>
              )}
              {driversError && (
                <p className="text-xs text-red-600 mt-1">
                  {locale === 'ar' ? 'تعذر تحميل السائقين' : 'Unable to load drivers'}
                </p>
              )}
              {!driversLoading && !driversError && drivers.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  {locale === 'ar' ? 'لا يوجد سائقون. ' : 'No drivers found. '}
                  <Link href={`/${locale}/dashboard/drivers/new`} className="underline font-medium">
                    {locale === 'ar' ? 'أضف سائقاً أولاً' : 'Add a driver first'}
                  </Link>
                </p>
              )}
            </div>

            <Field label={locale === 'ar' ? 'نقطة الانطلاق' : 'Origin'} name="origin" required />
            <Field label={locale === 'ar' ? 'الوجهة' : 'Destination'} name="destination" required />

            <div>
              <DatePicker
                label={locale === 'ar' ? 'تاريخ الانطلاق' : 'Start Date'}
                value={scheduledStartDate}
                onChange={setScheduledStartDate}
                placeholder={locale === 'ar' ? 'تاريخ الانطلاق' : 'Start Date'}
                isRTL={isRTL}
                outputCalendar="gregorian"
              />
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {locale === 'ar' ? 'وقت الانطلاق' : 'Start Time'}
                </label>
                <input
                  type="time"
                  name="scheduledStartTime"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <DatePicker
                label={locale === 'ar' ? 'تاريخ الوصول' : 'End Date'}
                value={scheduledEndDate}
                onChange={setScheduledEndDate}
                placeholder={locale === 'ar' ? 'تاريخ الوصول' : 'End Date'}
                isRTL={isRTL}
                outputCalendar="gregorian"
              />
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {locale === 'ar' ? 'وقت الوصول' : 'End Time'}
                </label>
                <input
                  type="time"
                  name="scheduledEndTime"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                name="notes"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Redirect banner for DAILY — use Contracts section */}
        {(tripType as string) === 'DAILY' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              {locale === 'ar' ? 'العقود اليومية تُدار عبر قسم العقود' : 'Daily trips are managed via Contracts'}
            </p>
            <p className="text-xs text-amber-700 mb-3">
              {locale === 'ar'
                ? 'أنشئ عقداً يومياً لتوليد رحلات متعددة بشكل تلقائي بناءً على جدول أسبوعي.'
                : 'Create a daily contract to automatically generate trips based on a weekly schedule.'}
            </p>
            <Link
              href={`/${locale}/dashboard/contracts/new`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              {locale === 'ar' ? 'إضافة عقد يومي' : 'Create Daily Contract'}
            </Link>
          </div>
        )}

        {/* Redirect banner for CAR_RENT — use Rentals section */}
        {(tripType as string) === 'CAR_RENT' && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-purple-800 mb-1">
              {locale === 'ar' ? 'تأجير السيارات يُدار عبر قسم الإيجار' : 'Car rentals are managed via Rentals'}
            </p>
            <p className="text-xs text-purple-700 mb-3">
              {locale === 'ar'
                ? 'أنشئ سجل إيجار لتتبع استلام وإعادة المركبة مع بيانات العميل والأجرة.'
                : 'Create a rental record to track vehicle pickup, return, client info, and daily rate.'}
            </p>
            <Link
              href={`/${locale}/dashboard/rentals/new`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              {locale === 'ar' ? 'إضافة إيجار سيارة' : 'Create Car Rental'}
            </Link>
          </div>
        )}

        {createMutation.isError && (
          <p className="text-sm text-red-600">
            {(createMutation.error as any)?.response?.data?.message ?? 'An error occurred'}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !canSubmit || !scheduledStartDate || !scheduledEndDate}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending
              ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving...')
              : (locale === 'ar' ? 'حفظ الرحلة' : 'Save Trip')}
          </button>
          <Link
            href={`/${locale}/dashboard/trips`}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {tc.confirmNo}
          </Link>
        </div>
        </>)}
      </form>
    </div>
  );
}
