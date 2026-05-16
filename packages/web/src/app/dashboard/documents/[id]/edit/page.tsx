'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { DocumentType, DriverLicenseType } from '@fleet/shared';
import { api } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { DocumentForm, DocumentFormValues, DriverOption, VehicleOption } from '../../document-form';

type VehiclesResponse = { data: VehicleOption[] } | VehicleOption[];

type DocumentDetail = {
  id: string;
  type: DocumentType;
  licenseType?: DriverLicenseType | null;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  vehicles?: { id: string }[];
  drivers?: { id: string }[];
};

function toDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function EditDocumentPage() {
  const params = useParams<{ id: string }>();
  const docId = params.id;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const td = t.documents;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const { data: doc, isLoading: docLoading } = useQuery<DocumentDetail>({
    queryKey: ['document', docId],
    queryFn: () => api.get(`/documents/${docId}`).then((r) => r.data),
    enabled: !!docId,
  });

  const { data: vehiclesData } = useQuery<VehiclesResponse>({
    queryKey: ['documents-form-vehicles'],
    queryFn: () =>
      api.get('/vehicles').then((r) => r.data),
  });

  const { data: driversData } = useQuery<DriverOption[]>({
    queryKey: ['documents-form-drivers'],
    queryFn: () => api.get('/drivers').then((r) => r.data),
  });

  const updateMutation = useMutation({
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
      return api.patch(`/documents/${docId}`, {
        type: values.type,
        licenseType: values.licenseType || null,
        fileUrl,
        issueDate: values.issueDate,
        expiryDate: values.expiryDate,
        vehicleIds: values.vehicleIds,
        driverIds: values.driverIds,
        issuingAuthority: values.issuingAuthority || null,
        referenceNumber: values.referenceNumber || null,
        notes: values.notes || null,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
      router.push(`/${locale}/dashboard/documents`);
    },
  });

  const handleSubmit = (values: DocumentFormValues, file: File | null) => {
    updateMutation.mutate({ values, file });
  };

  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.data ?? []);
  const drivers = driversData ?? [];

  if (docLoading || !doc) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const initialValues: DocumentFormValues = {
    type: doc.type,
    licenseType: doc.licenseType ?? '',
    fileUrl: doc.fileUrl,
    issueDate: toDateInput(doc.issueDate),
    expiryDate: toDateInput(doc.expiryDate),
    vehicleIds: doc.vehicles?.map((v) => v.id) ?? [],
    driverIds: doc.drivers?.map((d) => d.id) ?? [],
    issuingAuthority: doc.issuingAuthority ?? '',
    referenceNumber: doc.referenceNumber ?? '',
    notes: doc.notes ?? '',
  };

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
        <h1 className="text-2xl font-bold text-gray-900">{td.editTitle}</h1>
      </div>

      {updateMutation.isError && (
        <div className={`rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 ${isRTL ? 'text-right' : 'text-left'}`}>
          {(updateMutation.error as Error).message}
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <DocumentForm
          initialValues={initialValues}
          vehicles={vehicles}
          drivers={drivers}
          isEdit
          isSubmitting={updateMutation.isPending}
          submitLabel={td.saveUpdate}
          currentFileUrl={doc.fileUrl}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/${locale}/dashboard/documents`)}
        />
      </div>
    </div>
  );
}
