'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { BloodType, Driver, DriverStatus, UpdateDriverDto, Vehicle } from '@fleet/shared';
import { useLocale } from '@/providers/locale-provider';
import { formatEnumLabel } from '@/lib/i18n';
import { DatePicker } from '@/components/ui/date-picker';

const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POS: 'A+',
  A_NEG: 'A−',
  B_POS: 'B+',
  B_NEG: 'B−',
  AB_POS: 'AB+',
  AB_NEG: 'AB−',
  O_POS: 'O+',
  O_NEG: 'O−',
};

type DriverDetails = Driver & {
  assignedVehicle?: { id: string; plateNumber: string } | null;
};

function Field({
  label,
  name,
  type = 'text',
  defaultValue = '',
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default function EditDriverPage() {
  const params = useParams<{ id: string }>();
  const driverId = params.id;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const td = t.drivers;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;
  const [licenseExpiry, setLicenseExpiry] = useState<string | undefined>(undefined);
  const [bloodType, setBloodType] = useState<BloodType | ''>('');
  const [assignedVehicleId, setAssignedVehicleId] = useState<string | undefined>(undefined);

  const { data: driver, isLoading: driverLoading } = useQuery<DriverDetails>({
    queryKey: ['driver', driverId],
    queryFn: () => api.get(`/drivers/${driverId}`).then((r) => r.data),
    enabled: !!driverId,
  });

  const { data: vehiclesResponse } = useQuery<{ data: Vehicle[] } | Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then((r) => r.data),
  });

  const vehicles = Array.isArray(vehiclesResponse) ? vehiclesResponse : (vehiclesResponse?.data ?? []);

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

  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const vehicleComboRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (vehicleComboRef.current && !vehicleComboRef.current.contains(e.target as Node)) {
        setVehicleDropdownOpen(false);
      }
    }
    if (vehicleDropdownOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [vehicleDropdownOpen]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateDriverDto) =>
      api.patch(`/drivers/${driverId}`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
      router.push(`/${locale}/dashboard/drivers/${driverId}`);
    },
  });

  useEffect(() => {
    if (!driver?.licenseExpiry) {
      setLicenseExpiry(undefined);
      return;
    }

    setLicenseExpiry(new Date(driver.licenseExpiry).toISOString().split('T')[0]);
    setBloodType((driver as any).bloodType ?? '');
  }, [driver?.licenseExpiry]);

  useEffect(() => {
    if (!driver) return;
    const currentId = driver.assignedVehicleId ?? undefined;
    setAssignedVehicleId(currentId);
    if (!currentId) { setVehicleQuery(''); return; }
    const option = vehicleOptions.find((v) => v.id === currentId);
    setVehicleQuery(option?.label ?? (driver.assignedVehicle?.plateNumber ?? ''));
  }, [driver, vehicleOptions]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsedLicenseExpiry = new Date(licenseExpiry ?? '');

    if (!licenseExpiry || Number.isNaN(parsedLicenseExpiry.getTime())) {
      return;
    }

    const payload: UpdateDriverDto = {
      fullName: String(fd.get('fullName') ?? '').trim(),
      phone: String(fd.get('phone') ?? '').trim(),
      email: String(fd.get('email') ?? '').trim() || undefined,
      nationalId: String(fd.get('nationalId') ?? '').trim(),
      licenseExpiry: parsedLicenseExpiry,
      status: String(fd.get('status') ?? DriverStatus.ACTIVE) as DriverStatus,
      bloodType: bloodType || undefined,
      assignedVehicleId,
    };

    updateMutation.mutate(payload);
  }

  if (driverLoading || !driver) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/drivers/${driverId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {tc.view}
      </Link>

      <div className="flex items-center gap-3">
        <Pencil className="w-6 h-6 text-amber-600" />
        <h1 className="text-2xl font-bold text-gray-900">{td.editTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={td.name} name="fullName" defaultValue={driver.fullName} required />
            <Field label={td.phone} name="phone" type="tel" defaultValue={driver.phone} required />
            <Field label={td.email} name="email" type="email" defaultValue={driver.email ?? ''} />
            <Field label={td.nationalId} name="nationalId" defaultValue={driver.nationalId} required />
            <DatePicker
              label={td.licenseExpiry}
              value={licenseExpiry}
              onChange={setLicenseExpiry}
              placeholder={td.licenseExpiry}
              isRTL={isRTL}
              outputCalendar="gregorian"
            />

            {/* Blood Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{td.bloodType}</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value as BloodType | '')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {(Object.keys(BLOOD_TYPE_LABELS) as Array<keyof typeof BLOOD_TYPE_LABELS>).map((bt) => (
                  <option key={bt} value={bt}>{BLOOD_TYPE_LABELS[bt]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{td.status}</label>
              <select
                name="status"
                defaultValue={driver.status}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(DriverStatus).map((s) => (
                  <option key={s} value={s}>
                    {formatEnumLabel('driverStatus', s, locale)}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned vehicle — custom combobox */}
            <div className="relative" ref={vehicleComboRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{td.assignedVehicle}</label>
              <div className="relative">
                <input
                  type="text"
                  value={vehicleQuery}
                  placeholder={t.vehicles.search}
                  autoComplete="off"
                  className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    setVehicleQuery(e.target.value);
                    setAssignedVehicleId(undefined);
                    setVehicleDropdownOpen(true);
                  }}
                  onFocus={() => setVehicleDropdownOpen(true)}
                />
                {assignedVehicleId && (
                  <button
                    type="button"
                    onClick={() => { setAssignedVehicleId(undefined); setVehicleQuery(''); setVehicleDropdownOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    ×
                  </button>
                )}
              </div>
              {vehicleDropdownOpen && filteredVehicleOptions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                  <li>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-start text-gray-400 hover:bg-gray-50"
                      onClick={() => { setAssignedVehicleId(undefined); setVehicleQuery(''); setVehicleDropdownOpen(false); }}
                    >
                      — {tc.empty} —
                    </button>
                  </li>
                  {filteredVehicleOptions.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-start hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                          assignedVehicleId === v.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'
                        }`}
                        onClick={() => {
                          setAssignedVehicleId(v.id);
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
              {vehicleDropdownOpen && vehicleQuery.trim() && filteredVehicleOptions.length === 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                  No vehicles found
                </div>
              )}
            </div>
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
            disabled={updateMutation.isPending}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending ? td.saving : td.saveUpdate}
          </button>
          <Link
            href={`/${locale}/dashboard/drivers/${driverId}`}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {tc.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}
