'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { Driver, UpdateVehicleDto, Vehicle, VehicleStatus } from '@fleet/shared';
import { useLocale } from '@/providers/locale-provider';
import { VehicleForm, VehicleFormValues } from '../../vehicle-form';

type VehicleDetails = Vehicle & {
  assignedDriver?: { id: string; fullName: string } | null;
  plateType?: string | null;
  sequenceNumber?: string | null;
  bodyType?: string | null;
  ownershipDate?: string | null;
  licenseIssuanceDate?: string | null;
  inspectionExpiryDate?: string | null;
  restrictionStatus?: string | null;
  operationCardNumber?: string | null;
  operationCardIssueDate?: string | null;
  operationCardExpiryDate?: string | null;
  operationCardRenewDate?: string | null;
  operationCardFileUrl?: string | null;
  licenseExpiryDate?: string | null;
  insuranceExpiryDate?: string | null;
  assignedDriverId?: string | null;
};

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tv = t.vehicles;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const { data: vehicle, isLoading: vehicleLoading } = useQuery<VehicleDetails>({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => api.get(`/vehicles/${vehicleId}`).then((r) => r.data),
    enabled: !!vehicleId,
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => api.get('/drivers').then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateVehicleDto) => api.patch(`/vehicles/${vehicleId}`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      router.push(`/${locale}/dashboard/vehicles/${vehicleId}`);
    },
  });

  function handleSubmit(values: VehicleFormValues, opCardFile: File | null) {
    const doUpdate = async () => {
      let operationCardFileUrl = values.operationCardFileUrl;
      if (opCardFile) {
        const fd = new FormData();
        fd.append('file', opCardFile);
        const res = await api.post<{ fileUrl: string }>('/documents/files', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        operationCardFileUrl = res.data.fileUrl;
      }

      const payload: UpdateVehicleDto = {
        plateNumber: values.plateNumber,
        make: values.make,
        model: values.model,
        year: values.year,
        color: values.color,
        type: values.type,
        vin: values.vin,
        odometer: values.odometer,
        fuelCapacity: values.fuelCapacity,
        plateType: values.plateType,
        sequenceNumber: values.sequenceNumber,
        bodyType: values.bodyType,
        ownershipDate: values.ownershipDate,
        licenseIssuanceDate: values.licenseIssuanceDate,
        inspectionExpiryDate: values.inspectionExpiryDate,
        restrictionStatus: values.restrictionStatus,
        operationCardNumber: values.operationCardNumber,
        operationCardIssueDate: values.operationCardIssueDate,
        operationCardExpiryDate: values.operationCardExpiryDate,
        operationCardRenewDate: values.operationCardRenewDate,
        operationCardFileUrl,
        licenseExpiryDate: values.licenseExpiryDate,
        insuranceExpiryDate: values.insuranceExpiryDate,
        status: values.status ?? VehicleStatus.ACTIVE,
        assignedDriverId: values.assignedDriverId,
        usageType: values.usageType,
      };

      updateMutation.mutate(payload);
    };
    doUpdate();
  }

  if (vehicleLoading || !vehicle) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const initialValues: VehicleFormValues = {
    plateNumber: vehicle.plateNumber,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    type: vehicle.type,
    vin: vehicle.vin,
    odometer: vehicle.odometer,
    fuelCapacity: vehicle.fuelCapacity,
    plateType: vehicle.plateType ?? undefined,
    sequenceNumber: vehicle.sequenceNumber ?? undefined,
    bodyType: vehicle.bodyType ?? undefined,
    ownershipDate: vehicle.ownershipDate ?? undefined,
    licenseIssuanceDate: vehicle.licenseIssuanceDate ?? undefined,
    inspectionExpiryDate: vehicle.inspectionExpiryDate ?? undefined,
    restrictionStatus: vehicle.restrictionStatus ?? undefined,
    operationCardNumber: vehicle.operationCardNumber ?? undefined,
    operationCardIssueDate: vehicle.operationCardIssueDate ?? undefined,
    operationCardExpiryDate: vehicle.operationCardExpiryDate ?? undefined,
    operationCardRenewDate: vehicle.operationCardRenewDate ?? undefined,
    operationCardFileUrl: vehicle.operationCardFileUrl ?? undefined,
    licenseExpiryDate: vehicle.licenseExpiryDate ?? undefined,
    insuranceExpiryDate: vehicle.insuranceExpiryDate ?? undefined,
    status: vehicle.status,
    assignedDriverId: vehicle.assignedDriverId ?? undefined,
    usageType: (vehicle as any).usageType ?? undefined,
  };

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/vehicles/${vehicleId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {tc.view}
      </Link>

      <div className="flex items-center gap-3">
        <Pencil className="w-6 h-6 text-amber-600" />
        <h1 className="text-2xl font-bold text-gray-900">{tv.editTitle}</h1>
      </div>

      {updateMutation.isError && (
        <div className={`rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {(updateMutation.error as Error).message}
        </div>
      )}

      <VehicleForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
        submitLabel={tv.saveUpdate}
        showStatus
        showDriver
        drivers={drivers.map((d) => ({ id: d.id, fullName: d.fullName }))}
      />
    </div>
  );
}
