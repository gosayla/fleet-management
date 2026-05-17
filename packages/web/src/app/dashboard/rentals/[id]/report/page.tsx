'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api, resolveDocumentFileUrl } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatNumber } from '@/lib/i18n';
import { Printer } from 'lucide-react';

type Rental = {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  clientNationalId?: string | null;
  contractNumber?: string | null;
  rentalStart: string;
  rentalEnd: string;
  odometerOut?: number | null;
  odometerIn?: number | null;
  fuelLevel?: number | null;
  conditionRating?: string | null;
  conditionPhotos?: string[];
  signatureUrl?: string | null;
  managerSignatureUrl?: string | null;
  checklistItems?: string[];
  dailyRateSar?: number | null;
  status: string;
  notes?: string | null;
  vehicle?: { plateNumber: string; make: string; model: string; year?: number | null; color?: string | null };
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

export default function RentalReportPage() {
  const { id: rentalId } = useParams<{ id: string }>();
  const { locale, isRTL } = useLocale();

  const { data: rental, isLoading } = useQuery<Rental>({
    queryKey: ['rental', rentalId],
    queryFn: async () => {
      const res = await api.get(`/rentals/${rentalId}`);
      return res.data;
    },
  });

  const { data: company } = useQuery<Company>({
    queryKey: ['company-brief'],
    queryFn: async () => {
      const res = await api.get('/settings/company');
      return res.data;
    },
  });

  const conditionLabel = (r?: string | null) =>
    r === 'GOOD' ? (isRTL ? 'جيدة' : 'Good') : r === 'FAIR' ? (isRTL ? 'مقبولة' : 'Fair') : r === 'POOR' ? (isRTL ? 'ضعيفة' : 'Poor') : '—';

  const conditionColor = (r?: string | null) =>
    r === 'GOOD' ? '#166534' : r === 'FAIR' ? '#92400e' : r === 'POOR' ? '#991b1b' : '#374151';

  if (isLoading || !rental) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const v = rental.vehicle;
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-20 end-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-lg"
        >
          <Printer className="w-4 h-4" />
          {isRTL ? 'طباعة / تنزيل PDF' : 'Print / Save PDF'}
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 shadow-lg"
        >
          {isRTL ? 'رجوع' : 'Back'}
        </button>
      </div>

      {/* Report */}
      <div
        dir={dir}
        className="min-h-screen bg-white p-8 max-w-3xl mx-auto print:p-6 print:max-w-none"
        style={{ fontFamily: isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-blue-700 pb-4 mb-6">
          <div>
            {company?.name && <p className="text-lg font-bold text-gray-900">{company.name}</p>}
            <h1 className="text-2xl font-black text-blue-700 mt-1">
              {isRTL ? 'وثيقة تسليم إيجار مركبة' : 'Vehicle Rental Handover'}
            </h1>
            {rental.contractNumber && (
              <p className="text-xs text-gray-400 mt-1">
                {isRTL ? 'رقم العقد:' : 'Contract:'} {rental.contractNumber}
              </p>
            )}
            <p className="text-xs text-gray-400">
              {isRTL ? 'رقم السجل:' : 'Record ID:'} {rental.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="text-end text-xs text-gray-500 space-y-0.5">
            <p>{isRTL ? 'تاريخ الإصدار:' : 'Issued:'} {new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-GB')}</p>
            <p className={`font-semibold ${rental.status === 'ACTIVE' ? 'text-green-600' : rental.status === 'RETURNED' ? 'text-gray-500' : 'text-red-600'}`}>
              {rental.status === 'ACTIVE' ? (isRTL ? 'نشط' : 'Active')
                : rental.status === 'RETURNED' ? (isRTL ? 'مُرجَع' : 'Returned')
                : rental.status === 'OVERDUE' ? (isRTL ? 'متأخر' : 'Overdue')
                : rental.status}
            </p>
          </div>
        </div>

        {/* Vehicle + Client two columns */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Section title={isRTL ? 'بيانات المركبة' : 'Vehicle Details'}>
            <Row label={isRTL ? 'رقم اللوحة' : 'Plate Number'} value={v?.plateNumber ?? '—'} mono />
            <Row label={isRTL ? 'الموديل' : 'Make / Model'} value={v ? `${v.year ?? ''} ${v.make} ${v.model}`.trim() : '—'} />
            {v?.color && <Row label={isRTL ? 'اللون' : 'Color'} value={v.color} />}
          </Section>

          <Section title={isRTL ? 'بيانات العميل' : 'Client Details'}>
            <Row label={isRTL ? 'الاسم' : 'Name'} value={rental.clientName} />
            {rental.clientPhone && <Row label={isRTL ? 'الهاتف' : 'Phone'} value={rental.clientPhone} />}
            {rental.clientNationalId && <Row label={isRTL ? 'رقم الهوية' : 'National ID'} value={rental.clientNationalId} mono />}
            {rental.dailyRateSar != null && <Row label={isRTL ? 'السعر اليومي' : 'Daily Rate'} value={`${formatNumber(rental.dailyRateSar, locale as 'ar' | 'en')} SAR`} />}
          </Section>
        </div>

        {/* Rental period + vehicle state */}
        <Section title={isRTL ? 'تفاصيل الإيجار وحالة المركبة' : 'Rental Period & Vehicle State'} className="mb-6">
          <div className="grid grid-cols-2 gap-x-8">
            <Row label={isRTL ? 'بداية الإيجار' : 'Rental Start'} value={formatDate(rental.rentalStart, locale as 'ar' | 'en')} />
            <Row label={isRTL ? 'نهاية الإيجار' : 'Rental End'} value={formatDate(rental.rentalEnd, locale as 'ar' | 'en')} />
            {rental.odometerOut != null && <Row label={isRTL ? 'العداد (خروج)' : 'Odometer Out'} value={`${formatNumber(rental.odometerOut, locale as 'ar' | 'en')} km`} />}
            {rental.odometerIn != null && <Row label={isRTL ? 'العداد (دخول)' : 'Odometer In'} value={`${formatNumber(rental.odometerIn, locale as 'ar' | 'en')} km`} />}
            {rental.fuelLevel != null && (
              <div className="py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">{isRTL ? 'مستوى الوقود' : 'Fuel Level'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${rental.fuelLevel}%`, backgroundColor: rental.fuelLevel > 50 ? '#16a34a' : rental.fuelLevel > 20 ? '#d97706' : '#dc2626' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{rental.fuelLevel}%</span>
                </div>
              </div>
            )}
            {rental.conditionRating && (
              <div className="py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">{isRTL ? 'حالة المركبة' : 'Condition'}</p>
                <p className="text-sm font-bold mt-1" style={{ color: conditionColor(rental.conditionRating) }}>
                  {conditionLabel(rental.conditionRating)}
                </p>
              </div>
            )}
          </div>
          {rental.notes && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</p>
              <p className="text-sm text-gray-700">{rental.notes}</p>
            </div>
          )}
        </Section>

        {/* Condition Photos */}
        {rental.conditionPhotos && rental.conditionPhotos.length > 0 && (
          <Section title={isRTL ? 'صور حالة المركبة' : 'Condition Photos'} className="mb-6">
            <div className="flex flex-wrap gap-3 mt-2">
              {rental.conditionPhotos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={resolveDocumentFileUrl(url)} alt={`Photo ${i + 1}`} className="w-28 h-20 object-cover rounded-lg border border-gray-200" />
              ))}
            </div>
          </Section>
        )}

        {/* Checklist */}
        <Section title={isRTL ? 'قائمة فحص التسليم' : 'Handover Checklist'} className="mb-6">
          <div className="flex flex-wrap gap-2 mt-2">
            {CHECKLIST_ITEMS.filter((item) => (rental.checklistItems ?? []).includes(item.id)).map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-200 bg-green-50 text-green-700 text-[12px] font-medium">
                <span className="text-green-500 font-bold">✓</span>
                {isRTL ? item.ar : item.en}
              </span>
            ))}
            {(rental.checklistItems ?? []).length === 0 && (
              <p className="text-xs text-gray-400 italic">{isRTL ? 'لا توجد بنود محددة' : 'No items checked'}</p>
            )}
          </div>
        </Section>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              {isRTL ? 'توقيع العميل' : "Client's Signature"}
            </p>
            {rental.signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveDocumentFileUrl(rental.signatureUrl)} alt="Client Signature" className="h-20 object-contain" />
            ) : (
              <div className="h-20 border-b border-gray-300" />
            )}
            <p className="text-xs text-gray-600 mt-2 font-medium">{rental.clientName}</p>
            <p className="text-[10px] text-gray-400">{formatDate(rental.rentalStart, locale as 'ar' | 'en')}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              {isRTL ? 'توقيع المسؤول' : "Manager's Signature"}
            </p>
            {rental.managerSignatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveDocumentFileUrl(rental.managerSignatureUrl)} alt="Manager Signature" className="h-20 object-contain" />
            ) : (
              <div className="h-20 border-b border-gray-300" />
            )}
            <p className="text-[10px] text-gray-400 mt-2">{isRTL ? 'الاسم والتوقيع والختم' : 'Name, Signature & Stamp'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
          {isRTL
            ? `هذه الوثيقة صادرة آلياً من نظام إدارة الأسطول — ${new Date().toLocaleDateString('ar-SA')}`
            : `This document was auto-generated by the Fleet Management System — ${new Date().toLocaleDateString('en-GB')}`}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-50 rounded-xl p-4 ${className ?? ''}`}>
      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="py-1.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase">{label}</p>
      <p className={`text-sm text-gray-800 mt-0.5 ${mono ? 'font-mono font-bold' : 'font-medium'}`}>{value}</p>
    </div>
  );
}
