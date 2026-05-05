'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatEnumLabel, formatCurrencySar, formatNumber } from '@/lib/i18n';
import { DocumentType, Vehicle } from '@fleet/shared';
import { ArrowLeft, ArrowRight, Droplet, ExternalLink, FileText, Fuel, Gauge, Pencil, Plus, ShieldAlert, Truck, Wrench } from 'lucide-react';

type VehicleDetails = Vehicle & {
  assignedDriver?: { id: string; fullName: string } | null;
  maintenanceLogs?: Array<{
    id: string;
    type: string;
    status: string;
    description: string;
    scheduledDate: string;
    costSar?: number;
  }>;
  fuelLogs?: Array<{
    id: string;
    liters: number;
    costSar: number;
    filledAt: string;
    station?: string;
  }>;
  violations?: Array<{
    id: string;
    description: string;
    amount: number;
    issuedAt: string;
    isPaid: boolean;
  }>;
  plateType?: string | null;
  sequenceNumber?: string | null;
  bodyType?: string | null;
  operationCardNumber?: string | null;
  operationCardIssueDate?: string | null;
  operationCardExpiryDate?: string | null;
  operationCardRenewDate?: string | null;
  ownershipDate?: string | null;
  licenseExpiryDate?: string | null;
  licenseIssuanceDate?: string | null;
  inspectionExpiryDate?: string | null;
  mvpiStatus?: string | null;
  insuranceStatus?: string | null;
  insuranceExpiryDate?: string | null;
  restrictionStatus?: string | null;
};

type VehicleDocument = {
  id: string;
  type: DocumentType;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  referenceNumber?: string | null;
  issuingAuthority?: string | null;
};

const statusPill: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  INACTIVE: 'bg-gray-100 text-gray-700',
  RETIRED: 'bg-red-100 text-red-700',
};

export default function VehicleDashboardPage() {
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;

  const { locale, isRTL, t } = useLocale();
  const tv = t.vehicles;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const { data: vehicle, isLoading } = useQuery<VehicleDetails>({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => api.get(`/vehicles/${vehicleId}`).then((r) => r.data),
    enabled: !!vehicleId,
  });

  const { data: docsData } = useQuery<{ data: VehicleDocument[] }>({
    queryKey: ['vehicle-documents', vehicleId],
    queryFn: () => api.get(`/documents`, { params: { vehicleId, limit: 50 } }).then((r) => r.data),
    enabled: !!vehicleId,
  });

  if (isLoading || !vehicle) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: tv.status,
      value: formatEnumLabel('vehicleStatus', vehicle.status, locale),
      icon: ShieldAlert,
      className: statusPill[vehicle.status] ?? 'bg-gray-100 text-gray-700',
    },
    {
      label: tv.odometer,
      value: `${formatNumber(vehicle.odometer, locale)} ${tc.kilometers}`,
      icon: Gauge,
      className: 'bg-blue-50 text-blue-700',
    },
    {
      label: tv.fuelCapacity,
      value: `${formatNumber(vehicle.fuelCapacity, locale)} L`,
      icon: Fuel,
      className: 'bg-cyan-50 text-cyan-700',
    },
    {
      label: tv.driver,
      value: vehicle.assignedDriver?.fullName ?? tv.unassigned,
      icon: Truck,
      className: 'bg-indigo-50 text-indigo-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link
            href={`/${locale}/dashboard/vehicles`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowBack className="w-4 h-4" />
            {tv.backToList}
          </Link>
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{vehicle.plateNumber}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusPill[vehicle.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {formatEnumLabel('vehicleStatus', vehicle.status, locale)}
            </span>
          </div>
          <p className="text-sm text-gray-500">{vehicle.year} {vehicle.make} {vehicle.model}</p>
        </div>

        <Link
          href={`/${locale}/dashboard/vehicles/${vehicle.id}/edit`}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          {t.common.edit}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-lg ${card.className}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500 font-medium">{card.label}</span>
            </div>
            <div className="text-base font-semibold text-gray-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard title={tv.detailsTitle}>
          <InfoRow label={tv.plate} value={vehicle.plateNumber} />
          <InfoRow label={tv.vin} value={vehicle.vin} mono />
          <InfoRow label={tv.type} value={formatEnumLabel('vehicleType', vehicle.type, locale)} />
          <InfoRow label={tv.color} value={vehicle.color} />
          <InfoRow label={tv.plateType} value={vehicle.plateType} />
          <InfoRow label={tv.sequenceNumber} value={vehicle.sequenceNumber} />
          <InfoRow label={tv.bodyType} value={vehicle.bodyType} />
        </InfoCard>

        <InfoCard title="Tamm">
          <InfoRow label={tv.ownershipDate} value={vehicle.ownershipDate} />
          <InfoRow label={tv.licenseIssuanceDate} value={vehicle.licenseIssuanceDate} />
          <InfoRow label={tv.licenseExpiryDate} value={vehicle.licenseExpiryDate} />
          <InfoRow label={tv.inspectionExpiryDate} value={vehicle.inspectionExpiryDate} />
          <InfoRow label={tv.mvpiStatus} value={vehicle.mvpiStatus} />
          <InfoRow label={tv.insuranceStatus} value={vehicle.insuranceStatus} />
          <InfoRow label={tv.insuranceExpiryDate} value={vehicle.insuranceExpiryDate} />
          <InfoRow label={tv.restrictionStatus} value={vehicle.restrictionStatus} />
        </InfoCard>

        <InfoCard title={tv.operationCardSection}>
          <InfoRow label={tv.operationCardNumber} value={vehicle.operationCardNumber} />
          <InfoRow label={tv.operationCardIssueDate} value={vehicle.operationCardIssueDate} />
          <InfoRow label={tv.operationCardExpiryDate} value={vehicle.operationCardExpiryDate} />
          <InfoRow label={tv.operationCardRenewDate} value={vehicle.operationCardRenewDate} />
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ListCard title={tv.recentMaintenance} icon={Wrench}>
          {(vehicle.maintenanceLogs ?? []).length === 0 && <Empty>{tv.noMaintenance}</Empty>}
          {(vehicle.maintenanceLogs ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-100 p-3">
              <div className="text-sm font-medium text-gray-900">{item.description}</div>
              <div className="text-xs text-gray-500 mt-1">{formatDate(item.scheduledDate, locale)}</div>
              <div className="text-xs text-gray-500 mt-1">{formatEnumLabel('maintenanceStatus', item.status, locale)}</div>
              {item.costSar != null && <div className="text-xs text-gray-700 mt-1">{formatCurrencySar(item.costSar, locale)}</div>}
            </div>
          ))}
        </ListCard>

        <ListCard title={tv.recentFuel} icon={Droplet}>
          {(vehicle.fuelLogs ?? []).length === 0 && <Empty>{tv.noFuel}</Empty>}
          {(vehicle.fuelLogs ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-100 p-3">
              <div className="text-sm font-medium text-gray-900">{formatNumber(item.liters, locale)} L</div>
              <div className="text-xs text-gray-500 mt-1">{formatDate(item.filledAt, locale)}</div>
              <div className="text-xs text-gray-700 mt-1">{formatCurrencySar(item.costSar, locale)}</div>
              <div className="text-xs text-gray-500 mt-1">{item.station ?? tc.empty}</div>
            </div>
          ))}
        </ListCard>

        <ListCard title={tv.recentViolations} icon={ShieldAlert}>
          {(vehicle.violations ?? []).length === 0 && <Empty>{tv.noViolations}</Empty>}
          {(vehicle.violations ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-100 p-3">
              <div className="text-sm font-medium text-gray-900">{item.description}</div>
              <div className="text-xs text-gray-500 mt-1">{formatDate(item.issuedAt, locale)}</div>
              <div className="text-xs text-gray-700 mt-1">{formatCurrencySar(item.amount, locale)}</div>
              <div className={`text-xs mt-1 ${item.isPaid ? 'text-green-700' : 'text-red-700'}`}>
                {item.isPaid ? t.tamm.paid : t.tamm.unpaid}
              </div>
            </div>
          ))}
        </ListCard>
      </div>

      {/* Documents section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">{t.documents.title}</h2>
          </div>
          <Link
            href={`/${locale}/dashboard/documents/new?vehicleId=${vehicle.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.documents.add}
          </Link>
        </div>

        {(docsData?.data ?? []).length === 0 ? (
          <Empty>{t.documents.noDocuments}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className={`pb-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.documents.type}</th>
                  <th className={`pb-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.documents.reference}</th>
                  <th className={`pb-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.documents.authority}</th>
                  <th className={`pb-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.documents.issueDate}</th>
                  <th className={`pb-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.documents.expiryDate}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(docsData?.data ?? []).map((doc) => {
                  const now = new Date();
                  const expiry = new Date(doc.expiryDate);
                  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const expiryClass = daysLeft < 0 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-gray-900';

                  return (
                    <tr key={doc.id} className="group">
                      <td className="py-2.5 pr-4">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {formatEnumLabel('documentType', doc.type, locale)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700">{doc.referenceNumber || '—'}</td>
                      <td className="py-2.5 pr-4 text-gray-700">{doc.issuingAuthority || '—'}</td>
                      <td className="py-2.5 pr-4 text-gray-500">{formatDate(doc.issueDate, locale)}</td>
                      <td className={`py-2.5 pr-4 font-medium ${expiryClass}`}>{formatDate(doc.expiryDate, locale)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl.startsWith('/') ? `http://localhost:3001${doc.fileUrl}` : doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-600"
                              title={t.documents.openFile}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Link
                            href={`/${locale}/dashboard/documents/${doc.id}/edit`}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function ListCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400 text-center">{children}</div>;
}
