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
  notes: '',
};

// â”€â”€ Signature Canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <span className="text-xs font-medium text-gray-600">{isRTL ? 'ط§ظ„طھظˆظ‚ظٹط¹' : 'Signature'}</span>
        {!isEmpty && (
          <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" /> {isRTL ? 'ظ…ط³ط­' : 'Clear'}
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
      <p className="text-xs text-gray-400">{isRTL ? 'ط§ط±ط³ظ… طھظˆظ‚ظٹط¹ظƒ ط£ط¹ظ„ط§ظ‡ ط«ظ… ط§ط¶ط؛ط· ط­ظپط¸' : 'Draw signature above then press Save'}</p>
      <button
        type="button"
        disabled={isEmpty || saving}
        onClick={save}
        className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
      >
        {saving ? '...' : isRTL ? 'ط­ظپط¸ ط§ظ„طھظˆظ‚ظٹط¹' : 'Save Signature'}
      </button>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function StaffAssignmentsPage() {
  const { id: vehicleId } = useParams<{ id: string }>();
  const { locale, isRTL, t } = useLocale();
  const tc = t.common;
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
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
      setSignatureSaved(false);
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
      ? isRTL ? 'ط¬ظٹط¯ط©' : 'Good'
      : rating === 'FAIR'
      ? isRTL ? 'ظ…ظ‚ط¨ظˆظ„ط©' : 'Fair'
      : isRTL ? 'ط¶ط¹ظٹظپط©' : 'Poor';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Link
          href={`/${locale}/dashboard/vehicles/${vehicleId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowBack className="w-4 h-4" />
          {isRTL ? 'ط§ظ„ط¹ظˆط¯ط© ظ„ظ„ظ…ط±ظƒط¨ط©' : 'Back to Vehicle'}
        </Link>
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-900">
            {isRTL ? 'طھط®طµظٹطµ ط§ظ„ظ…ط±ظƒط¨ط© ظ„ظ„ظ…ظˆط¸ظپظٹظ†' : 'Staff Vehicle Assignments'}
          </h1>
        </div>
        {vehicle && (
          <p className="text-sm text-gray-500">
            {vehicle.plateNumber} â€” {vehicle.year ?? ''} {vehicle.make} {vehicle.model}
          </p>
        )}
      </div>

      {/* Active assignment banner */}
      {active.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-purple-500 font-medium mb-0.5">
                {isRTL ? 'ظ…ط®طµطµط© ط­ط§ظ„ظٹط§ظ‹ ظ„ظ€' : 'Currently assigned to'}
              </p>
              <p className="font-semibold text-purple-900">{active[0].assigneeName}</p>
              {active[0].assigneeTitle && (
                <p className="text-sm text-purple-700">{active[0].assigneeTitle}</p>
              )}
              <p className="text-xs text-purple-500 mt-1">
                {isRTL ? 'ظ…ظ†ط°' : 'Since'} {formatDate(active[0].assignedAt, locale as 'ar' | 'en')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/dashboard/vehicles/${vehicleId}/staff/${active[0].id}/report`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-purple-300 text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {isRTL ? 'ظˆط«ظٹظ‚ط© ط§ظ„طھط³ظ„ظٹظ…' : 'Handover Doc'}
              </Link>
              <button
                onClick={() => setReturnTarget(active[0])}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-purple-300 text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                {isRTL ? 'طھط³ط¬ظٹظ„ ط§ظ„ط¥ط±ط¬ط§ط¹' : 'Return Vehicle'}
              </button>
            </div>
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
          {isRTL ? 'طھط®طµظٹطµ ظ„ظ„ظ…ظˆط¸ظپ' : 'Assign to Staff'}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-gray-800">
            {isRTL ? 'طھط®طµظٹطµ ظ…ط±ظƒط¨ط© ظ„ظ…ظˆط¸ظپ' : 'Assign Vehicle to Staff'}
          </h2>

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ *' : 'Employee Name *'}
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
                {isRTL ? 'ط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ' : 'Job Title'}
              </label>
              <input
                value={form.assigneeTitle}
                onChange={(e) => setForm({ ...form, assigneeTitle: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ' : 'Phone'}
              </label>
              <input
                value={form.assigneePhone}
                onChange={(e) => setForm({ ...form, assigneePhone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'ط±ظ‚ظ… ط§ظ„ظ‡ظˆظٹط©' : 'National ID'}
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
              {isRTL ? 'ط­ط§ظ„ط© ط§ظ„ظ…ط±ظƒط¨ط© ط¹ظ†ط¯ ط§ظ„طھط³ظ„ظٹظ…' : 'Vehicle State at Handover'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {isRTL ? 'ط¹ط¯ط§ط¯ ط§ظ„ظƒظٹظ„ظˆظ…طھط±ط§طھ (ط®ط±ظˆط¬)' : 'Odometer Out (km)'}
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
                  {isRTL ? `ظ…ط³طھظˆظ‰ ط§ظ„ظˆظ‚ظˆط¯: ${form.fuelLevel}%` : `Fuel Level: ${form.fuelLevel}%`}
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
                {isRTL ? 'ط­ط§ظ„ط© ط§ظ„ظ…ط±ظƒط¨ط©' : 'Vehicle Condition'}
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

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'ظ…ظ„ط§ط­ط¸ط§طھ' : 'Notes'}
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
                {isRTL ? 'طµظˆط± ط­ط§ظ„ط© ط§ظ„ظ…ط±ظƒط¨ط©' : 'Condition Photos'}
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
                {isRTL ? 'ط¥ط¶ط§ظپط© طµظˆط±ط©' : 'Add Photo'}
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

          {/* Signature */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isRTL ? 'طھظˆظ‚ظٹط¹ ط§ظ„ظ…ط³طھظ„ظ…' : "Recipient's Signature"}
            </p>
            {signatureSaved ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                <span>âœ“</span>
                <span>{isRTL ? 'طھظ… ط­ظپط¸ ط§ظ„طھظˆظ‚ظٹط¹' : 'Signature saved'}</span>
                <button
                  type="button"
                  onClick={() => { setSignatureSaved(false); setForm((f) => ({ ...f, signatureUrl: '' })); }}
                  className="ms-auto text-xs text-green-600 underline"
                >
                  {isRTL ? 'ط¥ط¹ط§ط¯ط©' : 'Redo'}
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

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? (isRTL ? 'ط¬ط§ط±ظچ ط§ظ„ط­ظپط¸...' : 'Saving...') : (isRTL ? 'ط­ظپط¸' : 'Save')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyForm); setSignatureSaved(false); }}
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
              {isRTL ? 'طھط³ط¬ظٹظ„ ط¥ط±ط¬ط§ط¹ ط§ظ„ظ…ط±ظƒط¨ط©' : 'Record Vehicle Return'}
            </h2>
            <p className="text-sm text-gray-600">
              {isRTL ? `ط¥ط±ط¬ط§ط¹ ظ…ظ† ${returnTarget.assigneeName}` : `Returning from ${returnTarget.assigneeName}`}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isRTL ? 'ط¹ط¯ط§ط¯ ط§ظ„ظƒظٹظ„ظˆظ…طھط±ط§طھ (ط¯ط®ظˆظ„)' : 'Odometer In (km)'}
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
                {returnMutation.isPending ? '...' : (isRTL ? 'طھط£ظƒظٹط¯ ط§ظ„ط¥ط±ط¬ط§ط¹' : 'Confirm Return')}
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
            {isRTL ? 'ط³ط¬ظ„ ط§ظ„طھط®طµظٹطµط§طھ' : 'Assignment History'}
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
                    {formatDate(a.assignedAt, locale as 'ar' | 'en')} â†’ {a.returnedAt ? formatDate(a.returnedAt, locale as 'ar' | 'en') : 'â€”'}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-0.5">
                    {a.odometerOut != null && (
                      <span>{isRTL ? 'ط®ط±ظˆط¬' : 'Out'}: {formatNumber(a.odometerOut, locale as 'ar' | 'en')} km</span>
                    )}
                    {a.odometerIn != null && (
                      <span>{isRTL ? 'ط¯ط®ظˆظ„' : 'In'}: {formatNumber(a.odometerIn, locale as 'ar' | 'en')} km</span>
                    )}
                    {a.fuelLevel != null && (
                      <span>{isRTL ? 'ظˆظ‚ظˆط¯' : 'Fuel'}: {a.fuelLevel}%</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/${locale}/dashboard/vehicles/${vehicleId}/staff/${a.id}/report`}
                    className="p-1.5 rounded text-gray-300 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    title={isRTL ? 'ظˆط«ظٹظ‚ط© ط§ظ„طھط³ظ„ظٹظ…' : 'Handover Document'}
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

