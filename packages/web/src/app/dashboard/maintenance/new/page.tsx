import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata({ ar: 'طلب صيانة', en: 'New Maintenance' });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Wrench, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useMemo, useEffect } from 'react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { CreateMaintenanceDto, MaintenanceType, Vehicle } from '@fleet/shared';
import { DatePicker } from '@/components/ui/date-picker';

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

export default function NewMaintenancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tm = t.maintenance;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const [scheduledDate, setScheduledDate] = useState<string | undefined>(undefined);
  const [nextServiceDate, setNextServiceDate] = useState<string | undefined>(undefined);

  const [vehicleId, setVehicleId] = useState<string>('');
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
    function handleClickOutside(e: MouseEvent) {
      if (vehicleComboRef.current && !vehicleComboRef.current.contains(e.target as Node)) {
        setVehicleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [vehicleDropdownOpen]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateMaintenanceDto) => api.post('/maintenance', payload).then((r) => r.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      router.push(`/${locale}/dashboard/maintenance/${created.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (!scheduledDate) return;

    const payload: CreateMaintenanceDto = {
      vehicleId: vehicleId,
      type: String(fd.get('type') ?? 'SCHEDULED') as MaintenanceType,
      description: String(fd.get('description') ?? '').trim(),
      scheduledDate: new Date(scheduledDate),
      nextServiceKm: String(fd.get('nextServiceKm') ?? '').trim()
        ? Number(fd.get('nextServiceKm'))
        : undefined,
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : undefined,
    };

    createMutation.mutate(payload);
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/maintenance`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {tm.title}
      </Link>

      <div className="flex items-center gap-3">
        <Wrench className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{locale === 'ar' ? 'إضافة سجل صيانة' : 'Add Maintenance Log'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tm.vehicle}</label>
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
                      <li className="px-3 py-2 text-gray-400">{locale === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}</li>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tm.type}</label>
              <select
                name="type"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(MaintenanceType).map((type) => (
                  <option key={type} value={type}>
                    {type === 'SCHEDULED'
                      ? (locale === 'ar' ? 'دورية' : 'Scheduled')
                      : type === 'UNSCHEDULED'
                      ? (locale === 'ar' ? 'غير دورية' : 'Unscheduled')
                      : (locale === 'ar' ? 'طارئة' : 'Emergency')}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label={tm.description}
              name="description"
              required
              placeholder={locale === 'ar' ? 'مثال: تغيير زيت وفلتر' : 'Example: Oil and filter change'}
            />

            <DatePicker
              label={tm.scheduled}
              value={scheduledDate}
              onChange={setScheduledDate}
              placeholder={tm.scheduled}
              isRTL={isRTL}
              outputCalendar="gregorian"
            />

            <Field
              label={locale === 'ar' ? 'الكم القادم للصيانة' : 'Next Service KM'}
              name="nextServiceKm"
              type="number"
              placeholder="10000"
            />

            <DatePicker
              label={locale === 'ar' ? 'تاريخ الصيانة القادم' : 'Next Service Date'}
              value={nextServiceDate}
              onChange={setNextServiceDate}
              placeholder={locale === 'ar' ? 'تاريخ الصيانة القادم' : 'Next Service Date'}
              isRTL={isRTL}
              outputCalendar="gregorian"
            />
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
            disabled={createMutation.isPending || !scheduledDate || !vehicleId}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving...') : (locale === 'ar' ? 'حفظ السجل' : 'Save Log')}
          </button>
          <Link
            href={`/${locale}/dashboard/maintenance`}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {tc.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}
