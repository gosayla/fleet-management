'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Pencil, ChevronDown, X } from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { MaintenanceLog, MaintenanceStatus, MaintenanceType, Vehicle } from '@fleet/shared';
import { formatEnumLabel } from '@/lib/i18n';
import { DatePicker } from '@/components/ui/date-picker';

type MaintenanceDetails = MaintenanceLog & {
  vehicle?: { id: string; plateNumber: string; make: string; model: string } | null;
};

function Field({
  label,
  name,
  type = 'text',
  defaultValue = '',
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default function EditMaintenancePage() {
  const params = useParams<{ id: string }>();
  const maintenanceId = params.id;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tm = t.maintenance;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const [scheduledDate, setScheduledDate] = useState<string | undefined>(undefined);
  const [nextServiceDate, setNextServiceDate] = useState<string | undefined>(undefined);
  const [completedDate, setCompletedDate] = useState<string | undefined>(undefined);

  const [vehicleId, setVehicleId] = useState<string>('');
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const vehicleComboRef = useRef<HTMLDivElement>(null);

  const { data: log, isLoading: logLoading } = useQuery<MaintenanceDetails>({
    queryKey: ['maintenance', maintenanceId],
    queryFn: () => api.get(`/maintenance/${maintenanceId}`).then((r) => r.data),
    enabled: !!maintenanceId,
  });

  const { data: vehiclesResponse } = useQuery<{ data: Vehicle[] } | Vehicle[]>({
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

  useEffect(() => {
    if (!log) return;
    setVehicleId(log.vehicleId ?? '');
    setScheduledDate(log.scheduledDate ? new Date(log.scheduledDate).toISOString().split('T')[0] : undefined);
    setNextServiceDate(log.nextServiceDate ? new Date(log.nextServiceDate).toISOString().split('T')[0] : undefined);
    setCompletedDate(log.completedDate ? new Date(log.completedDate).toISOString().split('T')[0] : undefined);
  }, [log]);

  useEffect(() => {
    if (!log || vehicles.length === 0) return;
    const v = vehicles.find((v) => v.id === log.vehicleId);
    if (v) setVehicleQuery(`${v.plateNumber} — ${v.make} ${v.model}`);
  }, [log, vehicles]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch(`/maintenance/${maintenanceId}`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance', maintenanceId] });
      router.push(`/${locale}/dashboard/maintenance/${maintenanceId}`);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const payload: Record<string, unknown> = {
      vehicleId: vehicleId,
      type: String(fd.get('type') ?? MaintenanceType.SCHEDULED) as MaintenanceType,
      status: String(fd.get('status') ?? MaintenanceStatus.PENDING) as MaintenanceStatus,
      description: String(fd.get('description') ?? '').trim(),
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      nextServiceKm: String(fd.get('nextServiceKm') ?? '').trim()
        ? Number(fd.get('nextServiceKm'))
        : undefined,
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : undefined,
      completedDate: completedDate ? new Date(completedDate) : undefined,
      costSar: String(fd.get('costSar') ?? '').trim() ? Number(fd.get('costSar')) : undefined,
      odometerAtService: String(fd.get('odometerAtService') ?? '').trim()
        ? Number(fd.get('odometerAtService'))
        : undefined,
    };

    updateMutation.mutate(payload);
  }

  if (logLoading || !log) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/maintenance/${maintenanceId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {tc.view}
      </Link>

      <div className="flex items-center gap-3">
        <Pencil className="w-6 h-6 text-amber-600" />
        <h1 className="text-2xl font-bold text-gray-900">{locale === 'ar' ? 'تعديل سجل الصيانة' : 'Edit Maintenance Log'}</h1>
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
                    {filteredVehicles.length === 0 ? (
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
                defaultValue={log.type}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(MaintenanceType).map((type) => (
                  <option key={type} value={type}>
                    {formatEnumLabel('maintenanceType', type, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tm.status}</label>
              <select
                name="status"
                defaultValue={log.status}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(MaintenanceStatus).map((status) => (
                  <option key={status} value={status}>
                    {formatEnumLabel('maintenanceStatus', status, locale)}
                  </option>
                ))}
              </select>
            </div>

            <Field label={tm.description} name="description" defaultValue={log.description} />

            <DatePicker
              label={tm.scheduled}
              value={scheduledDate}
              onChange={setScheduledDate}
              placeholder={tm.scheduled}
              isRTL={isRTL}
              outputCalendar="gregorian"
            />

            <DatePicker
              label={locale === 'ar' ? 'تاريخ الإنجاز' : 'Completed Date'}
              value={completedDate}
              onChange={setCompletedDate}
              placeholder={locale === 'ar' ? 'تاريخ الإنجاز' : 'Completed Date'}
              isRTL={isRTL}
              outputCalendar="gregorian"
            />

            <Field
              label={tm.cost}
              name="costSar"
              type="number"
              defaultValue={log.costSar ?? ''}
              placeholder="0"
            />

            <Field
              label={locale === 'ar' ? 'عداد المسافة عند الصيانة' : 'Odometer At Service'}
              name="odometerAtService"
              type="number"
              defaultValue={log.odometerAtService ?? ''}
              placeholder="0"
            />

            <Field
              label={locale === 'ar' ? 'الكم القادم للصيانة' : 'Next Service KM'}
              name="nextServiceKm"
              type="number"
              defaultValue={log.nextServiceKm ?? ''}
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

        {updateMutation.isError && (
          <p className="text-sm text-red-600">
            {(updateMutation.error as any)?.response?.data?.message ?? 'An error occurred'}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending || !scheduledDate}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving...') : (locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
          </button>
          <Link
            href={`/${locale}/dashboard/maintenance/${maintenanceId}`}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {tc.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}
