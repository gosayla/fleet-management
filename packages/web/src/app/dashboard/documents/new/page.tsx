'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { DocumentType } from '@fleet/shared';
import { api } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { DocumentForm, DocumentFormValues, DriverOption, VehicleOption } from '../document-form';

type VehiclesResponse = { data: VehicleOption[] } | VehicleOption[];

export default function NewDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const td = t.documents;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const prefilledVehicleId = searchParams.get('vehicleId') ?? '';

  const emptyForm: DocumentFormValues = {
    type: DocumentType.VEHICLE_REGISTRATION,
    fileUrl: '',
    issueDate: '',
    expiryDate: '',
    vehicleIds: prefilledVehicleId ? [prefilledVehicleId] : [],
    driverIds: [],
    issuingAuthority: '',
    referenceNumber: '',
    notes: '',
  };

  const { data: vehiclesData } = useQuery<VehiclesResponse>({
    queryKey: ['documents-form-vehicles'],
    queryFn: () =>
      api.get('/vehicles').then((r) => r.data),
  });

  const { data: driversData } = useQuery<DriverOption[]>({
    queryKey: ['documents-form-drivers'],
    queryFn: () => api.get('/drivers').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: async ({ values, file }: { values: DocumentFormValues; file: File | null }) => {
      let fileUrl = values.fileUrl;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post<{ fileUrl: string }>('/documents/files', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = res.data.fileUrl;
      }
      return api.post('/documents', {
        type: values.type,
        fileUrl,
        issueDate: values.issueDate,
        expiryDate: values.expiryDate,
        vehicleIds: values.vehicleIds,
        driverIds: values.driverIds,
        issuingAuthority: values.issuingAuthority || undefined,
        referenceNumber: values.referenceNumber || undefined,
        notes: values.notes || undefined,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      router.push(`/${locale}/dashboard/documents`);
    },
  });

  const handleSubmit = (values: DocumentFormValues, file: File | null) => {
    createMutation.mutate({ values, file });
  };

  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.data ?? []);
  const drivers = driversData ?? [];

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/documents`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="h-4 w-4" />
        {td.backToList}
      </Link>

      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{td.createTitle}</h1>
      </div>

      {createMutation.isError && (
        <div className={`rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {(createMutation.error as Error).message}
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <DocumentForm
          initialValues={emptyForm}
          vehicles={vehicles}
          drivers={drivers}
          isSubmitting={createMutation.isPending}
          submitLabel={td.saveCreate}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/${locale}/dashboard/documents`)}
        />
      </div>
    </div>
  );
}
