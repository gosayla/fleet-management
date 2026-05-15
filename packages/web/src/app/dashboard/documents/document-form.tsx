'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { DocumentType } from '@fleet/shared';
import { useLocale } from '@/providers/locale-provider';
import { formatEnumLabel } from '@/lib/i18n';
import { resolveDocumentFileUrl } from '@/lib/api';
import { DatePicker } from '@/components/ui/date-picker';

export type DocumentFormValues = {
  type: DocumentType;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  vehicleIds: string[];
  driverIds: string[];
  issuingAuthority: string;
  referenceNumber: string;
  notes: string;
};

export type VehicleOption = {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
};

export type DriverOption = {
  id: string;
  fullName: string;
};

type DocumentFormProps = {
  initialValues: DocumentFormValues;
  vehicles: VehicleOption[];
  drivers: DriverOption[];
  isEdit?: boolean;
  isSubmitting?: boolean;
  submitLabel: string;
  currentFileUrl?: string;
  onSubmit: (values: DocumentFormValues, file: File | null) => void;
  onCancel: () => void;
};

const docTypes = Object.values(DocumentType);

const vehicleOnlyDocumentTypes = new Set<DocumentType>([
  DocumentType.VEHICLE_REGISTRATION,
  DocumentType.VEHICLE_INSURANCE,
  DocumentType.PERIODIC_INSPECTION,
  DocumentType.TRANSPORT_PERMIT,
  DocumentType.OWNERSHIP_DEED,
  DocumentType.OPERATION_CARD,
]);

const driverTypeOptions = [
  DocumentType.DRIVER_LICENSE,
  'DRIVER_CARD' as DocumentType,
] as const;

const driverOnlyDocumentTypes = new Set<DocumentType>(driverTypeOptions);

const vehicleDocumentTypeOptions = docTypes.filter((type) => vehicleOnlyDocumentTypes.has(type));
const driverDocumentTypeOptions = Array.from(new Set<DocumentType>(driverTypeOptions));

type DocumentTargetTab = 'vehicle' | 'driver';

function vehicleLabel(v: VehicleOption) {
  return `${v.plateNumber} - ${v.year} ${v.make} ${v.model}`;
}

/** Multi-select combobox */
function MultiSelect({
  label,
  placeholder,
  selectedIds,
  options,
  onChange,
  isRTL,
  disabled,
}: {
  label: string;
  placeholder: string;
  selectedIds: string[];
  options: { id: string; label: string }[];
  onChange: (ids: string[]) => void;
  isRTL: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const selectedOptions = options.filter((o) => selectedIds.includes(o.id));

  return (
    <div>
      <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{label}</label>
      {selectedOptions.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {selectedOptions.map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {o.label}
              <button type="button" onClick={() => toggle(o.id)} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative" ref={ref}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
        />
        {open && !disabled && (
          <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-gray-400">{isRTL ? 'لا توجد نتائج' : 'No results'}</li>
            )}
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-blue-50 ${isRTL ? 'text-right' : 'text-left'} ${selectedIds.includes(o.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
                  onClick={() => { toggle(o.id); setQuery(''); }}
                >
                  <span className={`h-4 w-4 flex-shrink-0 rounded border ${selectedIds.includes(o.id) ? 'border-blue-600 bg-blue-600' : 'border-gray-300'} flex items-center justify-center`}>
                    {selectedIds.includes(o.id) && <span className="text-white text-xs">✓</span>}
                  </span>
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function DocumentForm({
  initialValues,
  vehicles,
  drivers,
  isEdit = false,
  isSubmitting,
  submitLabel,
  currentFileUrl,
  onSubmit,
  onCancel,
}: DocumentFormProps) {
  const { locale, isRTL, t } = useLocale();
  const td = t.documents;

  const [form, setForm] = useState<DocumentFormValues>(initialValues);
  const [issueDate, setIssueDate] = useState<string | undefined>(initialValues.issueDate || undefined);
  const [expiryDate, setExpiryDate] = useState<string | undefined>(initialValues.expiryDate || undefined);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialTab: DocumentTargetTab = driverOnlyDocumentTypes.has(initialValues.type) ? 'driver' : 'vehicle';
  const [activeTab, setActiveTab] = useState<DocumentTargetTab>(initialTab);

  const isVehicleOnlyType = vehicleOnlyDocumentTypes.has(form.type);
  const isDriverOnlyType = driverOnlyDocumentTypes.has(form.type);
  const visibleTypeOptions = activeTab === 'vehicle' ? vehicleDocumentTypeOptions : driverDocumentTypeOptions;

  useEffect(() => {
    setForm((prev) => {
      if (vehicleOnlyDocumentTypes.has(prev.type) && prev.driverIds.length > 0) {
        return { ...prev, driverIds: [] };
      }
      if (driverOnlyDocumentTypes.has(prev.type) && prev.vehicleIds.length > 0) {
        return { ...prev, vehicleIds: [] };
      }
      return prev;
    });
  }, [form.type]);

  const switchTab = (tab: DocumentTargetTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setForm((prev) => {
      if (tab === 'vehicle') {
        const nextType = vehicleOnlyDocumentTypes.has(prev.type)
          ? prev.type
          : vehicleDocumentTypeOptions[0] ?? DocumentType.VEHICLE_REGISTRATION;
        return { ...prev, type: nextType, driverIds: [] };
      }

      const nextType = driverOnlyDocumentTypes.has(prev.type)
        ? prev.type
        : driverDocumentTypeOptions[0] ?? DocumentType.DRIVER_LICENSE;
      return { ...prev, type: nextType, vehicleIds: [] };
    });
  };

  const vehicleOptions = useMemo(() => vehicles.map((v) => ({ id: v.id, label: vehicleLabel(v) })), [vehicles]);
  const driverOptions = useMemo(() => drivers.map((d) => ({ id: d.id, label: d.fullName })), [drivers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!selectedFile && !form.fileUrl) {
      setUploadError(isRTL ? 'يرجى اختيار ملف' : 'Please select a file');
      return;
    }
    onSubmit({ ...form, issueDate: issueDate ?? '', expiryDate: expiryDate ?? '' }, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isEdit && (
        <div className={`flex gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
          <button
            type="button"
            onClick={() => switchTab('vehicle')}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'vehicle'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isRTL ? 'وثائق المركبات' : 'Vehicle Documents'}
          </button>
          <button
            type="button"
            onClick={() => switchTab('driver')}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'driver'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isRTL ? 'وثائق السائقين' : 'Driver Documents'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Type */}
        <div>
          <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{td.type}</label>
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as DocumentType }))}
            className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {visibleTypeOptions.map((item) => (
              <option key={item} value={item}>{formatEnumLabel('documentType', item, locale)}</option>
            ))}
          </select>
        </div>

        {/* File upload */}
        <div>
          <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{td.fileUrl}</label>
          {currentFileUrl && !selectedFile && (
            <div className="mb-1 flex items-center gap-2">
              <a href={resolveDocumentFileUrl(currentFileUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <ExternalLink className="h-3 w-3" />
                {td.uploadCurrentFile}
              </a>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{td.uploadChange}</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            required={!currentFileUrl}
          />
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        </div>

        {/* Reference Number */}
        <div>
          <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{td.referenceNumber}</label>
          <input
            value={form.referenceNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, referenceNumber: e.target.value }))}
            className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>

        {/* Issuing Authority */}
        <div>
          <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{td.issuingAuthority}</label>
          <input
            value={form.issuingAuthority}
            onChange={(e) => setForm((prev) => ({ ...prev, issuingAuthority: e.target.value }))}
            className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>

        {/* Issue Date */}
        <DatePicker label={td.issueDate} value={issueDate} onChange={setIssueDate} placeholder={td.issueDate} isRTL={isRTL} outputCalendar="gregorian" />

        {/* Expiry Date */}
        <DatePicker label={td.expiryDate} value={expiryDate} onChange={setExpiryDate} placeholder={td.expiryDate} isRTL={isRTL} outputCalendar="gregorian" />
      </div>

      {activeTab === 'vehicle' ? (
        <MultiSelect
          label={isRTL ? 'المركبات المرتبطة' : 'Linked Vehicles'}
          placeholder={isRTL ? 'ابحث عن مركبة...' : 'Search vehicles...'}
          selectedIds={form.vehicleIds}
          options={vehicleOptions}
          onChange={(ids) => setForm((prev) => ({ ...prev, vehicleIds: ids }))}
          isRTL={isRTL}
          disabled={isDriverOnlyType}
        />
      ) : (
        <MultiSelect
          label={isRTL ? 'السائقون المرتبطون' : 'Linked Drivers'}
          placeholder={isRTL ? 'ابحث عن سائق...' : 'Search drivers...'}
          selectedIds={form.driverIds}
          options={driverOptions}
          onChange={(ids) => setForm((prev) => ({ ...prev, driverIds: ids }))}
          isRTL={isRTL}
          disabled={isVehicleOnlyType}
        />
      )}

      {/* Notes */}
      <div>
        <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
        <textarea
          value={form.notes}
          rows={2}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
        />
      </div>

      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
        <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {isSubmitting ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {td.cancel}
        </button>
      </div>
    </form>
  );
}
