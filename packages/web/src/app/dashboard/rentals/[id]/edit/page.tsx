'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, resolveDocumentFileUrl } from '@/lib/api';
import Link from 'next/link';
import { useLocale } from '@/providers/locale-provider';
import { ArrowLeft, ArrowRight, Key, Upload, CheckCircle, Camera, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

interface Vehicle { id: string; plateNumber: string; make: string; model: string; sequenceNumber?: string | null }
interface RentalDetail {
  id: string; clientName: string; clientPhone?: string; clientNationalId?: string; contractNumber?: string;
  rentalStart: string; rentalEnd: string; odometerOut?: number; odometerIn?: number; dailyRateSar?: number;
  contractFileUrl?: string; status: string; notes?: string;
  fuelLevel?: number | null; conditionRating?: string | null; conditionPhotos?: string[];
  signatureUrl?: string | null; managerSignatureUrl?: string | null; checklistItems?: string[];
  vehicle: { id: string; plateNumber: string; make: string; model: string };
}

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
    const canvas = canvasRef.current; if (!canvas) return; e.preventDefault();
    drawing.current = true;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(x, y);
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return; e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#1d4ed8';
    ctx.lineTo(x, y); ctx.stroke(); setIsEmpty(false);
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
        <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-gray-600">{isRTL ? 'مسح' : 'Clear'}</button>
      </div>
      <canvas ref={canvasRef} width={400} height={120} className="w-full border border-gray-200 rounded-lg bg-white touch-none cursor-crosshair"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{isRTL ? 'ارسم توقيعك أعلاه ثم اضغط حفظ' : 'Draw signature above then press Save'}</p>
        <button type="button" onClick={save} disabled={isEmpty || saving} className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700">
          {saving ? '...' : isRTL ? 'حفظ التوقيع' : 'Save Signature'}
        </button>
      </div>
    </div>
  );
}

export default function RentalEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, isRTL, t } = useLocale();
  const tr = t.rentals;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const { data: rental, isLoading } = useQuery<RentalDetail>({
    queryKey: ['rentals', id],
    queryFn: () => api.get(`/rentals/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const [vehicleQuery, setVehicleQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [rentalStart, setRentalStart] = useState<string | undefined>(undefined);
  const [rentalEnd, setRentalEnd] = useState<string | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);
  const [contractFileUrl, setContractFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vehicleComboRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [fuelLevel, setFuelLevel] = useState(75);
  const [conditionRating, setConditionRating] = useState<'GOOD' | 'FAIR' | 'POOR'>('GOOD');
  const [conditionPhotos, setConditionPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [managerSignatureUrl, setManagerSignatureUrl] = useState('');
  const [managerSignatureSaved, setManagerSignatureSaved] = useState(false);

  useEffect(() => {
    if (rental && !initialized) {
      setSelectedVehicleId(rental.vehicle.id);
      setVehicleQuery(`${rental.vehicle.plateNumber} — ${rental.vehicle.make} ${rental.vehicle.model}`);
      setRentalStart(rental.rentalStart.split('T')[0]);
      setRentalEnd(rental.rentalEnd.split('T')[0]);
      if (rental.contractFileUrl) {
        setContractFileUrl(rental.contractFileUrl);
        setUploadedFileName(rental.contractFileUrl.split('/').pop() ?? '');
      }
      if (rental.fuelLevel != null) setFuelLevel(rental.fuelLevel);
      if (rental.conditionRating) setConditionRating(rental.conditionRating as 'GOOD' | 'FAIR' | 'POOR');
      if (rental.conditionPhotos?.length) setConditionPhotos(rental.conditionPhotos);
      if (rental.checklistItems?.length) setChecklistItems(rental.checklistItems);
      if (rental.signatureUrl) { setSignatureUrl(rental.signatureUrl); setSignatureSaved(true); }
      if (rental.managerSignatureUrl) { setManagerSignatureUrl(rental.managerSignatureUrl); setManagerSignatureSaved(true); }
      setInitialized(true);
    }
  }, [rental, initialized]);

  const { data: vehiclesRes } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });
  const vehicles = vehiclesRes ?? [];

  const filteredVehicles = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    if (!q || selectedVehicleId) return vehicles;
    return vehicles.filter(v => v.plateNumber.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q));
  }, [vehicles, vehicleQuery, selectedVehicleId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (vehicleComboRef.current && !vehicleComboRef.current.contains(e.target as Node)) setVehicleDropdownOpen(false); };
    if (vehicleDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [vehicleDropdownOpen]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch(`/rentals/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals', id] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      router.push(`/${locale}/dashboard/rentals/${id}`);
    },
  });

  const uploadPhotos = useCallback(async (files: FileList) => {
    setUploadingPhoto(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData(); fd.append('file', file);
        const { data } = await api.post('/documents/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        urls.push(data.fileUrl);
      }
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
    updateMutation.mutate({
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

  if (isLoading || !rental) return <div className="p-8 text-center text-gray-400">{t.common.loading}</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <Link href={`/${locale}/dashboard/rentals/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowBack className="w-4 h-4" />
        {rental.clientName}
      </Link>

      <div className="flex items-center gap-3">
        <Key className="w-6 h-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900">{t.common.edit} — {rental.clientName}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{locale === 'ar' ? 'بيانات العميل' : 'Client Information'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: tr.clientName, name: 'clientName', defaultValue: rental.clientName, required: true },
              { label: tr.clientPhone, name: 'clientPhone', defaultValue: rental.clientPhone ?? '' },
              { label: tr.clientNationalId, name: 'clientNationalId', defaultValue: rental.clientNationalId ?? '' },
              { label: tr.contractNumber, name: 'contractNumber', defaultValue: rental.contractNumber ?? '' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="text" name={f.name} defaultValue={f.defaultValue} required={f.required} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{tr.vehicle}</p>
          <div className="relative" ref={vehicleComboRef}>
            <input type="text" value={vehicleQuery} autoComplete="off"
              onChange={e => { setVehicleQuery(e.target.value); setSelectedVehicleId(undefined); setVehicleDropdownOpen(true); }}
              onFocus={() => { setSelectedVehicleId(undefined); setVehicleDropdownOpen(true); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{locale === 'ar' ? 'تفاصيل الإيجار' : 'Rental Details'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker label={tr.rentalStart} value={rentalStart} onChange={setRentalStart} placeholder={tr.rentalStart} isRTL={isRTL} outputCalendar="gregorian" />
            <DatePicker label={tr.rentalEnd} value={rentalEnd} onChange={setRentalEnd} placeholder={tr.rentalEnd} isRTL={isRTL} outputCalendar="gregorian" />
            {[
              { label: tr.odometerOut, name: 'odometerOut', defaultValue: rental.odometerOut?.toString() ?? '', type: 'number' },
              { label: tr.dailyRate, name: 'dailyRateSar', defaultValue: rental.dailyRateSar?.toString() ?? '', type: 'number' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} name={f.name} defaultValue={f.defaultValue} min={f.type === 'number' ? '0' : undefined} step={f.type === 'number' ? 'any' : undefined} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">{tr.notes}</label>
          <textarea name="notes" rows={3} defaultValue={rental.notes ?? ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {/* Vehicle State at Handover */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{isRTL ? 'حالة المركبة عند التسليم' : 'Vehicle State at Handover'}</p>
          {/* Fuel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{isRTL ? `مستوى الوقود — ${fuelLevel}%` : `Fuel Level — ${fuelLevel}%`}</label>
            <input type="range" min={0} max={100} step={5} value={fuelLevel} onChange={(e) => setFuelLevel(Number(e.target.value))}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
          </div>
          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{isRTL ? 'حالة المركبة' : 'Vehicle Condition'}</label>
            <div className="flex gap-2">
              {(['GOOD', 'FAIR', 'POOR'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setConditionRating(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    conditionRating === r
                      ? r === 'GOOD' ? 'bg-green-600 text-white border-green-600' : r === 'FAIR' ? 'bg-amber-500 text-white border-amber-500' : 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {r === 'GOOD' ? (isRTL ? 'جيدة' : 'Good') : r === 'FAIR' ? (isRTL ? 'مقبولة' : 'Fair') : (isRTL ? 'ضعيفة' : 'Poor')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Condition Photos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{isRTL ? 'صور حالة المركبة' : 'Condition Photos'}</p>
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50">
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
                  <img src={resolveDocumentFileUrl(url)} alt={`photo-${i}`} className="w-20 h-16 object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => setConditionPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-0.5 end-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Handover Checklist */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{isRTL ? 'قائمة فحص التسليم' : 'Handover Checklist'}</p>
            <span className="text-xs text-gray-400">{checklistItems.length}/{CHECKLIST_ITEMS.length}</span>
          </div>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setChecklistItems(CHECKLIST_ITEMS.map(i => i.id))}
              className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg">
              {isRTL ? 'تحديد الكل' : 'All'}
            </button>
            <button type="button" onClick={() => setChecklistItems([])}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
              {isRTL ? 'إلغاء التحديد' : 'None'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = checklistItems.includes(item.id);
              return (
                <button key={item.id} type="button"
                  onClick={() => setChecklistItems((prev) => checked ? prev.filter((x) => x !== item.id) : [...prev, item.id])}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-start transition-colors ${
                    checked ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    checked ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'
                  }`}>{checked && '✓'}</span>
                  {isRTL ? item.ar : item.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Client Signature */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{isRTL ? 'توقيع العميل' : "Client's Signature"}</p>
          {signatureSaved ? (
            <div className="flex items-center gap-2 text-green-700">
              <span>✓</span><span className="text-sm">{isRTL ? 'تم حفظ التوقيع' : 'Signature saved'}</span>
              <button type="button" onClick={() => { setSignatureSaved(false); setSignatureUrl(''); }} className="ms-auto text-xs text-blue-600 underline">{isRTL ? 'تغيير' : 'Change'}</button>
            </div>
          ) : (
            <SignatureCanvas isRTL={isRTL} onSave={(url) => { setSignatureUrl(url); setSignatureSaved(true); }} />
          )}
        </div>

        {/* Manager Signature */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{isRTL ? 'توقيع المدير' : "Manager's Signature"}</p>
          {managerSignatureSaved ? (
            <div className="flex items-center gap-2 text-green-700">
              <span>✓</span><span className="text-sm">{isRTL ? 'تم حفظ توقيع المدير' : 'Manager signature saved'}</span>
              <button type="button" onClick={() => { setManagerSignatureSaved(false); setManagerSignatureUrl(''); }} className="ms-auto text-xs text-blue-600 underline">{isRTL ? 'تغيير' : 'Change'}</button>
            </div>
          ) : (
            <SignatureCanvas isRTL={isRTL} onSave={(url) => { setManagerSignatureUrl(url); setManagerSignatureSaved(true); }} />
          )}
        </div>

        {updateMutation.isError && (
          <p className="text-sm text-red-600">{(updateMutation.error as any)?.response?.data?.message ?? (locale === 'ar' ? 'حدث خطأ' : 'An error occurred')}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={updateMutation.isPending || !selectedVehicleId}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {updateMutation.isPending ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
          </button>
          <Link href={`/${locale}/dashboard/rentals/${id}`} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {t.common.confirmNo}
          </Link>
        </div>
      </form>
    </div>
  );
}
