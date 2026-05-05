'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Fuel, Car, User, Calendar, Gauge, MapPin, DollarSign } from 'lucide-react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { FuelLog, Driver, Vehicle } from '@fleet/shared';
import { formatDate, formatNumber } from '@/lib/i18n';

type FuelLogDetails = FuelLog & {
  vehicle?: Pick<Vehicle, 'id' | 'plateNumber' | 'make' | 'model'> | null;
  driver?: Pick<Driver, 'id' | 'fullName' | 'phone'> | null;
};

export default function FuelLogDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale, isRTL, t } = useLocale();
  const tf = t.fuel;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const { data: log, isLoading } = useQuery<FuelLogDetails>({
    queryKey: ['fuel-log', params.id],
    queryFn: () => api.get(`/fuel/${params.id}`).then((r) => r.data),
    enabled: !!params.id,
  });

  if (isLoading || !log) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
        <div className="mt-0.5 text-gray-400">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
          <div className="text-sm font-medium text-gray-800 break-words">{value}</div>
        </div>
      </div>
    );
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
          {locale === 'ar' ? 'تفاصيل سجل الوقود' : 'Fuel Log Details'}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Fuel info card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-0">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {locale === 'ar' ? 'معلومات التعبئة' : 'Fill Details'}
          </h2>

          <Row
            icon={<Calendar className="w-4 h-4" />}
            label={tf.filledAt}
            value={formatDate(log.filledAt, locale)}
          />
          <Row
            icon={<Fuel className="w-4 h-4" />}
            label={tf.liters}
            value={`${formatNumber(log.liters, locale)} L`}
          />
          <Row
            icon={<DollarSign className="w-4 h-4" />}
            label={tf.cost}
            value={`${formatNumber(log.costSar, locale)} ${locale === 'ar' ? 'ر.س' : 'SAR'}`}
          />
          <Row
            icon={<Gauge className="w-4 h-4" />}
            label={tf.odometer}
            value={`${formatNumber(log.odometer, locale)} km`}
          />
          {log.station && (
            <Row
              icon={<MapPin className="w-4 h-4" />}
              label={tf.station}
              value={log.station}
            />
          )}
        </div>

        {/* Vehicle & Driver card */}
        <div className="space-y-4">
          {/* Vehicle */}
          {log.vehicle && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {tf.vehicle}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{log.vehicle.plateNumber}</p>
                  <p className="text-sm text-gray-500">{log.vehicle.make} {log.vehicle.model}</p>
                </div>
              </div>
              <Link
                href={`/${locale}/dashboard/vehicles/${log.vehicle.id}`}
                className="mt-3 inline-flex text-xs text-blue-600 hover:underline"
              >
                {tc.view} →
              </Link>
            </div>
          )}

          {/* Driver */}
          {log.driver && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {tf.driver}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{log.driver.fullName}</p>
                  <p className="text-sm text-gray-500">{log.driver.phone}</p>
                </div>
              </div>
              <Link
                href={`/${locale}/dashboard/drivers/${log.driver.id}`}
                className="mt-3 inline-flex text-xs text-blue-600 hover:underline"
              >
                {tc.view} →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
