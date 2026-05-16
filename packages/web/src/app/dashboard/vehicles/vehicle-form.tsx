'use client';

import { VehicleStatus, VehicleType, VehicleUsageType } from '@fleet/shared';
import { formatEnumLabel } from '@/lib/i18n';
import { useLocale } from '@/providers/locale-provider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { ExternalLink } from 'lucide-react';
import { resolveDocumentFileUrl } from '@/lib/api';

export type VehicleFormValues = {
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  type: VehicleType;
  vin: string;
  odometer: number;
  fuelCapacity: number;
  plateType?: string;
  sequenceNumber?: string;
  bodyType?: string;
  ownershipDate?: string;
  licenseIssuanceDate?: string;
  inspectionExpiryDate?: string;
  restrictionStatus?: string;
  operationCardNumber?: string;
  operationCardIssueDate?: string;
  operationCardExpiryDate?: string;
  operationCardRenewDate?: string;
  operationCardFileUrl?: string;
  licenseExpiryDate?: string;
  insuranceExpiryDate?: string;
  status?: VehicleStatus;
  assignedDriverId?: string;
  usageType?: VehicleUsageType;
};

type DriverOption = {
  id: string;
  fullName: string;
};

type VehicleFormProps = {
  initialValues: VehicleFormValues;
  onSubmit: (values: VehicleFormValues, opCardFile: File | null) => void;
  isSubmitting?: boolean;
  submitLabel: string;
  showStatus?: boolean;
  showDriver?: boolean;
  drivers?: DriverOption[];
};

const vehicleTypeOptions = Object.values(VehicleType);
const vehicleStatusOptions = Object.values(VehicleStatus);

export function VehicleForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  showStatus,
  showDriver,
  drivers = [],
}: VehicleFormProps) {
  const { isRTL, locale, t } = useLocale();
  const tv = t.vehicles;
  const [licenseExpiryDate, setLicenseExpiryDate] = useState<string | undefined>(initialValues.licenseExpiryDate);
  const [ownershipDate, setOwnershipDate] = useState<string | undefined>(initialValues.ownershipDate);
  const [licenseIssuanceDate, setLicenseIssuanceDate] = useState<string | undefined>(initialValues.licenseIssuanceDate);
  const [inspectionExpiryDate, setInspectionExpiryDate] = useState<string | undefined>(initialValues.inspectionExpiryDate);

  // Assigned driver combobox state
  const [driverQuery, setDriverQuery] = useState('');
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [assignedDriverId, setAssignedDriverId] = useState<string | undefined>(initialValues.assignedDriverId);
  const driverComboRef = useRef<HTMLDivElement>(null);

  const filteredDriverOptions = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => d.fullName.toLowerCase().includes(q));
  }, [drivers, driverQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (driverComboRef.current && !driverComboRef.current.contains(e.target as Node)) {
        setDriverDropdownOpen(false);
      }
    }
    if (driverDropdownOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [driverDropdownOpen]);
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<string | undefined>(initialValues.insuranceExpiryDate);
  const [operationCardIssueDate, setOperationCardIssueDate] = useState<string | undefined>(initialValues.operationCardIssueDate);
  const [operationCardExpiryDate, setOperationCardExpiryDate] = useState<string | undefined>(initialValues.operationCardExpiryDate);
  const [operationCardRenewDate, setOperationCardRenewDate] = useState<string | undefined>(initialValues.operationCardRenewDate);
  const [opCardFile, setOpCardFile] = useState<File | null>(null);
  const opCardFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLicenseExpiryDate(initialValues.licenseExpiryDate);
    setOwnershipDate(initialValues.ownershipDate);
    setLicenseIssuanceDate(initialValues.licenseIssuanceDate);
    setInspectionExpiryDate(initialValues.inspectionExpiryDate);
    setInsuranceExpiryDate(initialValues.insuranceExpiryDate);
    setOperationCardIssueDate(initialValues.operationCardIssueDate);
    setOperationCardExpiryDate(initialValues.operationCardExpiryDate);
    setOperationCardRenewDate(initialValues.operationCardRenewDate);
  }, [
    initialValues.licenseExpiryDate,
    initialValues.ownershipDate,
    initialValues.licenseIssuanceDate,
    initialValues.inspectionExpiryDate,
    initialValues.insuranceExpiryDate,
    initialValues.operationCardIssueDate,
    initialValues.operationCardExpiryDate,
    initialValues.operationCardRenewDate,
  ]);

  useEffect(() => {
    // Sync driver selection when initialValues load (e.g. edit page async fetch)
    const newId = initialValues.assignedDriverId;
    setAssignedDriverId(newId);
    const matched = drivers.find((d) => d.id === newId);
    setDriverQuery(matched?.fullName ?? '');
  }, [
    initialValues.assignedDriverId,
    drivers,
  ]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        onSubmit({
          plateNumber: String(fd.get('plateNumber') ?? '').trim(),
          make: String(fd.get('make') ?? '').trim(),
          model: String(fd.get('model') ?? '').trim(),
          year: Number(fd.get('year') ?? 0),
          color: String(fd.get('color') ?? '').trim(),
          type: String(fd.get('type') ?? VehicleType.SEDAN) as VehicleType,
          vin: String(fd.get('vin') ?? '').trim(),
          odometer: Number(fd.get('odometer') ?? 0),
          fuelCapacity: Number(fd.get('fuelCapacity') ?? 0),
          plateType: String(fd.get('plateType') ?? '').trim() || undefined,
          sequenceNumber: String(fd.get('sequenceNumber') ?? '').trim() || undefined,
          bodyType: String(fd.get('bodyType') ?? '').trim() || undefined,
          ownershipDate,
          licenseIssuanceDate,
          inspectionExpiryDate,
          restrictionStatus: String(fd.get('restrictionStatus') ?? '').trim() || undefined,
          operationCardNumber: String(fd.get('operationCardNumber') ?? '').trim() || undefined,
          operationCardIssueDate,
          operationCardExpiryDate,
          operationCardRenewDate,
          operationCardFileUrl: initialValues.operationCardFileUrl,
          licenseExpiryDate,
          insuranceExpiryDate,
          status: showStatus ? (String(fd.get('status') ?? VehicleStatus.ACTIVE) as VehicleStatus) : undefined,
          assignedDriverId: showDriver ? assignedDriverId : undefined,
          usageType: String(fd.get('usageType') ?? VehicleUsageType.FLEET) as VehicleUsageType,
        }, opCardFile);
      }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={tv.plate} name="plateNumber" defaultValue={initialValues.plateNumber} required />
          <Field label={tv.vin} name="vin" defaultValue={initialValues.vin} required />
          <Field label={tv.make} name="make" defaultValue={initialValues.make} required />
          <Field label={tv.model} name="model" defaultValue={initialValues.model} required />
          <Field label={tv.year} name="year" type="number" min={1990} max={2100} defaultValue={String(initialValues.year)} required />
          <Field label={tv.color} name="color" defaultValue={initialValues.color} required />
          <Field label={tv.sequenceNumber} name="sequenceNumber" defaultValue={initialValues.sequenceNumber ?? ''} />
          <Field label={tv.plateType} name="plateType" defaultValue={initialValues.plateType ?? ''} />
          <Field label={tv.bodyType} name="bodyType" defaultValue={initialValues.bodyType ?? ''} />
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.type}</label>
            <select
              name="type"
              defaultValue={initialValues.type}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {vehicleTypeOptions.map((type) => (
                <option key={type} value={type}>{formatEnumLabel('vehicleType', type, locale)}</option>
              ))}
            </select>
          </div>
          <Field label={tv.odometer} name="odometer" type="number" min={0} step="0.1" defaultValue={String(initialValues.odometer)} required />
          <Field label={tv.fuelCapacity} name="fuelCapacity" type="number" min={1} step="0.1" defaultValue={String(initialValues.fuelCapacity)} required />
          <Field label={tv.restrictionStatus} name="restrictionStatus" defaultValue={initialValues.restrictionStatus ?? ''} />

          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL ? 'نوع الاستخدام' : 'Usage Type'}
            </label>
            <select
              name="usageType"
              defaultValue={initialValues.usageType ?? VehicleUsageType.FLEET}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <option value={VehicleUsageType.FLEET}>{isRTL ? 'أسطول (رحلات)' : 'Fleet (Trips)'}</option>
              <option value={VehicleUsageType.STAFF}>{isRTL ? 'موظف (مخصصة لموظف)' : 'Staff (Assigned to employee)'}</option>
            </select>
          </div>

          <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
            <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.operationCardSection}</h3>
          </div>

          <Field
            label={tv.operationCardNumber}
            name="operationCardNumber"
            defaultValue={initialValues.operationCardNumber ?? ''}
          />

          {/* Operation Card File Upload */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL ? 'ملف بطاقة التشغيل' : 'Operation Card File'}
            </label>
            {initialValues.operationCardFileUrl && !opCardFile && (
              <div className="mb-1 flex items-center gap-2">
                <a
                  href={resolveDocumentFileUrl(initialValues.operationCardFileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {isRTL ? 'الملف الحالي' : 'Current file'}
                </a>
              </div>
            )}
            <input
              ref={opCardFileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setOpCardFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <DatePicker
            label={tv.operationCardIssueDate}
            value={operationCardIssueDate}
            onChange={setOperationCardIssueDate}
            placeholder={tv.operationCardIssueDate}
            isRTL={isRTL}
            outputCalendar="gregorian"
          />
          <DatePicker
            label={tv.operationCardExpiryDate}
            value={operationCardExpiryDate}
            onChange={setOperationCardExpiryDate}
            placeholder={tv.operationCardExpiryDate}
            isRTL={isRTL}
            outputCalendar="gregorian"
          />
          <DatePicker
            label={tv.operationCardRenewDate}
            value={operationCardRenewDate}
            onChange={setOperationCardRenewDate}
            placeholder={tv.operationCardRenewDate}
            isRTL={isRTL}
            outputCalendar="gregorian"
          />

          <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
            <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>Tamm</h3>
          </div>
          <DatePicker
            label={tv.ownershipDate}
            value={ownershipDate}
            onChange={setOwnershipDate}
            placeholder={tv.ownershipDate}
            isRTL={isRTL}
            outputCalendar="hijri"
          />
          <DatePicker
            label={tv.licenseIssuanceDate}
            value={licenseIssuanceDate}
            onChange={setLicenseIssuanceDate}
            placeholder={tv.licenseIssuanceDate}
            isRTL={isRTL}
            outputCalendar="hijri"
          />
          <DatePicker
            label={tv.inspectionExpiryDate}
            value={inspectionExpiryDate}
            onChange={setInspectionExpiryDate}
            placeholder={tv.inspectionExpiryDate}
            isRTL={isRTL}
            outputCalendar="gregorian"
          />
          <DatePicker
            label={tv.licenseExpiryDate}
            value={licenseExpiryDate}
            onChange={setLicenseExpiryDate}
            placeholder={tv.licenseExpiryDate}
            isRTL={isRTL}
            outputCalendar="hijri"
          />
          <DatePicker
            label={tv.insuranceExpiryDate}
            value={insuranceExpiryDate}
            onChange={setInsuranceExpiryDate}
            placeholder={tv.insuranceExpiryDate}
            isRTL={isRTL}
            outputCalendar="gregorian"
          />

          {showStatus && (
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.status}</label>
              <select
                name="status"
                defaultValue={initialValues.status ?? VehicleStatus.ACTIVE}
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                {vehicleStatusOptions.map((status) => (
                  <option key={status} value={status}>{formatEnumLabel('vehicleStatus', status, locale)}</option>
                ))}
              </select>
            </div>
          )}

          {showDriver && (
            <div className="relative" ref={driverComboRef}>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{tv.assignedDriver}</label>
              <div className="relative">
                <input
                  type="text"
                  value={driverQuery}
                  placeholder={tv.unassigned}
                  autoComplete="off"
                  className={`w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  onChange={(e) => {
                    setDriverQuery(e.target.value);
                    setAssignedDriverId(undefined);
                    setDriverDropdownOpen(true);
                  }}
                  onFocus={() => setDriverDropdownOpen(true)}
                />
                {assignedDriverId && (
                  <button
                    type="button"
                    onClick={() => { setAssignedDriverId(undefined); setDriverQuery(''); setDriverDropdownOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    ×
                  </button>
                )}
              </div>
              {driverDropdownOpen && filteredDriverOptions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                  <li>
                    <button
                      type="button"
                      className={`w-full px-3 py-2 ${isRTL ? 'text-right' : 'text-left'} text-gray-400 hover:bg-gray-50`}
                      onClick={() => { setAssignedDriverId(undefined); setDriverQuery(''); setDriverDropdownOpen(false); }}
                    >
                      {tv.unassigned}
                    </button>
                  </li>
                  {filteredDriverOptions.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 ${isRTL ? 'text-right' : 'text-left'} hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                          assignedDriverId === d.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'
                        }`}
                        onClick={() => { setAssignedDriverId(d.id); setDriverQuery(d.fullName); setDriverDropdownOpen(false); }}
                      >
                        <span className="font-semibold">{d.fullName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {driverDropdownOpen && driverQuery.trim() && filteredDriverOptions.length === 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                  No drivers found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? tv.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  const { isRTL } = useLocale();

  return (
    <div>
      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
      />
    </div>
  );
}
