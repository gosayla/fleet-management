'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDateTime, formatEnumLabel } from '@/lib/i18n';
import { Trip, TripStatus, TripType } from '@fleet/shared';
import { ArrowLeft, ArrowRight, Car, MapPin, User } from 'lucide-react';
import { TripLegBadge } from '@/components/ui/trip-leg-badge';

type TripDetails = Trip & {
  vehicle?: { id: string; plateNumber: string; make: string; model: string } | null;
  driver?: { id: string; fullName: string; phone: string } | null;
};

const statusColors: Record<TripStatus, string> = {
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

const typeColors: Record<TripType, string> = {
  ONE_TIME: 'bg-blue-50 text-blue-700',
  DAILY: 'bg-amber-50 text-amber-700',
  CAR_RENT: 'bg-purple-50 text-purple-700',
};

function tripTypeLabel(type: TripType, locale: string, t: any) {
  if (type === 'DAILY') return t.trips.typeDaily;
  if (type === 'CAR_RENT') return t.trips.typeCarRent;
  return t.trips.typeOneTime;
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-1 text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;

  const { locale, isRTL, t } = useLocale();
  const tc = t.common;
  const tt = t.trips;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;
  const [userRole, setUserRole] = useState<string | null>(null);
  const isDriver = userRole === 'DRIVER';

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole'));
  }, []);

  const { data: trip, isLoading } = useQuery<TripDetails>({
    queryKey: ['trip', tripId],
    queryFn: () => api.get(`/trips/${tripId}`).then((r) => r.data),
    enabled: !!tripId,
  });

  if (isLoading || !trip) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const tripType = ((trip as any).tripType ?? 'ONE_TIME') as TripType;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/dashboard/trips`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowBack className="w-4 h-4" />
          {tt.title}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{trip.origin} → {trip.destination}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[trip.status]}`}>
              {formatEnumLabel('tripStatus', trip.status, locale)}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[tripType]}`}>
              {tripTypeLabel(tripType, locale, t)}
            </span>
            <TripLegBadge leg={(trip as any).leg} locale={locale} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {tt.title}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label={tt.route} value={`${trip.origin} → ${trip.destination}`} />
          <InfoRow label={tt.scheduled} value={formatDateTime(trip.scheduledStart, locale)} />
          <InfoRow
            label={locale === 'ar' ? 'الوصول المتوقع' : 'Expected End'}
            value={formatDateTime(trip.scheduledEnd, locale)}
          />
          {(trip as any).actualStart && (
            <InfoRow
              label={locale === 'ar' ? 'الانطلاق الفعلي' : 'Actual Start'}
              value={formatDateTime((trip as any).actualStart, locale)}
            />
          )}
          {(trip as any).actualEnd && (
            <InfoRow
              label={locale === 'ar' ? 'الوصول الفعلي' : 'Actual End'}
              value={formatDateTime((trip as any).actualEnd, locale)}
            />
          )}
          {(trip as any).notes && <InfoRow label={locale === 'ar' ? 'ملاحظات' : 'Notes'} value={(trip as any).notes} />}
          {(trip as any).naqlPermitId && <InfoRow label={locale === 'ar' ? 'تصريح نقل' : 'Naql Permit'} value={(trip as any).naqlPermitId} mono />}
        </dl>
      </div>

      {(tripType === 'DAILY') && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {locale === 'ar' ? 'العقد والعميل' : 'Contract & Client'}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {(trip as any).clientName && <InfoRow label={tt.clientName} value={(trip as any).clientName} />}
            {(trip as any).contractNumber && <InfoRow label={tt.contractNumber} value={(trip as any).contractNumber} mono />}
            {(trip as any).contractStart && (
              <InfoRow label={tt.contractStart} value={formatDateTime((trip as any).contractStart, locale)} />
            )}
            {(trip as any).contractEnd && (
              <InfoRow label={tt.contractEnd} value={formatDateTime((trip as any).contractEnd, locale)} />
            )}
          </dl>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Car className="w-4 h-4" />
            {tt.vehicle}
          </h2>
          {(trip as any).vehicle ? (
            isDriver ? (
              <p className="text-gray-700 text-sm font-medium">
                {(trip as any).vehicle.plateNumber} — {(trip as any).vehicle.make} {(trip as any).vehicle.model}
              </p>
            ) : (
              <Link
                href={`/${locale}/dashboard/vehicles/${(trip as any).vehicle.id}`}
                className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
              >
                {(trip as any).vehicle.plateNumber} — {(trip as any).vehicle.make} {(trip as any).vehicle.model}
              </Link>
            )
          ) : (
            <p className="text-gray-400 text-sm">{tc.empty}</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            {tt.driver}
          </h2>
          {(trip as any).driver ? (
            isDriver ? (
              <p className="text-gray-700 text-sm font-medium">{(trip as any).driver.fullName}</p>
            ) : (
              <Link
                href={`/${locale}/dashboard/drivers/${(trip as any).driver.id}`}
                className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
              >
                {(trip as any).driver.fullName}
              </Link>
            )
          ) : (
            <p className="text-gray-400 text-sm">{tc.empty}</p>
          )}
        </div>
      </div>
    </div>
  );
}
