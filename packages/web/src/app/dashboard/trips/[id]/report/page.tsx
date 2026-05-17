'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api, resolveDocumentFileUrl } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate } from '@/lib/i18n';
import { Printer } from 'lucide-react';

type TripReport = {
  id: string;
  origin: string;
  destination: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  clientName?: string | null;
  contractNumber?: string | null;
  notes?: string | null;
  fuelLevel?: number | null;
  conditionRating?: string | null;
  conditionPhotos?: string[];
  driverSignatureUrl?: string | null;
  managerSignatureUrl?: string | null;
  checklistItems?: string[];
  vehicle?: { plateNumber: string; make: string; model: string; year?: number | null; color?: string | null };
  driver?: { fullName: string; phone: string };
};

type Company = { name: string; logoUrl?: string | null };

const CHECKLIST_ITEMS: { id: string; en: string; ar: string }[] = [
  { id: 'vehicle_keys',       en: 'Vehicle Keys',        ar: 'مفاتيح المركبة' },
  { id: 'spare_tire',         en: 'Spare Tire',           ar: 'الإطار الاحتياطي' },
  { id: 'jack',               en: 'Jack',                 ar: 'الرافعة' },
  { id: 'toolkit',            en: 'Toolkit',              ar: 'حقيبة الأدوات' },
  { id: 'warning_triangle',   en: 'Warning Triangle',     ar: 'مثلث التحذير' },
  { id: 'fire_extinguisher',  en: 'Fire Extinguisher',    ar: 'طفاية الحريق' },
  { id: 'first_aid_kit',      en: 'First Aid Kit',        ar: 'حقيبة الإسعافات' },
  { id: 'front_camera',       en: 'Front Camera',         ar: 'كاميرا أمامية' },
  { id: 'rear_camera',        en: 'Rear Camera',          ar: 'كاميرا خلفية' },
  { id: 'dashboard_screen',   en: 'Dashboard Screen',     ar: 'شاشة لوحة القيادة' },
  { id: 'registration_card',  en: 'Registration Card',    ar: 'وثيقة التسجيل' },
  { id: 'insurance_card',     en: 'Insurance Card',       ar: 'وثيقة التأمين' },
  { id: 'fuel_card',          en: 'Fuel Card',            ar: 'بطاقة الوقود' },
  { id: 'floor_mats',         en: 'Floor Mats',           ar: 'سجادة المركبة' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-green-700 border-b border-green-200 pb-1 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex gap-2 mb-1.5">
      <span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-900">{String(value)}</span>
    </div>
  );
}

export default function TripReportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { locale, isRTL } = useLocale();

  const { data: trip, isLoading } = useQuery<TripReport>({
    queryKey: ['trip', id],
    queryFn: () => api.get(`/trips/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const { data: company } = useQuery<Company>({
    queryKey: ['company-profile'],
    queryFn: () => api.get('/settings/company').then(r => r.data),
  });

  if (isLoading || !trip) {
    return <div className="p-8 text-center text-gray-400">{locale === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}</div>;
  }

  const checkedItems = CHECKLIST_ITEMS.filter(i => trip.checklistItems?.includes(i.id));
  const uncheckedItems = CHECKLIST_ITEMS.filter(i => !trip.checklistItems?.includes(i.id));

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50 print:bg-white">
      {/* Print button */}
      <div className="fixed top-20 end-6 print:hidden z-10">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg shadow-lg hover:bg-green-800 transition-colors"
        >
          <Printer className="w-4 h-4" />
          {locale === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-8 print:p-6 bg-white print:shadow-none shadow-sm my-8 print:my-0 rounded-2xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-green-700">
          <div>
            {company?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveDocumentFileUrl(company.logoUrl)} alt="logo" className="h-12 mb-2 object-contain" />
            )}
            <h1 className="text-2xl font-bold text-green-800">{company?.name ?? ''}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {locale === 'ar' ? 'وثيقة تسليم المركبة — رحلة' : 'Vehicle Handover Document — Trip'}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs text-gray-400">{locale === 'ar' ? 'تاريخ الطباعة' : 'Print Date'}</p>
            <p className="text-sm font-semibold text-gray-700">{new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB')}</p>
          </div>
        </div>

        {/* Trip Info */}
        <Section title={locale === 'ar' ? 'بيانات الرحلة' : 'Trip Information'}>
          <div className="grid grid-cols-2 gap-x-8">
            <Row label={locale === 'ar' ? 'المسار' : 'Route'} value={`${trip.origin} → ${trip.destination}`} />
            <Row label={locale === 'ar' ? 'تاريخ الانطلاق' : 'Departure Date'} value={formatDate(trip.scheduledStart, locale)} />
            {trip.actualStart && <Row label={locale === 'ar' ? 'الانطلاق الفعلي' : 'Actual Start'} value={formatDate(trip.actualStart, locale)} />}
            {trip.clientName && <Row label={locale === 'ar' ? 'العميل' : 'Client'} value={trip.clientName} />}
            {trip.contractNumber && <Row label={locale === 'ar' ? 'رقم العقد' : 'Contract No.'} value={trip.contractNumber} />}
            {trip.notes && <Row label={locale === 'ar' ? 'ملاحظات' : 'Notes'} value={trip.notes} />}
          </div>
        </Section>

        {/* Vehicle */}
        {trip.vehicle && (
          <Section title={locale === 'ar' ? 'المركبة' : 'Vehicle'}>
            <div className="grid grid-cols-2 gap-x-8">
              <Row label={locale === 'ar' ? 'رقم اللوحة' : 'Plate'} value={trip.vehicle.plateNumber} />
              <Row label={locale === 'ar' ? 'الشركة المصنعة' : 'Make / Model'} value={`${trip.vehicle.make} ${trip.vehicle.model}${trip.vehicle.year ? ` (${trip.vehicle.year})` : ''}`} />
              {trip.vehicle.color && <Row label={locale === 'ar' ? 'اللون' : 'Color'} value={trip.vehicle.color} />}
            </div>
          </Section>
        )}

        {/* Driver */}
        {trip.driver && (
          <Section title={locale === 'ar' ? 'السائق' : 'Driver'}>
            <div className="grid grid-cols-2 gap-x-8">
              <Row label={locale === 'ar' ? 'الاسم' : 'Name'} value={trip.driver.fullName} />
              <Row label={locale === 'ar' ? 'الجوال' : 'Phone'} value={trip.driver.phone} />
            </div>
          </Section>
        )}

        {/* Vehicle State */}
        <Section title={locale === 'ar' ? 'حالة المركبة عند التسليم' : 'Vehicle State at Handover'}>
          {/* Fuel bar */}
          {trip.fuelLevel != null && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1.5">{locale === 'ar' ? 'مستوى الوقود' : 'Fuel Level'}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-4 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${trip.fuelLevel}%` }} />
                </div>
                <span className="text-sm font-bold text-gray-700 w-10 text-end">{trip.fuelLevel}%</span>
              </div>
            </div>
          )}

          {/* Condition */}
          {trip.conditionRating && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1.5">{locale === 'ar' ? 'حالة المركبة' : 'Vehicle Condition'}</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                trip.conditionRating === 'GOOD' ? 'bg-green-50 text-green-700 border border-green-200' :
                trip.conditionRating === 'FAIR' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {trip.conditionRating === 'GOOD' ? (locale === 'ar' ? 'جيدة' : 'Good') :
                 trip.conditionRating === 'FAIR' ? (locale === 'ar' ? 'مقبولة' : 'Fair') : (locale === 'ar' ? 'ضعيفة' : 'Poor')}
              </span>
            </div>
          )}

          {/* Photos */}
          {trip.conditionPhotos && trip.conditionPhotos.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">{locale === 'ar' ? 'صور الحالة' : 'Condition Photos'}</p>
              <div className="grid grid-cols-4 gap-2">
                {trip.conditionPhotos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={resolveDocumentFileUrl(url)} alt={`photo-${i + 1}`}
                    className="w-full aspect-video object-cover rounded-lg border border-gray-200" />
                ))}
              </div>
            </div>
          )}

          {/* If nothing was set */}
          {trip.fuelLevel == null && !trip.conditionRating && (!trip.conditionPhotos || trip.conditionPhotos.length === 0) && (
            <p className="text-xs text-gray-400 italic">{locale === 'ar' ? 'لم يتم تسجيل بيانات الحالة' : 'No condition data recorded'}</p>
          )}
        </Section>

        {/* Checklist */}
        <Section title={locale === 'ar' ? 'قائمة فحص التسليم' : 'Handover Checklist'}>
          {checkedItems.length === 0 && uncheckedItems.length === CHECKLIST_ITEMS.length ? (
            <p className="text-xs text-gray-400 italic">{locale === 'ar' ? 'لم يتم تحديد أي عناصر' : 'No items checked'}</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {CHECKLIST_ITEMS.map(item => {
                const checked = trip.checklistItems?.includes(item.id);
                return (
                  <div key={item.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${
                    checked ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}>
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 text-[10px] ${
                      checked ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'
                    }`}>{checked ? '✓' : ''}</span>
                    {locale === 'ar' ? item.ar : item.en}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Signatures */}
        <Section title={locale === 'ar' ? 'التوقيعات' : 'Signatures'}>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-2">{locale === 'ar' ? 'توقيع السائق' : "Driver's Signature"}</p>
              {trip.driverSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveDocumentFileUrl(trip.driverSignatureUrl)} alt="driver signature"
                  className="h-20 w-full object-contain border border-gray-200 rounded-lg bg-white p-1" />
              ) : (
                <div className="h-20 border border-dashed border-gray-300 rounded-lg flex items-end justify-center pb-2">
                  <div className="w-3/4 border-t border-gray-400" />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1 text-center">{trip.driver?.fullName ?? (locale === 'ar' ? 'السائق' : 'Driver')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">{locale === 'ar' ? 'توقيع المدير' : "Manager's Signature"}</p>
              {trip.managerSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveDocumentFileUrl(trip.managerSignatureUrl)} alt="manager signature"
                  className="h-20 w-full object-contain border border-gray-200 rounded-lg bg-white p-1" />
              ) : (
                <div className="h-20 border border-dashed border-gray-300 rounded-lg flex items-end justify-center pb-2">
                  <div className="w-3/4 border-t border-gray-400" />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1 text-center">{locale === 'ar' ? 'المدير' : 'Manager'}</p>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">{company?.name ?? ''} — {locale === 'ar' ? 'وثيقة تسليم مركبة' : 'Vehicle Handover Document'}</p>
        </div>
      </div>
    </div>
  );
}
