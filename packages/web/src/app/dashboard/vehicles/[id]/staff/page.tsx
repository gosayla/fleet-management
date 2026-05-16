'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatNumber } from '@/lib/i18n';
import { ArrowLeft, ArrowRight, Briefcase, Plus, RotateCcw, Trash2 } from 'lucide-react';

type StaffAssignment = {
  id: string;
  assigneeName: string;
  assigneeTitle?: string | null;
  assigneePhone?: string | null;
  assigneeNationalId?: string | null;
  assignedAt: string;
  returnedAt?: string | null;
  odometerOut?: number | null;
  odometerIn?: number | null;
  notes?: string | null;
};

type Vehicle = {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
};

const emptyForm = {
  assigneeName: '',
  assigneeTitle: '',
  assigneePhone: '',
  assigneeNationalId: '',
  odometerOut: '',
  notes: '',
};

export default function StaffAssignmentsPage() {
  const { id: vehicleId, locale } = useParams<{ id: string; locale: string }>();
  const { isRTL, t } = useLocale();
  const tc = t.common;
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [returnTarget, setReturnTarget] = useState<StaffAssignment | null>(null);
  const [returnOdometer, setReturnOdometer] = useState('');

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: ['vehicle-brief', vehicleId],
    queryFn: async () => {
      const res = await api.get(`/vehicles/${vehicleId}`);
      return res.data;
    },
  });

  const { data: assignments = [], isLoading } = useQuery<StaffAssignment[]>({
    queryKey: ['staff-assignments', vehicleId],
    queryFn: async () => {
      const res = await api.get('/staff-assignments', { params: { vehicleId } });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post('/staff-assignments', { vehicleId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-assignments', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, odometerIn }: { id: string; odometerIn?: number }) =>
      api.post(`/staff-assignments/${id}/return`, {
        returnedAt: new Date().toISOString(),
        odometerIn: odometerIn || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-assignments', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      setReturnTarget(null);
      setReturnOdometer('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/staff-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-assignments', vehicleId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      assigneeName: form.assigneeName,
      assigneeTitle: form.assigneeTitle || undefined,
      assigneePhone: form.assigneePhone || undefined,
      assigneeNationalId: form.assigneeNationalId || undefined,
      odometerOut: form.odometerOut ? Number(form.odometerOut) : undefined,
      notes: form.notes || undefined,
    });
  };

  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const active = assignments.filter((a) => !a.returnedAt);
  const history = assignments.filter((a) => a.returnedAt);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Link
          href={`/${locale}/dashboard/vehicles/${vehicleId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowBack className="w-4 h-4" />
          {isRTL ? 'العودة للمركبة' : 'Back to Vehicle'}
        </Link>
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">
            {isRTL ? 'تخصيص المركبة للموظفين' : 'Staff Vehicle Assignments'}
          </h1>
        </div>
        {vehicle && (
          <p className="text-sm text-gray-500">
            {vehicle.plateNumber} — {vehicle.year ?? ''} {vehicle.make} {vehicle.model}
          </p>
        )}
      </div>

      {/* Active assignment banner */}
      {active.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-purple-500 font-medium mb-0.5">
                {isRTL ? 'مخصصة حالياً لـ' : 'Currently assigned to'}
              </p>
              <p className="font-semibold text-purple-900">{active[0].assigneeName}</p>
              {active[0].assigneeTitle && (
                <p className="text-sm text-purple-700">{active[0].assigneeTitle}</p>
              )}
              <p className="text-xs text-purple-500 mt-1">
                {isRTL ? 'منذ' : 'Since'} {formatDate(active[0].assignedAt, locale as 'ar' | 'en')}
              </p>
            </div>
            <button
              onClick={() => setReturnTarget(active[0])}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-purple-300 text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {isRTL ? 'تسجيل الإرجاع' : 'Return Vehicle'}
            </button>
          </div>
        </div>
      )}

      {/* Assign form toggle */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isRTL ? 'تخصيص للموظف' : 'Assign to Staff'}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">
            {isRTL ? 'تخصيص مركبة لموظف' : 'Assign Vehicle to Staff'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'اسم الموظف *' : 'Employee Name *'}
              </label>
              <input
                required
                value={form.assigneeName}
                onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'المسمى الوظيفي' : 'Job Title'}
              </label>
              <input
                value={form.assigneeTitle}
                onChange={(e) => setForm({ ...form, assigneeTitle: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'رقم الهاتف' : 'Phone'}
              </label>
              <input
                value={form.assigneePhone}
                onChange={(e) => setForm({ ...form, assigneePhone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'رقم الهوية' : 'National ID'}
              </label>
              <input
                value={form.assigneeNationalId}
                onChange={(e) => setForm({ ...form, assigneeNationalId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'عداد الكيلومترات (خروج)' : 'Odometer Out (km)'}
              </label>
              <input
                type="number"
                min="0"
                value={form.odometerOut}
                onChange={(e) => setForm({ ...form, odometerOut: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'ملاحظات' : 'Notes'}
              </label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyForm); }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {tc.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Return modal */}
      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-gray-800">
              {isRTL ? 'تسجيل إرجاع المركبة' : 'Record Vehicle Return'}
            </h2>
            <p className="text-sm text-gray-600">
              {isRTL ? `إرجاع من ${returnTarget.assigneeName}` : `Returning from ${returnTarget.assigneeName}`}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'عداد الكيلومترات (دخول)' : 'Odometer In (km)'}
              </label>
              <input
                type="number"
                min="0"
                value={returnOdometer}
                onChange={(e) => setReturnOdometer(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => returnMutation.mutate({
                  id: returnTarget.id,
                  odometerIn: returnOdometer ? Number(returnOdometer) : undefined,
                })}
                disabled={returnMutation.isPending}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {returnMutation.isPending ? '...' : (isRTL ? 'تأكيد الإرجاع' : 'Confirm Return')}
              </button>
              <button
                onClick={() => { setReturnTarget(null); setReturnOdometer(''); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
              >
                {tc.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">
            {isRTL ? 'سجل التخصيصات' : 'Assignment History'}
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
            {history.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{a.assigneeName}</p>
                  {a.assigneeTitle && (
                    <p className="text-xs text-gray-500">{a.assigneeTitle}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(a.assignedAt, locale as 'ar' | 'en')} → {a.returnedAt ? formatDate(a.returnedAt, locale as 'ar' | 'en') : '—'}
                  </p>
                  {(a.odometerOut != null || a.odometerIn != null) && (
                    <p className="text-xs text-gray-400">
                      {a.odometerOut != null && `${isRTL ? 'خروج' : 'Out'}: ${formatNumber(a.odometerOut, locale as 'ar' | 'en')} km`}
                      {a.odometerOut != null && a.odometerIn != null && ' · '}
                      {a.odometerIn != null && `${isRTL ? 'دخول' : 'In'}: ${formatNumber(a.odometerIn, locale as 'ar' | 'en')} km`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(a.id)}
                  className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  title={tc.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600" />
        </div>
      )}
    </div>
  );
}
