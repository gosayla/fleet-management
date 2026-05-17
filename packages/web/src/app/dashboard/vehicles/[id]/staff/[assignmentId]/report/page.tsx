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
  notes?: string | null;
  vehicle?: { plateNumber: string; make: string; model: string; year?: number | null; color?: string | null };
};

type Company = { name: string; logoUrl?: string | null };

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
      <div className="print:hidden fixed top-4 end-4 z-50 flex gap-2">
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
        className="min-h-screen bg-white p-8 max-w-3xl mx-auto print:p-6 print:max-w-none"
        style={{ fontFamily: isRTL ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-purple-700 pb-4 mb-6">
          <div>
            {company?.name && (
              <p className="text-lg font-bold text-gray-900">{company.name}</p>
            )}
            <h1 className="text-2xl font-black text-purple-700 mt-1">
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
        <div className="grid grid-cols-2 gap-6 mb-6">
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
        <Section title={isRTL ? 'حالة المركبة عند التسليم' : 'Vehicle State at Handover'} className="mb-6">
          <div className="grid grid-cols-2 gap-x-8">
            <Row label={isRTL ? 'تاريخ التسليم' : 'Handover Date'} value={formatDate(assignment.assignedAt, locale as 'ar' | 'en')} />
            {assignment.returnedAt && <Row label={isRTL ? 'تاريخ الإرجاع' : 'Return Date'} value={formatDate(assignment.returnedAt, locale as 'ar' | 'en')} />}
            {assignment.odometerOut != null && <Row label={isRTL ? 'العداد (خروج)' : 'Odometer Out'} value={`${formatNumber(assignment.odometerOut, locale as 'ar' | 'en')} km`} />}
            {assignment.odometerIn != null && <Row label={isRTL ? 'العداد (دخول)' : 'Odometer In'} value={`${formatNumber(assignment.odometerIn, locale as 'ar' | 'en')} km`} />}
            {assignment.fuelLevel != null && (
              <div className="py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">{isRTL ? 'مستوى الوقود' : 'Fuel Level'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${assignment.fuelLevel}%`, backgroundColor: assignment.fuelLevel > 50 ? '#16a34a' : assignment.fuelLevel > 20 ? '#d97706' : '#dc2626' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{assignment.fuelLevel}%</span>
                </div>
              </div>
            )}
            {assignment.conditionRating && (
              <div className="py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">{isRTL ? 'حالة المركبة' : 'Condition'}</p>
                <p className="text-sm font-bold mt-1" style={{ color: conditionColor(assignment.conditionRating) }}>
                  {conditionLabel(assignment.conditionRating)}
                </p>
              </div>
            )}
          </div>
          {assignment.notes && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</p>
              <p className="text-sm text-gray-700">{assignment.notes}</p>
            </div>
          )}
        </Section>

        {/* Condition Photos */}
        {assignment.conditionPhotos && assignment.conditionPhotos.length > 0 && (
          <Section title={isRTL ? 'صور حالة المركبة' : 'Condition Photos'} className="mb-6">
            <div className="flex flex-wrap gap-3 mt-2">
              {assignment.conditionPhotos.map((url, i) => (
                <img
                  key={i}
                  src={resolveDocumentFileUrl(url)}
                  alt={`Photo ${i + 1}`}
                  className="w-28 h-20 object-cover rounded-lg border border-gray-200"
                />
              ))}
            </div>
          </Section>
        )}

        {/* Signature */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              {isRTL ? 'توقيع المستلم' : "Recipient's Signature"}
            </p>
            {assignment.signatureUrl ? (
              <img
                src={resolveDocumentFileUrl(assignment.signatureUrl)}
                alt="Signature"
                className="h-20 object-contain"
              />
            ) : (
              <div className="h-20 border-b border-gray-300" />
            )}
            <p className="text-xs text-gray-600 mt-2 font-medium">{assignment.assigneeName}</p>
            <p className="text-[10px] text-gray-400">{formatDate(assignment.assignedAt, locale as 'ar' | 'en')}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              {isRTL ? 'توقيع المسؤول' : "Manager's Signature"}
            </p>
            <div className="h-20 border-b border-gray-300" />
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
      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-3">{title}</p>
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
