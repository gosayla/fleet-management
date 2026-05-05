'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatEnumLabel, formatNumber } from '@/lib/i18n';
import { MaintenanceLog, MaintenanceStatus } from '@fleet/shared';
import { ArrowLeft, ArrowRight, Car, Pencil, Wrench } from 'lucide-react';

type MaintenanceDetails = MaintenanceLog & {
  vehicle?: { id: string; plateNumber: string; make: string; model: string } | null;
};

const statusColors: Record<MaintenanceStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default function MaintenanceDetailPage() {
  const params = useParams<{ id: string }>();
  const maintenanceId = params.id;

  const { locale, isRTL, t } = useLocale();
  const tm = t.maintenance;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const { data: log, isLoading } = useQuery<MaintenanceDetails>({
    queryKey: ['maintenance', maintenanceId],
    queryFn: () => api.get(`/maintenance/${maintenanceId}`).then((r) => r.data),
    enabled: !!maintenanceId,
  });

  if (isLoading || !log) {
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
          href={`/${locale}/dashboard/maintenance`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowBack className="w-4 h-4" />
          {tm.title}
        </Link>
        <Link
          href={`/${locale}/dashboard/maintenance/${maintenanceId}/edit`}
          className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          {tc.edit}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <Wrench className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{formatEnumLabel('maintenanceType', log.type, locale)}</h1>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[log.status]}`}>
            {formatEnumLabel('maintenanceStatus', log.status, locale)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          {tm.title}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label={tm.description} value={log.description} />
          <InfoRow label={tm.scheduled} value={formatDate(log.scheduledDate, locale)} />
          {log.completedDate && (
            <InfoRow
              label={locale === 'ar' ? 'تاريخ الإنجاز' : 'Completed Date'}
              value={formatDate(log.completedDate, locale)}
            />
          )}
          <InfoRow
            label={tm.cost}
            value={log.costSar != null ? formatNumber(log.costSar, locale) : tc.empty}
          />
          {log.odometerAtService != null && (
            <InfoRow
              label={locale === 'ar' ? 'عداد المسافة عند الصيانة' : 'Odometer At Service'}
              value={formatNumber(log.odometerAtService, locale)}
            />
          )}
          {log.nextServiceKm != null && (
            <InfoRow
              label={locale === 'ar' ? 'الكم القادم للصيانة' : 'Next Service KM'}
              value={formatNumber(log.nextServiceKm, locale)}
            />
          )}
          {log.nextServiceDate && (
            <InfoRow
              label={locale === 'ar' ? 'تاريخ الصيانة القادم' : 'Next Service Date'}
              value={formatDate(log.nextServiceDate, locale)}
            />
          )}
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Car className="w-4 h-4" />
          {tm.vehicle}
        </h2>
        {log.vehicle ? (
          <Link
            href={`/${locale}/dashboard/vehicles/${log.vehicle.id}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
          >
            {log.vehicle.plateNumber} — {log.vehicle.make} {log.vehicle.model}
          </Link>
        ) : (
          <p className="text-gray-400 text-sm">{tc.empty}</p>
        )}
      </div>
    </div>
  );
}
