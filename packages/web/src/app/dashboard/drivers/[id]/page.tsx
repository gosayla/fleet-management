'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api, { resolveUploadedAssetUrl } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatEnumLabel } from '@/lib/i18n';
import { Driver, DriverStatus } from '@fleet/shared';
import { ArrowLeft, ArrowRight, Camera, Car, Pencil, Plus, User, X } from 'lucide-react';
import { TripLegBadge } from '@/components/ui/trip-leg-badge';

type VehicleBrief = { id: string; plateNumber: string; make: string; model: string; status: string };

type DriverDetails = Driver & {
  photoUrl?: string | null;
  vehicles?: VehicleBrief[];
  trips?: Array<{
    id: string;
    leg?: string;
    origin: string;
    destination: string;
    status: string;
    scheduledStart: string;
  }>;
};

const statusColors: Record<DriverStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  OFF_DUTY: 'bg-gray-100 text-gray-600',
  ON_LEAVE: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

export default function DriverDetailPage() {
  const params = useParams<{ id: string }>();
  const driverId = params.id;

  const { locale, isRTL, t } = useLocale();
  const td = t.drivers;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const { data: driver, isLoading } = useQuery<DriverDetails>({
    queryKey: ['driver', driverId],
    queryFn: () => api.get(`/drivers/${driverId}`).then((r) => r.data),
    enabled: !!driverId,
  });

  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [showAssignVehicleModal, setShowAssignVehicleModal] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');

  const { data: allVehicles } = useQuery<VehicleBrief[]>({
    queryKey: ['vehicles-list'],
    queryFn: () => api.get('/vehicles').then((r) => r.data?.data ?? r.data),
    enabled: showAssignVehicleModal,
  });

  const assignVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => api.post(`/vehicles/${vehicleId}/drivers/${driverId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
      setShowAssignVehicleModal(false);
      setVehicleSearch('');
    },
  });

  const removeVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => api.delete(`/vehicles/${vehicleId}/drivers/${driverId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver', driverId] }),
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/drivers/${driverId}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver', driverId] }),
  });

  if (isLoading || !driver) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/dashboard/drivers`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowBack className="w-4 h-4" />
          {td.title}
        </Link>
        <Link
          href={`/${locale}/dashboard/drivers/${driverId}/edit`}
          className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          {tc.edit}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="relative group w-14 h-14 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center border-2 border-blue-200 cursor-pointer"
          onClick={() => {
            if (driver.photoUrl) {
              setPreviewPhotoUrl(resolveUploadedAssetUrl(driver.photoUrl));
            } else {
              photoInputRef.current?.click();
            }
          }}
        >
          {driver.photoUrl
            ? <img src={resolveUploadedAssetUrl(driver.photoUrl)} alt={driver.fullName} className="w-full h-full object-cover" />
            : <User className="w-6 h-6 text-blue-600" />
          }
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadPhotoMutation.mutate(f);
            e.target.value = '';
          }}
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{driver.fullName}</h1>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[driver.status]}`}>
            {formatEnumLabel('driverStatus', driver.status, locale)}
          </span>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Camera className="h-3.5 w-3.5" />
              {isRTL ? 'تغيير الصورة' : 'Change Photo'}
            </button>
          </div>
        </div>
      </div>

      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewPhotoUrl(null)}>
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-black" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-gray-700 hover:bg-white"
              aria-label={isRTL ? 'إغلاق' : 'Close'}
            >
              <X className="h-4 w-4" />
            </button>
            <img src={previewPhotoUrl} alt={driver.fullName} className="max-h-[90vh] w-full object-contain" />
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {td.detailsTitle}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label={td.phone} value={driver.phone} />
          {driver.email && <InfoRow label={td.email} value={driver.email} />}
          <InfoRow label={td.nationalId} value={driver.nationalId} mono />
          <InfoRow label={td.licenseExpiry} value={formatDate(driver.licenseExpiry, locale)} />
          {(driver as any).bloodType && (
            <InfoRow
              label={td.bloodType}
              value={{ A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−', AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−' }[(driver as any).bloodType as string] ?? (driver as any).bloodType}
            />
          )}
          <InfoRow
            label={td.status}
            value={formatEnumLabel('driverStatus', driver.status, locale)}
          />
        </dl>
      </div>

      {/* Assigned vehicles */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Car className="w-4 h-4" />
            {td.assignedVehicle}
          </h2>
          <button
            onClick={() => setShowAssignVehicleModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isRTL ? 'إضافة مركبة' : 'Add Vehicle'}
          </button>
        </div>
        {(driver.vehicles ?? []).length === 0 ? (
          <p className="text-gray-400 text-sm">{tc.empty}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(driver.vehicles ?? []).map((v) => (
              <div key={v.id} className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                <Car className="w-3.5 h-3.5 text-gray-500" />
                <Link href={`/${locale}/dashboard/vehicles/${v.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600">
                  {v.plateNumber} — {v.make} {v.model}
                </Link>
                <button
                  onClick={() => { if (window.confirm(isRTL ? 'إلغاء تعيين المركبة؟' : 'Unassign vehicle?')) removeVehicleMutation.mutate(v.id); }}
                  className="text-gray-400 hover:text-red-600 ml-1"
                  title={isRTL ? 'إلغاء التعيين' : 'Unassign'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent trips */}
      {driver.trips && driver.trips.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {t.trips.title}
          </h2>
          <ul className="divide-y divide-gray-50">
            {driver.trips.slice(0, 5).map((trip) => (
              <li key={trip.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {trip.origin} → {trip.destination}
                  </p>
                  <div className="mt-1">
                    <TripLegBadge leg={trip.leg} locale={locale} />
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(trip.scheduledStart, locale)}</p>
                </div>
                <Link
                  href={`/${locale}/dashboard/trips/${trip.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {tc.view}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Assign Vehicle Modal */}
      {showAssignVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">{isRTL ? 'إضافة مركبة' : 'Assign Vehicle'}</h3>
              <button onClick={() => { setShowAssignVehicleModal(false); setVehicleSearch(''); }} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <input
                autoFocus
                type="text"
                placeholder={isRTL ? 'ابحث باللوحة أو الموديل...' : 'Search by plate or model...'}
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {(allVehicles ?? [])
                  .filter((v) => {
                    const q = vehicleSearch.toLowerCase();
                    const alreadyAssigned = (driver.vehicles ?? []).some((a) => a.id === v.id);
                    return !alreadyAssigned && (v.plateNumber.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q));
                  })
                  .map((v) => (
                    <button
                      key={v.id}
                      onClick={() => assignVehicleMutation.mutate(v.id)}
                      disabled={assignVehicleMutation.isPending}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-blue-50 disabled:opacity-50"
                    >
                      <Car className="h-5 w-5 text-gray-400 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{v.plateNumber}</div>
                        <div className="text-xs text-gray-500">{v.make} {v.model}</div>
                      </div>
                    </button>
                  ))}
                {(allVehicles ?? []).filter((v) => !(driver.vehicles ?? []).some((a) => a.id === v.id)).length === 0 && (
                  <div className="py-6 text-center text-sm text-gray-400">{isRTL ? 'لا توجد مركبات متاحة' : 'No vehicles available'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
