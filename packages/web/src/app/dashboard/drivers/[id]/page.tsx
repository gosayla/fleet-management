'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatEnumLabel } from '@/lib/i18n';
import { Driver, DriverStatus } from '@fleet/shared';
import { ArrowLeft, ArrowRight, Car, Pencil, User } from 'lucide-react';

type DriverDetails = Driver & {
  assignedVehicle?: { id: string; plateNumber: string; make: string; model: string } | null;
  trips?: Array<{
    id: string;
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
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{driver.fullName}</h1>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[driver.status]}`}>
            {formatEnumLabel('driverStatus', driver.status, locale)}
          </span>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {td.detailsTitle}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label={td.phone} value={driver.phone} />
          {driver.email && <InfoRow label={td.email} value={driver.email} />}
          <InfoRow label={td.nationalId} value={driver.nationalId} mono />
          <InfoRow label={td.licenseNumber} value={driver.licenseNumber} mono />
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

      {/* Assigned vehicle */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Car className="w-4 h-4" />
          {td.assignedVehicle}
        </h2>
        {driver.assignedVehicle ? (
          <Link
            href={`/${locale}/dashboard/vehicles/${driver.assignedVehicle.id}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
          >
            {driver.assignedVehicle.plateNumber} — {driver.assignedVehicle.make} {driver.assignedVehicle.model}
          </Link>
        ) : (
          <p className="text-gray-400 text-sm">{tc.empty}</p>
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
