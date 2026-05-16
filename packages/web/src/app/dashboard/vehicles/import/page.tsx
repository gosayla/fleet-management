'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { Upload, CheckCircle, ArrowLeft, ArrowRight, FileSpreadsheet, Truck } from 'lucide-react';
import Link from 'next/link';

interface TammVehicleRow {
  plateNumber: string;
  plateType: string | null;
  make: string;
  model: string;
  year: number;
  sequenceNumber: string | null;
  vin: string;
  color: string;
  ownershipDate: string | null;
  licenseExpiryDate: string | null;
  licenseIssuanceDate: string | null;
  inspectionExpiryDate: string | null;
  mvpiStatus: string | null;
  insuranceStatus: string | null;
  insuranceExpiryDate: string | null;
  operationCardNumber: string | null;
  operationCardIssueDate: string | null;
  operationCardExpiryDate: string | null;
  operationCardRenewDate: string | null;
  restrictionStatus: string | null;
  bodyType: string | null;
}

interface PreviewResult {
  rows: TammVehicleRow[];
}

interface ImportResult {
  created: number;
  updated: number;
  total: number;
}

export default function VehiclesImportPage() {
  const { t, isRTL, locale } = useLocale();
  const tv = t.vehicles;
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TammVehicleRow[] | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Preview mutation ────────────────────────────────────────────────────────
  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append('file', f);
      const res = await api.post<PreviewResult>('/vehicles/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => setPreview(data.rows),
  });

  // ── Import mutation ─────────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append('file', f);
      const res = await api.post<ImportResult>('/vehicles/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => setImportResult(data),
  });

  const handleFile = useCallback((f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) return;
    setFile(f);
    setPreview(null);
    setImportResult(null);
    previewMutation.mutate(f);
  }, [previewMutation]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const mvpiColor = (s: string | null) => {
    if (!s) return 'text-gray-400';
    if (s.toLowerCase() === 'valid') return 'text-green-600 font-medium';
    if (s.toLowerCase() === 'expired') return 'text-red-600 font-medium';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/vehicles"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowBack className="w-4 h-4" />
          {tv.backToList}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Truck className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tv.importTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tv.importDesc}</p>
        </div>
      </div>

      {/* Success state */}
      {importResult ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold text-green-800">{tv.importSuccess}</h2>
          <div className="flex justify-center gap-8 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
              <div className="text-gray-600">{tv.created}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
              <div className="text-gray-600">{tv.updated}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{importResult.total}</div>
              <div className="text-gray-600">{tv.total}</div>
            </div>
          </div>
          <Link
            href="/dashboard/vehicles"
            className="inline-block mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {tv.backToList}
          </Link>
        </div>
      ) : (
        <>
          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">{tv.dropzone}</p>
            <p className="text-xs text-gray-400 mt-1">{tv.dropzoneHint}</p>
            {file && (
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
                <FileSpreadsheet className="w-3 h-3" />
                {file.name}
              </div>
            )}
          </div>

          {/* Loading indicator */}
          {previewMutation.isPending && (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Error */}
          {(previewMutation.isError || importMutation.isError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              {(previewMutation.error as Error)?.message || (importMutation.error as Error)?.message}
            </div>
          )}

          {/* Preview table */}
          {preview && preview.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{tv.preview}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{tv.previewDesc} ({preview.length} {tv.total})</p>
                </div>
                <button
                  onClick={() => file && importMutation.mutate(file)}
                  disabled={importMutation.isPending}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {importMutation.isPending ? tv.importing : tv.importBtn}
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-start">#</th>
                      <th className="px-4 py-3 text-start">{tv.colPlate}</th>
                      <th className="px-4 py-3 text-start">{tv.colMake}</th>
                      <th className="px-4 py-3 text-start">{tv.colModel}</th>
                      <th className="px-4 py-3 text-start">{tv.colYear}</th>
                      <th className="px-4 py-3 text-start">{tv.colVin}</th>
                      <th className="px-4 py-3 text-start">{tv.colColor}</th>
                      <th className="px-4 py-3 text-start">{tv.colLicenseExpiry}</th>
                      <th className="px-4 py-3 text-start">{tv.colOperationCardNumber}</th>
                      <th className="px-4 py-3 text-start">{tv.colOperationCardExpiry}</th>
                      <th className="px-4 py-3 text-start">{tv.colMvpi}</th>
                      <th className="px-4 py-3 text-start">{tv.colInsurance}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-medium text-gray-900">{row.plateNumber}</td>
                        <td className="px-4 py-3 text-gray-700">{row.make}</td>
                        <td className="px-4 py-3 text-gray-700">{row.model}</td>
                        <td className="px-4 py-3 text-gray-700">{row.year || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.vin}</td>
                        <td className="px-4 py-3 text-gray-700">{row.color || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{row.licenseExpiryDate || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{row.operationCardNumber || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{row.operationCardExpiryDate || '—'}</td>
                        <td className={`px-4 py-3 text-xs ${mvpiColor(row.mvpiStatus)}`}>{row.mvpiStatus || '—'}</td>
                        <td className={`px-4 py-3 text-xs ${mvpiColor(row.insuranceStatus)}`}>{row.insuranceStatus || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}