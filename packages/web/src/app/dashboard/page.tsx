'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FleetStats } from '@fleet/shared';
import {
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  AlertTriangle,
  FileWarning,
  Activity,
} from 'lucide-react';
import { formatCurrencySar, formatNumber } from '@/lib/i18n';
import { useLocale } from '@/providers/locale-provider';

import { useRouter } from 'next/navigation';

async function fetchStats(): Promise<FleetStats> {
  const res = await api.get('/dashboard/stats');
  return res.data as FleetStats;
}

type ExpiringSummary = {
  expired: { id: string }[];
  critical: { id: string }[];
  warning: { id: string }[];
};

async function fetchExpiring(): Promise<ExpiringSummary> {
  const res = await api.get('/documents/expiring');
  return res.data as ExpiringSummary;
}

export default function DashboardPage() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    refetchInterval: 30_000,
  });
  const { data: expiring } = useQuery({
    queryKey: ['documents-expiring'],
    queryFn: fetchExpiring,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const cards = [
    {
      label: t.dashboard.totalVehicles,
      value: formatNumber(stats?.totalVehicles ?? 0, locale),
      sub: `${formatNumber(stats?.activeVehicles ?? 0, locale)} ${t.dashboard.activeVehicles}`,
      icon: Truck,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: t.dashboard.drivers,
      value: formatNumber(stats?.totalDrivers ?? 0, locale),
      sub: `${formatNumber(stats?.activeDrivers ?? 0, locale)} ${t.dashboard.onDuty}`,
      icon: Users,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: t.dashboard.tripsToday,
      value: formatNumber(stats?.tripsToday ?? 0, locale),
      sub: `${formatNumber(stats?.tripsInProgress ?? 0, locale)} ${t.dashboard.inProgress}`,
      icon: Route,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: t.dashboard.inMaintenance,
      value: formatNumber(stats?.vehiclesInMaintenance ?? 0, locale),
      sub: t.dashboard.vehiclesSuffix,
      icon: Wrench,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: t.dashboard.fuelCostMonth,
      value: formatCurrencySar(stats?.fuelCostThisMonth ?? 0, locale),
      sub: t.dashboard.thisMonth,
      icon: Fuel,
      color: 'text-cyan-600 bg-cyan-50',
    },
    {
      label: t.dashboard.maintenanceCost,
      value: formatCurrencySar(stats?.maintenanceCostThisMonth ?? 0, locale),
      sub: t.dashboard.thisMonth,
      icon: Wrench,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      label: t.dashboard.pendingViolations,
      value: formatNumber(stats?.pendingViolations ?? 0, locale),
      sub: t.dashboard.unpaidTamm,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
    {
      label: t.dashboard.expiringDocuments,
      value: formatNumber(stats?.expiringDocuments ?? 0, locale),
      sub: t.dashboard.within30Days,
      icon: FileWarning,
      color: 'text-pink-600 bg-pink-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500 font-medium">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Document Expiry Widget */}
      {expiring && (expiring.expired.length > 0 || expiring.critical.length > 0 || expiring.warning.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileWarning className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-800">{locale === 'ar' ? 'تنبيهات انتهاء الوثائق' : 'Document Expiry Alerts'}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {expiring.expired.length > 0 && (
              <button
                onClick={() => router.push(`/${locale}/dashboard/documents`)}
                className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                <AlertTriangle className="w-4 h-4" />
                {expiring.expired.length} {locale === 'ar' ? 'منتهية الصلاحية' : 'Expired'}
              </button>
            )}
            {expiring.critical.length > 0 && (
              <button
                onClick={() => router.push(`/${locale}/dashboard/documents`)}
                className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
              >
                <AlertTriangle className="w-4 h-4" />
                {expiring.critical.length} {locale === 'ar' ? 'تنتهي خلال 30 يومًا' : 'Expiring in ≤30 days'}
              </button>
            )}
            {expiring.warning.length > 0 && (
              <button
                onClick={() => router.push(`/${locale}/dashboard/documents`)}
                className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
              >
                <AlertTriangle className="w-4 h-4" />
                {expiring.warning.length} {locale === 'ar' ? 'تنتهي خلال 60 يومًا' : 'Expiring in ≤60 days'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
