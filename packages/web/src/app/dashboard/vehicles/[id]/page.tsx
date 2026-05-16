'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, resolveDocumentFileUrl, resolveUploadedAssetUrl } from '@/lib/api';
import { subscribeToVehicleLocation } from '@/lib/socket';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatEnumLabel, formatCurrencySar, formatNumber } from '@/lib/i18n';
import { DocumentType, Vehicle } from '@fleet/shared';
import { ArrowLeft, ArrowRight, Camera, Droplet, ExternalLink, FileText, Fuel, Gauge, Pencil, Plus, ShieldAlert, Star, Trash2, Truck, UserCheck, Wrench, X } from 'lucide-react';

type DriverBrief = { id: string; fullName: string; phone: string; status: string; photoUrl?: string | null };

type VehicleDetails = Vehicle & {
  lastLocationLat?: number | null;
  lastLocationLng?: number | null;
  lastLocationAt?: string | null;
  drivers?: DriverBrief[];
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
  // Pilot GPS telemetry
  pilotImei?: string | null;
  pilotMotorHours?: number | null;
  pilotLastStop?: string | null;
  pilotLastMove?: string | null;
  pilotBatteryVoltage?: number | null;
  pilotIgnitionOn?: boolean | null;
  pilotLoadWeight?: number | null;
  pilotProviderMileage?: number | null;
  pilotSpeed?: number | null;
  pilotHeading?: number | null;
  pilotIsOnline?: boolean | null;
};

type VehiclePhoto = {
  id: string;
  url: string;
  isProfile: boolean;
  caption?: string | null;
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

  const queryClient = useQueryClient();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [liveLocation, setLiveLocation] = useState<{lat: number; lng: number; timestamp?: string} | null>(null);

  const { data: allDrivers } = useQuery<DriverBrief[]>({
    queryKey: ['drivers-list'],
    queryFn: () => api.get('/drivers').then((r) => r.data),
    enabled: showAssignModal,
  });

  const assignDriverMutation = useMutation({
    mutationFn: (driverId: string) => api.post(`/vehicles/${vehicleId}/drivers/${driverId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      setShowAssignModal(false);
      setDriverSearch('');
    },
  });

  const removeDriverMutation = useMutation({
    mutationFn: (driverId: string) => api.delete(`/vehicles/${vehicleId}/drivers/${driverId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }),
  });
  const [activePhoto, setActivePhoto] = useState<VehiclePhoto | null>(null);

  const { data: photosData } = useQuery<VehiclePhoto[]>({
    queryKey: ['vehicle-photos', vehicleId],
    queryFn: () => api.get(`/vehicles/${vehicleId}/photos`).then((r) => r.data),
    enabled: !!vehicleId,
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/vehicles/${vehicleId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] }),
  });

  const setProfileMutation = useMutation({
    mutationFn: (photoId: string) => api.patch(`/vehicles/${vehicleId}/photos/${photoId}/profile`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] }),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => api.delete(`/vehicles/${vehicleId}/photos/${photoId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] }),
  });

  const photos = photosData ?? [];
  const activePhotoIndex = activePhoto ? photos.findIndex((p) => p.id === activePhoto.id) : -1;

  const goToPreviousPhoto = () => {
    if (photos.length === 0 || activePhotoIndex < 0) return;
    const prevIndex = (activePhotoIndex - 1 + photos.length) % photos.length;
    setActivePhoto(photos[prevIndex]);
  };

  const goToNextPhoto = () => {
    if (photos.length === 0 || activePhotoIndex < 0) return;
    const nextIndex = (activePhotoIndex + 1) % photos.length;
    setActivePhoto(photos[nextIndex]);
  };

  useEffect(() => {
    if (vehicle?.lastLocationLat == null || vehicle?.lastLocationLng == null) return;
    setLiveLocation({
      lat: vehicle.lastLocationLat,
      lng: vehicle.lastLocationLng,
      timestamp: vehicle.lastLocationAt ? String(vehicle.lastLocationAt) : undefined,
    });
  }, [vehicle?.lastLocationAt, vehicle?.lastLocationLat, vehicle?.lastLocationLng]);

  useEffect(() => {
    if (!vehicleId) return;

    const unsubscribe = subscribeToVehicleLocation(vehicleId, (update) => {
      setLiveLocation({
        lat: update.location.lat,
        lng: update.location.lng,
        timestamp: new Date(update.timestamp).toISOString(),
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [vehicleId]);

  const mapSrc = liveLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${liveLocation.lng - 0.02}%2C${liveLocation.lat - 0.02}%2C${liveLocation.lng + 0.02}%2C${liveLocation.lat + 0.02}&layer=mapnik&marker=${liveLocation.lat}%2C${liveLocation.lng}`
    : null;

  useEffect(() => {
    if (!activePhoto) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePhoto(null);
        return;
      }

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (photos.length === 0) return;

      e.preventDefault();
      if (e.key === 'ArrowRight') {
        goToNextPhoto();
      } else {
        goToPreviousPhoto();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePhoto, photos, activePhotoIndex]);

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
      value: (vehicle.drivers ?? []).length > 0
        ? (vehicle.drivers ?? []).map((d) => d.fullName).join(', ')
        : tv.unassigned,
      icon: Truck,
      className: 'bg-indigo-50 text-indigo-700',
    },
  ];

  const hasOperationCard = !!(vehicle.operationCardNumber || vehicle.operationCardIssueDate || vehicle.operationCardExpiryDate || vehicle.operationCardRenewDate);
  const hasTammData = !!(vehicle.ownershipDate || vehicle.licenseIssuanceDate || vehicle.licenseExpiryDate || vehicle.inspectionExpiryDate || vehicle.mvpiStatus || vehicle.insuranceStatus || vehicle.insuranceExpiryDate || vehicle.restrictionStatus);
  const hasGpsTelemetry = vehicle.pilotImei != null || vehicle.pilotMotorHours != null || vehicle.pilotLastStop != null || vehicle.pilotLastMove != null || vehicle.pilotBatteryVoltage != null || vehicle.pilotIgnitionOn != null || vehicle.pilotLoadWeight != null || vehicle.pilotProviderMileage != null || vehicle.pilotSpeed != null || vehicle.pilotHeading != null || vehicle.pilotIsOnline != null;

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

        {hasTammData && (
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
        )}

        {hasOperationCard && (
        <InfoCard title={tv.operationCardSection}>
          <InfoRow label={tv.operationCardNumber} value={vehicle.operationCardNumber} />
          <InfoRow label={tv.operationCardIssueDate} value={vehicle.operationCardIssueDate} />
          <InfoRow label={tv.operationCardExpiryDate} value={vehicle.operationCardExpiryDate} />
          <InfoRow label={tv.operationCardRenewDate} value={vehicle.operationCardRenewDate} />
        </InfoCard>
        )}

        {liveLocation && (
        <InfoCard title={isRTL ? 'الموقع الحي' : 'Live Location'}>
          <InfoRow label={isRTL ? 'خط العرض' : 'Latitude'} value={String(liveLocation.lat.toFixed(6))} />
          <InfoRow label={isRTL ? 'خط الطول' : 'Longitude'} value={String(liveLocation.lng.toFixed(6))} />
          <InfoRow label={isRTL ? 'آخر تحديث' : 'Last Update'} value={liveLocation.timestamp ? formatDate(liveLocation.timestamp, locale) : '—'} />
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://www.openstreetmap.org/?mlat=${liveLocation.lat}&mlon=${liveLocation.lng}#map=14/${liveLocation.lat}/${liveLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
            >
              <ExternalLink className="w-4 h-4" />
              {isRTL ? 'فتح الخريطة' : 'Open Map'}
            </a>
            <a
              href={`https://www.google.com/maps?q=${liveLocation.lat},${liveLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-green-700 hover:bg-green-50"
            >
              <ExternalLink className="w-4 h-4" />
              {isRTL ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
            </a>
          </div>
        </InfoCard>
        )}

        {hasGpsTelemetry && (
        <InfoCard title={isRTL ? 'بيانات جهاز التتبع' : 'GPS Telemetry'}>
          <InfoRow
            label={isRTL ? 'ساعات التشغيل' : 'Engine Hours'}
            value={vehicle.pilotMotorHours != null && vehicle.pilotMotorHours > 0 ? `${formatNumber(Math.round(vehicle.pilotMotorHours * 10) / 10, locale)} h` : undefined}
          />
          <InfoRow
            label={isRTL ? 'آخر توقف' : 'Last Stop'}
            value={vehicle.pilotLastStop ? formatDate(vehicle.pilotLastStop, locale) : undefined}
          />
          <InfoRow
            label={isRTL ? 'آخر حركة' : 'Last Move'}
            value={vehicle.pilotLastMove ? formatDate(vehicle.pilotLastMove, locale) : undefined}
          />
          <InfoRow
            label={isRTL ? 'جهد البطارية' : 'Battery Voltage'}
            value={vehicle.pilotBatteryVoltage != null && vehicle.pilotBatteryVoltage > 0 ? `${formatNumber(Math.round(vehicle.pilotBatteryVoltage * 100) / 100, locale)} V` : undefined}
          />
          <InfoRow
            label={isRTL ? 'حالة المحرك' : 'Ignition'}
            value={vehicle.pilotIgnitionOn != null ? (vehicle.pilotIgnitionOn ? (isRTL ? 'تشغيل' : 'On') : (isRTL ? 'إيقاف' : 'Off')) : undefined}
          />
          <InfoRow
            label={isRTL ? 'السرعة الحالية' : 'Current Speed'}
            value={vehicle.pilotSpeed != null ? `${formatNumber(Math.round(vehicle.pilotSpeed), locale)} km/h` : undefined}
          />
          <InfoRow
            label={isRTL ? 'الاتجاه' : 'Heading'}
            value={vehicle.pilotHeading != null ? `${formatNumber(Math.round(vehicle.pilotHeading), locale)}°` : undefined}
          />
          <InfoRow
            label={isRTL ? 'حالة الجهاز' : 'Device Status'}
            value={vehicle.pilotIsOnline != null ? (vehicle.pilotIsOnline ? (isRTL ? 'متصل' : 'Online') : (isRTL ? 'غير متصل' : 'Offline')) : undefined}
          />
          <InfoRow
            label={isRTL ? 'الحمولة' : 'Load Weight'}
            value={vehicle.pilotLoadWeight != null && vehicle.pilotLoadWeight > 0 ? `${formatNumber(Math.round(vehicle.pilotLoadWeight * 10) / 10, locale)} kg` : undefined}
          />
          <InfoRow
            label={isRTL ? 'المسافة (الجهاز)' : 'Device Mileage'}
            value={vehicle.pilotProviderMileage != null && vehicle.pilotProviderMileage > 0 ? `${formatNumber(Math.round(vehicle.pilotProviderMileage * 10) / 10, locale)} km` : undefined}
          />
          <InfoRow label={isRTL ? 'رقم الجهاز (IMEI)' : 'Device IMEI'} value={vehicle.pilotImei} mono />
        </InfoCard>
        )}
      </div>

      {mapSrc && (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">{isRTL ? 'موقع المركبة' : 'Vehicle Location'}</h2>
        </div>
        <iframe
          title="vehicle-location-map"
          src={mapSrc}
          className="h-[320px] w-full rounded-xl border border-gray-100"
          loading="lazy"
        />
      </div>
      )}

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

      {/* Assigned Drivers section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">{isRTL ? 'السائقون المعيّنون' : 'Assigned Drivers'}</h2>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isRTL ? 'تعيين سائق' : 'Assign Driver'}
          </button>
        </div>
        {(vehicle.drivers ?? []).length === 0 ? (
          <Empty>{isRTL ? 'لا يوجد سائقون معيّنون' : 'No drivers assigned'}</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(vehicle.drivers ?? []).map((driver) => (
              <div key={driver.id} className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                {driver.photoUrl ? (
                  <img src={resolveUploadedAssetUrl(driver.photoUrl)} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold">
                    {driver.fullName.charAt(0)}
                  </div>
                )}
                <Link href={`/${locale}/dashboard/drivers/${driver.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600">
                  {driver.fullName}
                </Link>
                <button
                  onClick={() => { if (window.confirm(isRTL ? 'إلغاء تعيين السائق؟' : 'Unassign driver?')) removeDriverMutation.mutate(driver.id); }}
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
                              href={resolveDocumentFileUrl(doc.fileUrl)}
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

      {/* Photos section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">{isRTL ? 'الصور' : 'Photos'}</h2>
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isRTL ? 'رفع صورة' : 'Upload Photo'}
          </button>
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
        </div>
        {(photosData ?? []).length === 0 ? (
          <Empty>{isRTL ? 'لا توجد صور' : 'No photos yet'}</Empty>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {(photosData ?? []).map((photo) => (
              <div key={photo.id} className={`relative group rounded-lg overflow-hidden border-2 ${photo.isProfile ? 'border-blue-500' : 'border-gray-100'}`}>
                <img
                  src={resolveUploadedAssetUrl(photo.url)}
                  alt={photo.caption ?? ''}
                  className="h-28 w-full cursor-zoom-in object-cover"
                  onClick={() => setActivePhoto(photo)}
                />
                {photo.isProfile && (
                  <span className="absolute top-1 left-1 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {isRTL ? 'رئيسية' : 'Profile'}
                  </span>
                )}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {!photo.isProfile && (
                    <button
                      onClick={() => setProfileMutation.mutate(photo.id)}
                      className="pointer-events-auto rounded bg-white/90 p-1 text-blue-700 hover:bg-white"
                      title={isRTL ? 'تعيين كصورة رئيسية' : 'Set as profile'}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => { if (window.confirm(isRTL ? 'حذف الصورة؟' : 'Delete photo?')) deletePhotoMutation.mutate(photo.id); }}
                    className="pointer-events-auto rounded bg-white/90 p-1 text-red-600 hover:bg-white"
                    title={isRTL ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activePhoto && (        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-gray-700 hover:bg-white"
              aria-label={isRTL ? 'إغلاق' : 'Close'}
            >
              <X className="h-4 w-4" />
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPreviousPhoto}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 hover:bg-white"
                  aria-label={isRTL ? 'الصورة التالية' : 'Previous photo'}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={goToNextPhoto}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 hover:bg-white"
                  aria-label={isRTL ? 'الصورة السابقة' : 'Next photo'}
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}

            <img
              src={resolveUploadedAssetUrl(activePhoto.url)}
              alt={activePhoto.caption ?? ''}
              className="max-h-[90vh] w-full object-contain"
            />
            {activePhoto.caption && (
              <div className="px-4 py-3 text-sm text-white/90">{activePhoto.caption}</div>
            )}
          </div>
        </div>
      )}
      {/* Assign Driver Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">{isRTL ? 'تعيين سائق' : 'Assign Driver'}</h3>
              <button onClick={() => { setShowAssignModal(false); setDriverSearch(''); }} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <input
                autoFocus
                type="text"
                placeholder={isRTL ? 'ابحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {(allDrivers ?? [])
                  .filter((d) => {
                    const q = driverSearch.toLowerCase();
                    const alreadyAssigned = (vehicle.drivers ?? []).some((a) => a.id === d.id);
                    return !alreadyAssigned && (d.fullName.toLowerCase().includes(q) || d.phone.includes(q));
                  })
                  .map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => assignDriverMutation.mutate(driver.id)}
                      disabled={assignDriverMutation.isPending}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-blue-50 disabled:opacity-50"
                    >
                      {driver.photoUrl ? (
                        <img src={resolveUploadedAssetUrl(driver.photoUrl)} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">{driver.fullName.charAt(0)}</div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{driver.fullName}</div>
                        <div className="text-xs text-gray-500">{driver.phone}</div>
                      </div>
                    </button>
                  ))}
                {(allDrivers ?? []).filter((d) => !(vehicle.drivers ?? []).some((a) => a.id === d.id)).length === 0 && (
                  <div className="py-6 text-center text-sm text-gray-400">{isRTL ? 'لا توجد نتائج' : 'No drivers available'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
