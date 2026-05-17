'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api, resolveDocumentFileUrl } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatNumber } from '@/lib/i18n';
import { Printer } from 'lucide-react';

type Assignment = {
  id: string;
  assigneeName: string;
  assigneeTitle?: string | null;
  assigneePhone?: string | null;
  assigneeNationalId?: string | null;
  assignedAt: string;
  returnedAt?: string | null;
  odometerOut?: number | null;
  odometerIn?: number | null;
  fuelLevel?: number | null;
  conditionRating?: string | null;
  conditionPhotos?: string[];
  signatureUrl?: string | null;
  managerSignatureUrl?: string | null;
  checklistItems?: string[];
  notes?: string | null;
  vehicle?: { plateNumber: string; make: string; model: string; year?: number | null; color?: string | null };
};

type Company = { name: string; logoUrl?: string | null };

const REPORT_CHECKLIST_ITEMS: { id: string; en: string; ar: string }[] = [
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

export default function AssignmentReportPage() {
  const { id: vehicleId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const { locale, isRTL, t } = useLocale();

  const { data: assignment, isLoading } = useQuery<Assignment>({
    queryKey: ['staff-assignment', assignmentId],
    queryFn: async () => {
      const res = await api.get(`/staff-assignments/${assignmentId}`);
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

  if (isLoading || !assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  const v = assignment.vehicle;
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-20 end-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 shadow-lg"
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
        className="bg-white p-6 max-w-3xl mx-auto print:p-3 print:max-w-none"
        style={{ fontFamily: isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-purple-700 pb-2 mb-3">
          <div>
            {company?.name && (
              <p className="text-lg font-bold text-gray-900">{company.name}</p>
            )}
            <h1 className="text-xl font-black text-purple-700 mt-0.5">
              {isRTL ? 'وثيقة تسليم مركبة' : 'Vehicle Handover Document'}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {isRTL ? 'رقم السجل:' : 'Record ID:'} {assignment.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="text-end text-xs text-gray-500 space-y-0.5">
            <p>{isRTL ? 'تاريخ الإصدار:' : 'Issued:'} {new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-GB')}</p>
            <p className="text-purple-600 font-semibold">
              {assignment.returnedAt
                ? (isRTL ? 'مُرجَعة' : 'Returned')
                : (isRTL ? 'نشطة' : 'Active')}
            </p>
          </div>
        </div>

        {/* Vehicle + Assignee info in two columns */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Vehicle */}
          <Section title={isRTL ? 'بيانات المركبة' : 'Vehicle Details'}>
            <Row label={isRTL ? 'رقم اللوحة' : 'Plate Number'} value={v?.plateNumber ?? '—'} mono />
            <Row label={isRTL ? 'الموديل' : 'Make / Model'} value={v ? `${v.year ?? ''} ${v.make} ${v.model}`.trim() : '—'} />
            {v?.color && <Row label={isRTL ? 'اللون' : 'Color'} value={v.color} />}
          </Section>

          {/* Assignee */}
          <Section title={isRTL ? 'بيانات المستلم' : 'Assignee Details'}>
            <Row label={isRTL ? 'الاسم' : 'Name'} value={assignment.assigneeName} />
            {assignment.assigneeTitle && <Row label={isRTL ? 'المسمى الوظيفي' : 'Job Title'} value={assignment.assigneeTitle} />}
            {assignment.assigneePhone && <Row label={isRTL ? 'الهاتف' : 'Phone'} value={assignment.assigneePhone} />}
            {assignment.assigneeNationalId && <Row label={isRTL ? 'رقم الهوية' : 'National ID'} value={assignment.assigneeNationalId} mono />}
          </Section>
        </div>

        {/* Handover state */}
        <Section title={isRTL ? 'حالة المركبة عند التسليم' : 'Vehicle State at Handover'} className="mb-3">
          <div className="grid grid-cols-2 gap-x-6">
            <Row label={isRTL ? 'تاريخ التسليم' : 'Handover Date'} value={formatDate(assignment.assignedAt, locale as 'ar' | 'en')} />
            {assignment.returnedAt && <Row label={isRTL ? 'تاريخ الإرجاع' : 'Return Date'} value={formatDate(assignment.returnedAt, locale as 'ar' | 'en')} />}
            {assignment.odometerOut != null && <Row label={isRTL ? 'العداد (خروج)' : 'Odometer Out'} value={`${formatNumber(assignment.odometerOut, locale as 'ar' | 'en')} km`} />}
            {assignment.odometerIn != null && <Row label={isRTL ? 'العداد (دخول)' : 'Odometer In'} value={`${formatNumber(assignment.odometerIn, locale as 'ar' | 'en')} km`} />}
            {assignment.fuelLevel != null && (
              <div className="flex items-center gap-2 py-1">
                <span className="text-xs font-semibold text-gray-400 uppercase whitespace-nowrap shrink-0">{isRTL ? 'مستوى الوقود' : 'Fuel Level'}:</span>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${assignment.fuelLevel}%`, backgroundColor: assignment.fuelLevel > 50 ? '#16a34a' : assignment.fuelLevel > 20 ? '#d97706' : '#dc2626' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">{assignment.fuelLevel}%</span>
                </div>
              </div>
            )}
            {assignment.conditionRating && (
              <div className="flex items-baseline gap-2 py-1">
                <span className="text-xs font-semibold text-gray-400 uppercase whitespace-nowrap shrink-0">{isRTL ? 'حالة المركبة' : 'Condition'}:</span>
                <span className="text-sm font-bold" style={{ color: conditionColor(assignment.conditionRating) }}>
                  {conditionLabel(assignment.conditionRating)}
                </span>
              </div>
            )}
          </div>
          {assignment.notes && (
            <div className="flex items-baseline gap-2 mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase whitespace-nowrap shrink-0">{isRTL ? 'ملاحظات' : 'Notes'}:</span>
              <span className="text-xs text-gray-700">{assignment.notes}</span>
            </div>
          )}
        </Section>

        {/* Condition Photos */}
        {assignment.conditionPhotos && assignment.conditionPhotos.length > 0 && (
          <Section title={isRTL ? 'صور حالة المركبة' : 'Condition Photos'} className="mb-3">
            <div className="flex flex-wrap gap-2 mt-1">
              {assignment.conditionPhotos.map((url, i) => (
                <img
                  key={i}
                  src={resolveDocumentFileUrl(url)}
                  alt={`Photo ${i + 1}`}
                  className="w-20 h-14 object-cover rounded border border-gray-200"
                />
              ))}
            </div>
          </Section>
        )}

        {/* Checklist */}
        <Section title={isRTL ? 'قائمة فحص التسليم' : 'Handover Checklist'} className="mb-3">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {REPORT_CHECKLIST_ITEMS.filter((item) =>
              (assignment.checklistItems ?? []).includes(item.id)
            ).map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-xs font-medium"
              >
                <span className="text-green-500 font-bold">✓</span>
                {isRTL ? item.ar : item.en}
              </span>
            ))}
            {(assignment.checklistItems ?? []).length === 0 && (
              <p className="text-xs text-gray-400 italic">{isRTL ? 'لا توجد بنود محددة' : 'No items checked'}</p>
            )}
          </div>
        </Section>

        {/* Signature */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">
              {isRTL ? 'توقيع المستلم' : "Recipient's Signature"}
            </p>
            {assignment.signatureUrl ? (
              <img
                src={resolveDocumentFileUrl(assignment.signatureUrl)}
                alt="Signature"
                className="h-12 object-contain"
              />
            ) : (
              <div className="h-12 border-b border-gray-300" />
            )}
            <p className="text-xs text-gray-600 mt-1.5 font-medium">{assignment.assigneeName}</p>
            <p className="text-[11px] text-gray-400">{formatDate(assignment.assignedAt, locale as 'ar' | 'en')}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">
              {isRTL ? 'توقيع المسؤول' : "Manager's Signature"}
            </p>
            {assignment.managerSignatureUrl ? (
              <img
                src={resolveDocumentFileUrl(assignment.managerSignatureUrl)}
                alt="Manager Signature"
                className="h-12 object-contain"
              />
            ) : (
              <div className="h-12 border-b border-gray-300" />
            )}
            <p className="text-[11px] text-gray-400 mt-1.5">{isRTL ? 'الاسم والتوقيع والختم' : 'Name, Signature & Stamp'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-gray-200 text-center text-[10px] text-gray-400">
          {isRTL
            ? `هذه الوثيقة صادرة آلياً من نظام إدارة الأسطول — ${new Date().toLocaleDateString('ar-SA')}`
            : `This document was auto-generated by the Fleet Management System — ${new Date().toLocaleDateString('en-GB')}`}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${className ?? ''}`}>
      <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-xs font-semibold text-gray-400 uppercase whitespace-nowrap shrink-0">{label}:</span>
      <span className={`text-sm text-gray-800 ${mono ? 'font-mono font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}
