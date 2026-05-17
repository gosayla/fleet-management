'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, resolveDocumentFileUrl } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { formatDate, formatNumber } from '@/lib/i18n';
import { ArrowLeft, ArrowRight, Briefcase, Plus, RotateCcw, Trash2, Camera, FileText, X, Upload } from 'lucide-react';

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
  fuelLevel?: number | null;
  conditionRating?: string | null;
  conditionPhotos?: string[];
  signatureUrl?: string | null;
  managerSignatureUrl?: string | null;
  checklistItems?: string[];
  notes?: string | null;
};

type Vehicle = {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year?: number | null;
};

const emptyForm = {
  assigneeName: '',
  assigneeTitle: '',
  assigneePhone: '',
  assigneeNationalId: '',
  odometerOut: '',
  fuelLevel: '75',
  conditionRating: 'GOOD' as 'GOOD' | 'FAIR' | 'POOR',
  conditionPhotos: [] as string[],
  signatureUrl: '',
  managerSignatureUrl: '',
  checklistItems: [] as string[],
  notes: '',
};

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

// ── Signature Canvas ──────────────────────────────────────────────────────────
function SignatureCanvas({
  onSave,
  isRTL,
}: {
  onSave: (url: string) => void;
  isRTL: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    drawing.current = true;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsEmpty(false);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a1a';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      const fd = new FormData();
      fd.append('file', blob, 'signature.png');
      const { data } = await api.post('/documents/files', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSave(data.fileUrl);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{isRTL ? 'التوقيع' : 'Signature'}</span>
        {!isEmpty && (
          <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" /> {isRTL ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={480}
        height={140}
        className="w-full border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <p className="text-xs text-gray-400">{isRTL ? 'ارسم توقيعك أعلاه ثم اضغط حفظ' : 'Draw signature above then press Save'}</p>
      <button
        type="button"
        disabled={isEmpty || saving}
        onClick={save}
        className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
      >
        {saving ? '...' : isRTL ? 'حفظ التوقيع' : 'Save Signature'}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffAssignmentsPage() {
  const { id: vehicleId } = useParams<{ id: string }>();
  const { locale, isRTL, t } = useLocale();
  const tc = t.common;
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [managerSignatureSaved, setManagerSignatureSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [returnTarget, setReturnTarget] = useState<StaffAssignment | null>(null);
  const [returnOdometer, setReturnOdometer] = useState('');
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

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
      setSignatureSaved(false);
      setManagerSignatureSaved(false);
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await api.post('/documents/files', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        urls.push(data.fileUrl);
      }
      setForm((f) => ({ ...f, conditionPhotos: [...f.conditionPhotos, ...urls] }));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  function removePhoto(url: string) {
    setForm((f) => ({ ...f, conditionPhotos: f.conditionPhotos.filter((u) => u !== url) }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      assigneeName: form.assigneeName,
      assigneeTitle: form.assigneeTitle || undefined,
      assigneePhone: form.assigneePhone || undefined,
      assigneeNationalId: form.assigneeNationalId || undefined,
      odometerOut: form.odometerOut ? Number(form.odometerOut) : undefined,
      fuelLevel: Number(form.fuelLevel),
      conditionRating: form.conditionRating,
      conditionPhotos: form.conditionPhotos,
      checklistItems: form.checklistItems,
      signatureUrl: form.signatureUrl || undefined,
      notes: form.notes || undefined,
    });
  };

  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;
  const active = assignments.filter((a) => !a.returnedAt);
  const history = assignments.filter((a) => a.returnedAt);

  const conditionColors: Record<string, string> = {
    GOOD: 'bg-green-100 text-green-700 border-green-300',
    FAIR: 'bg-amber-100 text-amber-700 border-amber-300',
    POOR: 'bg-red-100 text-red-700 border-red-300',
  };
  const conditionLabels = (rating: string) =>
    rating === 'GOOD'
      ? isRTL ? 'جيدة' : 'Good'
      : rating === 'FAIR'
      ? isRTL ? 'مقبولة' : 'Fair'
      : isRTL ? 'ضعيفة' : 'Poor';

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
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/dashboard/vehicles/${vehicleId}/staff/${active[0].id}/report`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-purple-300 text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {isRTL ? 'وثيقة التسليم' : 'Handover Doc'}
              </Link>
              <button
                onClick={() => setReturnTarget(active[0])}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-purple-300 text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {isRTL ? 'تسجيل الإرجاع' : 'Return Vehicle'}
              </button>
            </div>
          </div>
          {/* Condition photos */}
          {active[0].conditionPhotos && active[0].conditionPhotos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs text-purple-500 font-medium mb-2">
                {isRTL ? 'صور حالة المركبة عند التسليم' : 'Condition Photos at Handover'}
              </p>
              <div className="flex flex-wrap gap-2">
                {active[0].conditionPhotos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox({ photos: active[0].conditionPhotos!, index: i })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveDocumentFileUrl(url)}
                      alt={`photo-${i + 1}`}
                      className="w-20 h-16 object-cover rounded-lg border border-purple-200 hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 end-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-7 h-7" />
            </button>

            {/* Main image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveDocumentFileUrl(lightbox.photos[lightbox.index])}
              alt={`photo-${lightbox.index + 1}`}
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />

            {/* Counter */}
            <p className="text-center text-white/70 text-sm mt-2">
              {lightbox.index + 1} / {lightbox.photos.length}
            </p>

            {/* Prev / Next */}
            {lightbox.photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightbox((lb) => lb && { ...lb, index: (lb.index - 1 + lb.photos.length) % lb.photos.length })}
                  className="absolute top-1/2 -translate-y-1/2 start-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setLightbox((lb) => lb && { ...lb, index: (lb.index + 1) % lb.photos.length })}
                  className="absolute top-1/2 -translate-y-1/2 end-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  {isRTL ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                </button>
              </>
            )}

            {/* Thumbnail strip */}
            {lightbox.photos.length > 1 && (
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                {lightbox.photos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightbox((lb) => lb && { ...lb, index: i })}
                    className={`w-14 h-10 rounded overflow-hidden border-2 transition-colors ${
                      i === lightbox.index ? 'border-purple-400' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveDocumentFileUrl(url)} alt={`thumb-${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
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
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-gray-800">
            {isRTL ? 'تخصيص مركبة لموظف' : 'Assign Vehicle to Staff'}
          </h2>

          {/* Basic info */}
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
          </div>

          {/* Vehicle state */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isRTL ? 'حالة المركبة عند التسليم' : 'Vehicle State at Handover'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {isRTL ? `مستوى الوقود: ${form.fuelLevel}%` : `Fuel Level: ${form.fuelLevel}%`}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={form.fuelLevel}
                  onChange={(e) => setForm({ ...form, fuelLevel: e.target.value })}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            </div>

            {/* Condition rating */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                {isRTL ? 'حالة المركبة' : 'Vehicle Condition'}
              </label>
              <div className="flex gap-2">
                {(['GOOD', 'FAIR', 'POOR'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, conditionRating: r })}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      form.conditionRating === r
                        ? conditionColors[r]
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {conditionLabels(r)}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {isRTL ? 'قائمة فحص التسليم' : 'Handover Checklist'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, checklistItems: CHECKLIST_ITEMS.map((i) => i.id) }))}
                    className="text-[10px] text-purple-600 hover:underline"
                  >
                    {isRTL ? 'تحديد الكل' : 'All'}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, checklistItems: [] }))}
                    className="text-[10px] text-gray-400 hover:underline"
                  >
                    {isRTL ? 'إلغاء الكل' : 'None'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CHECKLIST_ITEMS.map((item) => {
                  const checked = form.checklistItems.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          checklistItems: checked
                            ? f.checklistItems.filter((x) => x !== item.id)
                            : [...f.checklistItems, item.id],
                        }))
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-start ${
                        checked
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                        checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                      }`}>
                        {checked && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      {isRTL ? item.ar : item.en}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400">
                {form.checklistItems.length}/{CHECKLIST_ITEMS.length} {isRTL ? 'عنصر محدد' : 'items checked'}
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>
          </div>

          {/* Photos */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isRTL ? 'صور حالة المركبة' : 'Condition Photos'}
              </p>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {uploadingPhoto ? (
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                {isRTL ? 'إضافة صورة' : 'Add Photo'}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            {form.conditionPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.conditionPhotos.map((url) => (
                  <div key={url} className="relative group w-20 h-20">
                    <img
                      src={resolveDocumentFileUrl(url)}
                      alt=""
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recipient's Signature */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isRTL ? 'توقيع المستلم' : "Recipient's Signature"}
            </p>
            {signatureSaved ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                <span>✓</span>
                <span>{isRTL ? 'تم حفظ التوقيع' : 'Signature saved'}</span>
                <button
                  type="button"
                  onClick={() => { setSignatureSaved(false); setForm((f) => ({ ...f, signatureUrl: '' })); }}
                  className="ms-auto text-xs text-green-600 underline"
                >
                  {isRTL ? 'إعادة' : 'Redo'}
                </button>
              </div>
            ) : (
              <SignatureCanvas
                isRTL={isRTL}
                onSave={(url) => {
                  setForm((f) => ({ ...f, signatureUrl: url }));
                  setSignatureSaved(true);
                }}
              />
            )}
          </div>

          {/* Manager's Signature */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isRTL ? 'توقيع المدير' : "Manager's Signature"}
            </p>
            {managerSignatureSaved ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                <span>✓</span>
                <span>{isRTL ? 'تم حفظ توقيع المدير' : 'Manager signature saved'}</span>
                <button
                  type="button"
                  onClick={() => { setManagerSignatureSaved(false); setForm((f) => ({ ...f, managerSignatureUrl: '' })); }}
                  className="ms-auto text-xs text-green-600 underline"
                >
                  {isRTL ? 'إعادة' : 'Redo'}
                </button>
              </div>
            ) : (
              <SignatureCanvas
                isRTL={isRTL}
                onSave={(url) => {
                  setForm((f) => ({ ...f, managerSignatureUrl: url }));
                  setManagerSignatureSaved(true);
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyForm); setSignatureSaved(false); setManagerSignatureSaved(false); }}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-800 text-sm">{a.assigneeName}</p>
                    {a.conditionRating && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${conditionColors[a.conditionRating]}`}>
                        {conditionLabels(a.conditionRating)}
                      </span>
                    )}
                  </div>
                  {a.assigneeTitle && (
                    <p className="text-xs text-gray-500">{a.assigneeTitle}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(a.assignedAt, locale as 'ar' | 'en')} → {a.returnedAt ? formatDate(a.returnedAt, locale as 'ar' | 'en') : '—'}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-0.5">
                    {a.odometerOut != null && (
                      <span>{isRTL ? 'خروج' : 'Out'}: {formatNumber(a.odometerOut, locale as 'ar' | 'en')} km</span>
                    )}
                    {a.odometerIn != null && (
                      <span>{isRTL ? 'دخول' : 'In'}: {formatNumber(a.odometerIn, locale as 'ar' | 'en')} km</span>
                    )}
                    {a.fuelLevel != null && (
                      <span>{isRTL ? 'وقود' : 'Fuel'}: {a.fuelLevel}%</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/${locale}/dashboard/vehicles/${vehicleId}/staff/${a.id}/report`}
                    className="p-1.5 rounded text-gray-300 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    title={isRTL ? 'وثيقة التسليم' : 'Handover Document'}
                  >
                    <FileText className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => deleteMutation.mutate(a.id)}
                    className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title={tc.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
