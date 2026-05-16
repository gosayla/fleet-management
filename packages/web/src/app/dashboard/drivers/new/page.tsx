import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata({ ar: 'سائق جديد', en: 'New Driver' });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, UserPlus } from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { BloodType, CreateDriverDto } from '@fleet/shared';
import { DatePicker } from '@/components/ui/date-picker';

const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POS: 'A+',
  A_NEG: 'A−',
  B_POS: 'B+',
  B_NEG: 'B−',
  AB_POS: 'AB+',
  AB_NEG: 'AB−',
  O_POS: 'O+',
  O_NEG: 'O−',
};

type FormValues = {
  fullName: string;
  phone: string;
  nationalId: string;
  licenseExpiry: string;
};

function Field({
  label,
  name,
  type = 'text',
  defaultValue = '',
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default function NewDriverPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const td = t.drivers;
  const tc = t.common;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;
  const [licenseExpiry, setLicenseExpiry] = useState<string | undefined>(undefined);
  const [bloodType, setBloodType] = useState<BloodType | ''>('');

  const createMutation = useMutation({
    mutationFn: (payload: CreateDriverDto) => api.post('/drivers', payload).then((r) => r.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      router.push(`/${locale}/dashboard/drivers/${created.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: CreateDriverDto = {
      fullName: String(fd.get('fullName') ?? '').trim(),
      phone: String(fd.get('phone') ?? '').trim(),
      nationalId: String(fd.get('nationalId') ?? '').trim(),
      licenseExpiry: new Date(licenseExpiry ?? ''),
      bloodType: bloodType || undefined,
    };

    if (!licenseExpiry || Number.isNaN(payload.licenseExpiry.getTime())) {
      return;
    }

    createMutation.mutate(payload);
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/dashboard/drivers`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowBack className="w-4 h-4" />
        {td.title}
      </Link>

      <div className="flex items-center gap-3">
        <UserPlus className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{td.newTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={td.name} name="fullName" required />
            <Field label={td.phone} name="phone" type="tel" required placeholder="+966501234567" />
            <Field label={td.nationalId} name="nationalId" required placeholder="1098765432" />
            <p className="text-xs text-gray-500 md:col-span-2">
              {locale === 'ar'
                ? 'كلمة المرور الافتراضية ستكون نفس رقم الجوال ويمكن للسائق تغييرها لاحقاً.'
                : 'Default password will be the same as phone number and can be changed later.'}
            </p>
            <DatePicker
              label={td.licenseExpiry}
              value={licenseExpiry}
              onChange={setLicenseExpiry}
              placeholder={td.licenseExpiry}
              isRTL={isRTL}
              outputCalendar="gregorian"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{td.bloodType}</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value as BloodType | '')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {(Object.keys(BLOOD_TYPE_LABELS) as Array<keyof typeof BLOOD_TYPE_LABELS>).map((bt) => (
                  <option key={bt} value={bt}>{BLOOD_TYPE_LABELS[bt]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">
            {(createMutation.error as any)?.response?.data?.message ?? 'An error occurred'}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? td.saving : td.saveCreate}
          </button>
          <Link
            href={`/${locale}/dashboard/drivers`}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {tc.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}
