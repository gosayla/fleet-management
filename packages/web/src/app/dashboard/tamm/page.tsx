import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata({ ar: 'تمم', en: 'Tamm' });
}

'use client';

import type { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shield, AlertTriangle, RefreshCw, Car, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatCurrencySar, formatDate, formatNumber, type Locale } from '@/lib/i18n';
import { useLocale } from '@/providers/locale-provider';

interface FleetVehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  sequenceNumber?: string;
  tammVehicleId?: string;
  licenseExpiryDate?: string;
  inspectionExpiryDate?: string;
  insuranceExpiryDate?: string;
  mvpiStatus?: string;
  insuranceStatus?: string;
  status: string;
}

interface FleetViolation {
  id: string;
  violationId: string;
  plateNumber: string;
  description: string;
  amount: number;
  issuedAt: Date;
  location?: string;
  isPaid: boolean;
}

interface FleetStatus {
  vehicles: FleetVehicle[];
  violations: FleetViolation[];
  lastSync?: { createdAt: Date; syncType: string; status: string };
}

interface SyncFailure {
  scope: string;
  vehicle?: string;
  statusCode: number;
  response: unknown;
}

interface SyncErrorResponse {
  message?: string;
  failures?: SyncFailure[];
}

function expiryBadge(dateStr?: string, locale?: Locale) {
  if (!dateStr) return <span className="text-gray-300 text-xs">—</span>;
  const date = new Date(dateStr);
  const now = new Date();
  const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium"><XCircle className="w-3 h-3" />{formatDate(date, locale ?? 'en')}</span>;
  }
  if (daysLeft <= 30) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium"><Clock className="w-3 h-3" />{formatDate(date, locale ?? 'en')}</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium"><CheckCircle2 className="w-3 h-3" />{formatDate(date, locale ?? 'en')}</span>;
}

export default function TammPage() {
  const { isRTL, locale, t } = useLocale();
  const tt = t.tamm;
  const tc = t.common;
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<FleetStatus>({
    queryKey: ['tamm-fleet-status'],
    queryFn: () => api.get('/tamm/fleet-status').then((r) => r.data),
  });

  const vehicles = data?.vehicles ?? [];
  const violations = data?.violations ?? [];
  const lastSync = data?.lastSync;
  const unpaid = violations.filter((v) => !v.isPaid);
  const unpaidAmount = unpaid.reduce((s, v) => s + v.amount, 0);

  const syncMutation = useMutation({
    mutationFn: () => api.post('/tamm/sync').then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tamm-fleet-status'] });
    },
  });

  const syncError = (syncMutation.error as AxiosError<SyncErrorResponse> | null)?.response?.data;
  const hasSyncError = Boolean(syncError);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{tt.title}</h1>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">tamm.sa — ELM</span>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-gray-400">
              {locale === 'ar' ? 'آخر مزامنة:' : 'Last sync:'} {formatDate(lastSync.createdAt, locale)}
            </span>
          )}
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? tt.syncing : tt.syncNow}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: locale === 'ar' ? 'إجمالي المركبات' : 'Total Vehicles', value: formatNumber(vehicles.length, locale), color: 'blue' },
          { label: locale === 'ar' ? 'المخالفات' : 'Violations', value: formatNumber(violations.length, locale), color: 'gray' },
          { label: locale === 'ar' ? 'غير مسددة' : 'Unpaid', value: formatNumber(unpaid.length, locale), color: 'red' },
          { label: locale === 'ar' ? 'إجمالي المخالفات' : 'Unpaid Amount', value: formatCurrencySar(unpaidAmount, locale), color: 'amber' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>

      {hasSyncError && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-red-800">
                {locale === 'ar' ? 'فشل تحديث بيانات تم' : 'Tamm sync failed'}
              </h2>
              <p className="text-sm text-red-700">
                {typeof syncError?.message === 'string'
                  ? syncError.message
                  : locale === 'ar'
                    ? 'تم إرجاع خطأ من واجهة تم. البيانات المعروضة أدناه قد تكون قديمة من قاعدة البيانات.'
                    : 'Tamm returned an error. The data below may be stale database data.'}
              </p>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-red-950 px-4 py-3 text-xs text-red-100 whitespace-pre-wrap break-all">
            {JSON.stringify(syncError, null, 2)}
          </pre>
        </section>
      )}

      {/* Fleet status table */}
      {!hasSyncError && (
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">{tt.registeredVehicles}</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">{tc.loading}</div>
          ) : vehicles.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{tt.noVehicles}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[tt.plate, locale === 'ar' ? 'المركبة' : 'Vehicle', tt.regExpiry, tt.inspection, tt.insurance].map((h) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700">{v.plateNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{v.year} {v.make} {v.model}</td>
                      <td className="px-4 py-3">{expiryBadge(v.licenseExpiryDate, locale)}</td>
                      <td className="px-4 py-3">{expiryBadge(v.inspectionExpiryDate, locale)}</td>
                      <td className="px-4 py-3">{expiryBadge(v.insuranceExpiryDate, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Violations */}
      {!hasSyncError && (
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold text-gray-800">{tt.trafficViolations}</h2>
          {unpaid.length > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-3 h-3" />
              {formatNumber(unpaid.length, locale)} {tt.unpaidCount}
            </span>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">{tc.loading}</div>
          ) : violations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{tt.noViolations}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[tt.plate, tt.description, tt.amount, tt.date, tt.status].map((h) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {violations.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-blue-700">{v.plateNumber}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{v.description}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatCurrencySar(v.amount, locale)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(v.issuedAt, locale)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {v.isPaid ? tt.paid : tt.unpaid}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Car icon hint when no tamm subscription */}
      {!hasSyncError && !isLoading && vehicles.length === 0 && violations.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
          <Car className="w-12 h-12 opacity-30" />
          <p className="text-sm">{locale === 'ar' ? 'لا توجد بيانات متزامنة من تم. تأكد من إعداد اشتراك تم.' : 'No Tamm data synced yet. Ensure your Tamm subscription ID is configured.'}</p>
        </div>
      )}
    </div>
  );
}
