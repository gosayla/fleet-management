'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';
import { DatePicker } from '@/components/ui/date-picker';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

interface AuditLog {
  id: string;
  companyId: string | null;
  userId: string | null;
  userFullName: string | null;
  userRole: string | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  route: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_BADGE: Record<AuditAction, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
};

const ENTITIES = [
  'Vehicle', 'Driver', 'Trip', 'MaintenanceLog', 'FuelLog',
  'Document', 'User', 'VehicleRental', 'TripContract', 'Settings',
];

const ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  FLEET_MANAGER: 'Fleet Manager',
  DISPATCHER: 'Dispatcher',
  DRIVER: 'Driver',
  VIEWER: 'Viewer',
  MAINTENANCE_TECH: 'Maintenance Tech',
};

function humanKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function humanValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString('en-US', {
          year: 'numeric', month: 'short', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        });
      } catch { /* fall through */ }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      try {
        return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: '2-digit',
        });
      } catch { /* fall through */ }
    }
    return value;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ChangesPanel({ changes }: { changes: Record<string, unknown> }) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-2 items-start min-w-0">
          <span className="shrink-0 text-xs font-semibold text-gray-500 pt-0.5 w-36 truncate" title={humanKey(key)}>
            {humanKey(key)}
          </span>
          <span className="text-xs text-gray-800 break-all">{humanValue(val)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogsPage() {
  const { t, isRTL } = useLocale();
  const tl = t.auditLogs;

  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterFrom, setFilterFrom] = useState<string | undefined>();
  const [filterTo, setFilterTo] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = new URLSearchParams({
    page: String(page),
    limit: '30',
    ...(filterAction && { action: filterAction }),
    ...(filterEntity && { entity: filterEntity }),
    ...(filterFrom && { from: filterFrom }),
    ...(filterTo && { to: filterTo }),
  });

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', page, filterAction, filterEntity, filterFrom, filterTo],
    queryFn: () => api.get(`/audit-logs?${params}`).then(r => r.data),
  });

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  function resetPage() { setPage(1); }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{tl.title}</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{tl.filterAction}</label>
            <select
              value={filterAction}
              onChange={e => { setFilterAction(e.target.value); resetPage(); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{tl.all}</option>
              {ACTIONS.map(a => (
                <option key={a} value={a}>{tl.actions[a]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">{tl.filterEntity}</label>
            <select
              value={filterEntity}
              onChange={e => { setFilterEntity(e.target.value); resetPage(); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{tl.all}</option>
              {ENTITIES.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <DatePicker
            label={tl.filterFrom}
            value={filterFrom}
            onChange={v => { setFilterFrom(v); resetPage(); }}
            isRTL={isRTL}
            outputCalendar="gregorian"
          />

          <DatePicker
            label={tl.filterTo}
            value={filterTo}
            onChange={v => { setFilterTo(v); resetPage(); }}
            isRTL={isRTL}
            outputCalendar="gregorian"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">{t.common.loading}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">{tl.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['date', 'user', 'role', 'action', 'entity', 'route', 'ip', 'changes'].map(col => (
                    <th key={col} className={`px-4 py-3 font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {(tl as unknown as Record<string, string>)[col]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{log.userFullName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {log.userRole ? (ROLE_LABELS[log.userRole] ?? log.userRole) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_BADGE[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {tl.actions[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{log.entity}</span>
                        {log.entityId && (
                          <span className="ms-1 text-gray-400 text-xs font-mono">{log.entityId.slice(0, 8)}...</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{log.route ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{log.ipAddress ?? '—'}</td>
                      <td className="px-4 py-3">
                        {log.changes && Object.keys(log.changes).length > 0 ? (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="text-blue-600 hover:underline text-xs whitespace-nowrap"
                          >
                            {expandedId === log.id ? 'Hide' : 'Show'}
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && log.changes && (
                      <tr key={`${log.id}-exp`} className="bg-blue-50/40">
                        <td colSpan={8} className="px-6 py-4">
                          <ChangesPanel changes={log.changes} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
