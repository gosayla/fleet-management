'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { DocumentType } from '@fleet/shared';
import { useLocale } from '@/providers/locale-provider';
import { api, resolveDocumentFileUrl } from '@/lib/api';
import { formatDate, formatEnumLabel, formatNumber } from '@/lib/i18n';
import { Pagination } from '@/components/ui/pagination';

type DocumentStatus = 'expired' | 'expiring' | 'valid';

type DocumentRow = {
  id: string;
  type: DocumentType;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority?: string | null;
  referenceNumber?: string | null;
  hasReplacement?: boolean;
  vehicles?: { id: string; plateNumber: string; make: string; model: string; year: number }[];
  drivers?: { id: string; fullName: string }[];
};

type DocumentsResponse = {
  data: DocumentRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    expired: number;
    expiring: number;
    valid: number;
    total: number;
  };
};

function getDocumentStatus(expiryDate: string): DocumentStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
}

function StatusBadge({ status, label, renewed }: { status: DocumentStatus; label: string; renewed?: string }) {
  if (status === 'expired') {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertTriangle className="h-3 w-3" />
          {label}
        </span>
        {renewed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <RefreshCw className="h-3 w-3" />
            {renewed}
          </span>
        )}
      </div>
    );
  }

  if (status === 'expiring') {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <Clock3 className="h-3 w-3" />
          {label}
        </span>
        {renewed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <RefreshCw className="h-3 w-3" />
            {renewed}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle2 className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function DocumentsPage() {
  const { locale, isRTL, t } = useLocale();
  const td = t.documents;
  const tc = t.common;
  const queryClient = useQueryClient();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'expired' | 'expiring' | 'valid'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery<DocumentsResponse>({
    queryKey: ['documents', search, status, typeFilter, page, pageSize],
    queryFn: () =>
      api
        .get('/documents', {
          params: {
            page,
            limit: pageSize,
            search: search || undefined,
            status,
            type: typeFilter === 'all' ? undefined : typeFilter,
          },
        })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const summary = data?.summary ?? { expired: 0, expiring: 0, valid: 0, total: 0 };
  const docTypes = Object.values(DocumentType);

  const statusLabel = useMemo(
    () => ({
      expired: td.expired,
      expiring: td.expiring,
      valid: td.valid,
    }),
    [td.expired, td.expiring, td.valid],
  );

  const handleStatus = (next: 'all' | 'expired' | 'expiring' | 'valid') => {
    setStatus(next);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{td.title}</h1>
        </div>
        <button
          onClick={() => router.push(`/${locale}/dashboard/documents/new`)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {td.add}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{td.all}</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(summary.total, locale)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{td.expired}</p>
          <p className="text-xl font-bold text-red-700">{formatNumber(summary.expired, locale)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{td.expiring}</p>
          <p className="text-xl font-bold text-amber-700">{formatNumber(summary.expiring, locale)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{td.valid}</p>
          <p className="text-xl font-bold text-green-700">{formatNumber(summary.valid, locale)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            className={`w-full rounded-lg border border-gray-200 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'}`}
            placeholder={td.search}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as 'all' | DocumentType);
            setPage(1);
          }}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="all">{td.selectType}</option>
          {docTypes.map((item) => (
            <option key={item} value={item}>
              {formatEnumLabel('documentType', item, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleStatus('all')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${status === 'all' ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          {td.all}
        </button>
        <button
          onClick={() => handleStatus('expired')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${status === 'expired' ? 'bg-red-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          {td.expired}
        </button>
        <button
          onClick={() => handleStatus('expiring')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${status === 'expiring' ? 'bg-amber-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          {td.expiring}
        </button>
        <button
          onClick={() => handleStatus('valid')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${status === 'valid' ? 'bg-green-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          {td.valid}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">{tc.loading}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{td.noDocuments}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{td.type}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-48 max-w-[12rem] ${isRTL ? 'text-right' : 'text-left'}`}>{td.vehicle}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{td.driver}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{td.reference}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{td.authority}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{td.issueDate}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{td.expiryDate}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{td.status}</th>
                  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{tc.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => {
                  const docStatus = getDocumentStatus(row.expiryDate);
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">
                        {formatEnumLabel('documentType', row.type, locale)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 w-48 max-w-[12rem] break-words">
                        {row.vehicles && row.vehicles.length > 0
                          ? row.vehicles.map((v) => `${v.plateNumber} - ${v.year} ${v.make} ${v.model}`).join(', ')
                          : td.unknownVehicle}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.drivers && row.drivers.length > 0 ? row.drivers.map((d) => d.fullName).join(', ') : td.unknownDriver}</td>
                      <td className="px-4 py-3 text-gray-700">{row.referenceNumber || tc.empty}</td>
                      <td className="px-4 py-3 text-gray-700">{row.issuingAuthority || tc.empty}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(row.issueDate, locale)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(row.expiryDate, locale)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={docStatus}
                          label={statusLabel[docStatus]}
                          renewed={row.hasReplacement ? td.renewed : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/${locale}/dashboard/documents/${row.id}/edit`)}
                            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700"
                          >
                            <Pencil className="h-4 w-4" />
                            {tc.edit}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(td.deleteConfirm)) deleteMutation.mutate(row.id);
                            }}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            {tc.delete}
                          </button>
                          <a
                            href={resolveDocumentFileUrl(row.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {td.openFile}
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-4">
              <Pagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}