'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { ArrowLeft, ArrowRight, Key, Upload, CheckCircle, Camera, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

interface Vehicle { id: string; plateNumber: string; make: string; model: string; sequenceNumber?: string | null }

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

function SignatureCanvas({ onSave, isRTL }: { onSave: (url: string) => void; isRTL: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault(); drawing.current = true;
    const ctx = canvas.getContext('2d')!; const { x, y } = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y); setIsEmpty(false);
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    e.preventDefault(); const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a1a1a';
    const { x, y } = getPos(e, canvas); ctx.lineTo(x, y); ctx.stroke();
  }
  function stopDraw() { drawing.current = false; }
  function clear() { const canvas = canvasRef.current; if (!canvas) return; canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height); setIsEmpty(true); }
  async function save() {
    const canvas = canvasRef.current; if (!canvas || isEmpty) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      const fd = new FormData(); fd.append('file', blob, 'signature.png');
      const { data } = await api.post('/documents/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSave(data.fileUrl);
    } finally { setSaving(false); }
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{isRTL ? 'التوقيع' : 'Signature'}</span>
        {!isEmpty && <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> {isRTL ? 'مسح' : 'Clear'}</button>}
      </div>
      <canvas ref={canvasRef} width={480} height={140} className="w-full border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 cursor-crosshair touch-none"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
      <p className="text-xs text-gray-400">{isRTL ? 'ارسم توقيعك أعلاه ثم اضغط حفظ' : 'Draw signature above then press Save'}</p>
      <button type="button" disabled={isEmpty || saving} onClick={save}
        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
        {saving ? '...' : isRTL ? 'حفظ التوقيع' : 'Save Signature'}
      </button>
    </div>
  );
}

export default function RentalsNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tr = t.rentals;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const [vehicleQuery, setVehicleQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [rentalStart, setRentalStart] = useState<string | undefined>(undefined);
  const [rentalEnd, setRentalEnd] = useState<string | undefined>(undefined);
  const [contractFileUrl, setContractFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vehicleComboRef = useRef<HTMLDivElement>(null);
  // Handover state
  const [fuelLevel, setFuelLevel] = useState(75);
  const [conditionRating, setConditionRating] = useState<'GOOD' | 'FAIR' | 'POOR'>('GOOD');
  const [conditionPhotos, setConditionPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [managerSignatureUrl, setManagerSignatureUrl] = useState('');
  const [managerSignatureSaved, setManagerSignatureSaved] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: vehiclesRes, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });
  const vehicles = vehiclesRes ?? [];

  const filteredVehicles = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(v => v.plateNumber.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q));
  }, [vehicles, vehicleQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (vehicleComboRef.current && !vehicleComboRef.current.contains(e.target as Node)) setVehicleDropdownOpen(false); };
    if (vehicleDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [vehicleDropdownOpen]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/rentals', payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      router.push(`/${locale}/dashboard/rentals`);
    },
  });

  const uploadPhotos = useCallback(async (files: FileList) => {
    setUploadingPhoto(true);
    try {
      const urls = await Promise.all(Array.from(files).map(async (file) => {
        const fd = new FormData(); fd.append('file', file);
        const { data } = await api.post<{ fileUrl: string }>('/documents/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        return data.fileUrl;
      }));
      setConditionPhotos((p) => [...p, ...urls]);
    } finally { setUploadingPhoto(false); }
  }, []);

  async function uploadContractFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post<{ fileUrl: string }>('/documents/files', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setContractFileUrl(res.data.fileUrl);
      setUploadedFileName(file.name);
    } catch {
      setUploadedFileName('');
      setContractFileUrl('');
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedVehicleId || !rentalStart || !rentalEnd) return;
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const odometerOut = get('odometerOut') ? parseFloat(get('odometerOut')) : undefined;
    const dailyRateSar = get('dailyRateSar') ? parseFloat(get('dailyRateSar')) : undefined;
    createMutation.mutate({
      vehicleId: selectedVehicleId,
      clientName: get('clientName'),
      clientPhone: get('clientPhone') || undefined,
      clientNationalId: get('clientNationalId') || undefined,
      contractNumber: get('contractNumber') || undefined,
      rentalStart,
      rentalEnd,
      odometerOut,
      dailyRateSar,
      contractFileUrl: contractFileUrl || undefined,
      notes: get('notes') || undefined,
      fuelLevel,
      conditionRating,
      conditionPhotos,
      checklistItems,
      signatureUrl: signatureUrl || undefined,
      managerSignatureUrl: managerSignatureUrl || undefined,
    });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Link href={`/${locale}/dashboard/rentals`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowBack className="w-4 h-4" />
        {tr.title}
      </Link>

      <div className="flex items-center gap-3">
        <Key className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{tr.newTitle}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Client Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{locale === 'ar' ? 'بيانات العميل' : 'Client Information'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: tr.clientName, name: 'clientName', required: true, placeholder: locale === 'ar' ? 'اسم العميل' : 'Client name' },
              { label: tr.clientPhone, name: 'clientPhone', placeholder: locale === 'ar' ? 'اختياري' : 'Optional' },
              { label: tr.clientNationalId, name: 'clientNationalId', placeholder: locale === 'ar' ? 'اختياري' : 'Optional' },
              { label: tr.contractNumber, name: 'contractNumber', placeholder: locale === 'ar' ? 'اختياري' : 'Optional' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}{f.required && <span className="text-red-500 ms-0.5">*</span>}</label>
                <input type="text" name={f.name} required={f.required} placeholder={f.placeholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{tr.vehicle}</p>
          <div className="relative" ref={vehicleComboRef}>
            <input
              type="text"
              value={vehicleQuery}
              placeholder={vehiclesLoading ? (locale === 'ar' ? 'جاري التحميل…' : 'Loading…') : (locale === 'ar' ? 'ابحث عن مركبة' : 'Search vehicle')}
              disabled={vehiclesLoading}
              autoComplete="off"
              onChange={e => { setVehicleQuery(e.target.value); setSelectedVehicleId(undefined); setVehicleDropdownOpen(true); }}
              onFocus={() => setVehicleDropdownOpen(true)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {vehicleDropdownOpen && filteredVehicles.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                {filteredVehicles.map(v => (
                  <li key={v.id}>
                    <button type="button" className="w-full px-3 py-2 text-start hover:bg-blue-50 hover:text-blue-700 text-gray-800"
                      onClick={() => { setSelectedVehicleId(v.id); setVehicleQuery(`${v.plateNumber} — ${v.make} ${v.model}`); setVehicleDropdownOpen(false); }}>
                      <span className="font-mono font-semibold">{v.plateNumber}</span>
                      <span className="text-gray-500 ms-1">— {v.make} {v.model}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedVehicleId && <p className="mt-1.5 text-xs text-green-600">{locale === 'ar' ? '✓ تم الاختيار' : '✓ Selected'}</p>}
        </div>

        {/* Dates & Odometer */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{locale === 'ar' ? 'تفاصيل الإيجار' : 'Rental Details'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker label={tr.rentalStart} value={rentalStart} onChange={setRentalStart} placeholder={tr.rentalStart} isRTL={isRTL} outputCalendar="gregorian" />
            <DatePicker label={tr.rentalEnd} value={rentalEnd} onChange={setRentalEnd} placeholder={tr.rentalEnd} isRTL={isRTL} outputCalendar="gregorian" />
            {[
              { label: tr.odometerOut, name: 'odometerOut', type: 'number', placeholder: 'km' },
              { label: tr.dailyRate, name: 'dailyRateSar', type: 'number', placeholder: 'SAR' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} name={f.name} placeholder={f.placeholder} min={f.type === 'number' ? '0' : undefined} step={f.type === 'number' ? 'any' : undefined} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            {/* Contract file upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{tr.contractFile}</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadContractFile(f); }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {uploading
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  : contractFileUrl
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : <Upload className="w-4 h-4" />}
                <span>{uploading ? (locale === 'ar' ? 'جارٍ الرفع…' : 'Uploading…') : contractFileUrl ? (locale === 'ar' ? 'تغيير الملف' : 'Change file') : (locale === 'ar' ? 'اختر ملفاً' : 'Choose file')}</span>
              </button>
              {uploadedFileName && !uploading && (
                <p className="mt-1 text-xs text-gray-500 truncate max-w-xs">{uploadedFileName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">{tr.notes}</label>
          <textarea name="notes" rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {/* Vehicle State at Handover */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {isRTL ? 'حالة المركبة عند التسليم' : 'Vehicle State at Handover'}
          </p>
          {/* Fuel */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {isRTL ? `مستوى الوقود — ${fuelLevel}%` : `Fuel Level — ${fuelLevel}%`}
            </label>
            <input type="range" min={0} max={100} step={5} value={fuelLevel} onChange={(e) => setFuelLevel(Number(e.target.value))}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>{isRTL ? 'فارغ' : 'Empty'}</span><span>{isRTL ? 'نصف' : 'Half'}</span><span>{isRTL ? 'ممتلئ' : 'Full'}</span>
            </div>
          </div>
          {/* Condition */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">{isRTL ? 'حالة المركبة' : 'Vehicle Condition'}</label>
            <div className="flex gap-2">
              {(['GOOD', 'FAIR', 'POOR'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setConditionRating(r)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    conditionRating === r
                      ? r === 'GOOD' ? 'bg-green-600 border-green-600 text-white' : r === 'FAIR' ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-red-500 border-red-500 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {isRTL ? (r === 'GOOD' ? 'جيدة' : r === 'FAIR' ? 'مقبولة' : 'سيئة') : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Condition Photos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{isRTL ? 'صور حالة المركبة' : 'Condition Photos'}</p>
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {uploadingPhoto ? <span className="h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {isRTL ? 'إضافة صورة' : 'Add Photo'}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files?.length) uploadPhotos(e.target.files); e.target.value = ''; }} />
          </div>
          {conditionPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {conditionPhotos.map((url, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`photo-${i}`} className="w-20 h-16 object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => setConditionPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -end-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Handover Checklist */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{isRTL ? 'قائمة فحص التسليم' : 'Handover Checklist'}</p>
            <span className="text-xs text-gray-400">{checklistItems.length}/{CHECKLIST_ITEMS.length}</span>
          </div>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setChecklistItems(CHECKLIST_ITEMS.map(i => i.id))}
              className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
              {isRTL ? 'تحديد الكل' : 'All'}
            </button>
            <button type="button" onClick={() => setChecklistItems([])}
              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
              {isRTL ? 'إلغاء الكل' : 'None'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = checklistItems.includes(item.id);
              return (
                <button key={item.id} type="button"
                  onClick={() => setChecklistItems((prev) => checked ? prev.filter((x) => x !== item.id) : [...prev, item.id])}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors text-start ${
                    checked ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${
                    checked ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'
                  }`}>
                    {checked && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  {isRTL ? item.ar : item.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Client Signature */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{isRTL ? 'توقيع العميل' : "Client's Signature"}</p>
          {signatureSaved ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              <span>✓</span><span>{isRTL ? 'تم حفظ التوقيع' : 'Signature saved'}</span>
              <button type="button" onClick={() => { setSignatureSaved(false); setSignatureUrl(''); }} className="ms-auto text-xs text-green-600 underline">
                {isRTL ? 'إعادة' : 'Redo'}
              </button>
            </div>
          ) : (
            <SignatureCanvas isRTL={isRTL} onSave={(url) => { setSignatureUrl(url); setSignatureSaved(true); }} />
          )}
        </div>

        {/* Manager Signature */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{isRTL ? 'توقيع المدير' : "Manager's Signature"}</p>
          {managerSignatureSaved ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              <span>✓</span><span>{isRTL ? 'تم حفظ توقيع المدير' : 'Manager signature saved'}</span>
              <button type="button" onClick={() => { setManagerSignatureSaved(false); setManagerSignatureUrl(''); }} className="ms-auto text-xs text-green-600 underline">
                {isRTL ? 'إعادة' : 'Redo'}
              </button>
            </div>
          ) : (
            <SignatureCanvas isRTL={isRTL} onSave={(url) => { setManagerSignatureUrl(url); setManagerSignatureSaved(true); }} />
          )}
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">{(createMutation.error as any)?.response?.data?.message ?? (locale === 'ar' ? 'حدث خطأ' : 'An error occurred')}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={createMutation.isPending || !selectedVehicleId || !rentalStart || !rentalEnd}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الإيجار' : 'Save Rental')}
          </button>
          <Link href={`/${locale}/dashboard/rentals`} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {t.common.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}