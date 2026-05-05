'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { CreateVehicleDto, VehicleType } from '@fleet/shared';
import { VehicleForm, VehicleFormValues } from '../vehicle-form';

const initialValues: VehicleFormValues = {
  plateNumber: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  type: VehicleType.SEDAN,
  vin: '',
  odometer: 0,
  fuelCapacity: 50,
  operationCardNumber: undefined,
  operationCardIssueDate: undefined,
  operationCardExpiryDate: undefined,
  operationCardRenewDate: undefined,
};

export default function NewVehiclePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tv = t.vehicles;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const createMutation = useMutation({
    mutationFn: (payload: CreateVehicleDto) => api.post('/vehicles', payload).then((r) => r.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      router.push(`/${locale}/dashboard/vehicles/${created.id}`);
    },
  });

  async function handleSubmit(values: VehicleFormValues, opCardFile: File | null) {
    let operationCardFileUrl = values.operationCardFileUrl;
    if (opCardFile) {
      const fd = new FormData();
      fd.append('file', opCardFile);
      const res = await api.post<{ fileUrl: string }>('/documents/files', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      operationCardFileUrl = res.data.fileUrl;
    }

    const payload: CreateVehicleDto = {
      plateNumber: values.plateNumber,
      make: values.make,
      model: values.model,
      year: values.year,
      color: values.color,
      type: values.type,
      vin: values.vin,
      odometer: values.odometer,
      fuelCapacity: values.fuelCapacity,
      operationCardNumber: values.operationCardNumber,
      operationCardIssueDate: values.operationCardIssueDate,
      operationCardExpiryDate: values.operationCardExpiryDate,
      operationCardRenewDate: values.operationCardRenewDate,
      operationCardFileUrl,
    };

    createMutation.mutate(payload);
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/vehicles`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {tv.backToList}
      </Link>

      <div className="flex items-center gap-3">
        <Truck className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{tv.newTitle}</h1>
      </div>

      {createMutation.isError && (
        <div className={`rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {(createMutation.error as Error).message}
        </div>
      )}

      <VehicleForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel={tv.saveCreate}
      />
    </div>
  );
}
