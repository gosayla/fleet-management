'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
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
  vehicleId: string;
  driverId: string;
  issuingAuthority: string;
  referenceNumber: string;
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
  isSubmitting?: boolean;
  submitLabel: string;
  /** When editing, show the current file link */
  currentFileUrl?: string;
  onSubmit: (values: DocumentFormValues, file: File | null) => void;
  onCancel: () => void;
};

const docTypes = Object.values(DocumentType);

function vehicleLabel(v: VehicleOption) {
  return `${v.plateNumber} - ${v.year} ${v.make} ${v.model}`;
}

/** Generic searchable combobox */
function SearchableSelect({
  label,
  placeholder,
  value,
  options,
  getLabel,
  onChange,
  isRTL,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: { id: string; label: string }[];
  getLabel: (id: string) => string;
  onChange: (id: string) => void;
  isRTL: boolean;
}) {
  const [query, setQuery] = useState(() => (value ? getLabel(value) : ''));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync when value changes externally (e.g. reset)
  useEffect(() => {
    setQuery(value ? getLabel(value) : '');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div>
      <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{label}</label>
      <div className="relative" ref={ref}>
        <div className="relative">
          <input
            type="text"
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            className={`w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange('');
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {value && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {open && (
          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
            <li>
              <button
                type="button"
                className={`w-full px-3 py-2 text-gray-400 hover:bg-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}
                onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
              >
                {placeholder}
              </button>
            </li>
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 transition-colors hover:bg-blue-50 hover:text-blue-700 ${isRTL ? 'text-right' : 'text-left'} ${value === o.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-800'}`}
                  onClick={() => { onChange(o.id); setQuery(o.label); setOpen(false); }}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && query.trim() && (
              <li className="px-3 py-2 text-gray-400">{isRTL ? 'لا توجد نتائج' : 'No results'}</li>
            )}
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

  const vehicleOptions = useMemo(() => vehicles.map((v) => ({ id: v.id, label: vehicleLabel(v) })), [vehicles]);
  const driverOptions = useMemo(() => drivers.map((d) => ({ id: d.id, label: d.fullName })), [drivers]);

  const getVehicleLabel = (id: string) => vehicleOptions.find((v) => v.id === id)?.label ?? '';
  const getDriverLabel = (id: string) => driverOptions.find((d) => d.id === id)?.label ?? '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!selectedFile && !form.fileUrl) {
      setUploadError(isRTL ? 'يرجى اختيار ملف' : 'Please select a file');
      return;
    }
    onSubmit(
      { ...form, issueDate: issueDate ?? '', expiryDate: expiryDate ?? '' },
      selectedFile,
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Type */}
        <div>
          <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{td.type}</label>
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as DocumentType }))}
            className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          >
            {docTypes.map((item) => (
              <option key={item} value={item}>
                {formatEnumLabel('documentType', item, locale)}
              </option>
            ))}
          </select>
        </div>

        {/* File upload */}
        <div>
          <label className={`mb-1 block text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{td.fileUrl}</label>
          {currentFileUrl && !selectedFile && (
            <div className="mb-1 flex items-center gap-2">
              <a
                href={resolveDocumentFileUrl(currentFileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
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
        <DatePicker
          label={td.issueDate}
          value={issueDate}
          onChange={setIssueDate}
          placeholder={td.issueDate}
          isRTL={isRTL}
          outputCalendar="gregorian"
        />

        {/* Expiry Date */}
        <DatePicker
          label={td.expiryDate}
          value={expiryDate}
          onChange={setExpiryDate}
          placeholder={td.expiryDate}
          isRTL={isRTL}
          outputCalendar="gregorian"
        />

        {/* Vehicle — searchable */}
        <SearchableSelect
          label={td.vehicle}
          placeholder={td.selectVehicle}
          value={form.vehicleId}
          options={vehicleOptions}
          getLabel={getVehicleLabel}
          onChange={(id) => setForm((prev) => ({ ...prev, vehicleId: id }))}
          isRTL={isRTL}
        />

        {/* Driver — searchable */}
        <SearchableSelect
          label={td.driver}
          placeholder={td.selectDriver}
          value={form.driverId}
          options={driverOptions}
          getLabel={getDriverLabel}
          onChange={(id) => setForm((prev) => ({ ...prev, driverId: id }))}
          isRTL={isRTL}
        />
      </div>

      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {td.cancel}
        </button>
      </div>
    </form>
  );
}
