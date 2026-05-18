'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';

type UserRole = 'FLEET_MANAGER' | 'DISPATCHER' | 'DRIVER' | 'VIEWER' | 'MAINTENANCE_TECH';

function getCurrentRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem('userRole') as UserRole) || null;
}

interface CompanyUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  lastSeenAt: string | null;
  createdAt: string;
}

interface UserFormValues {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
}

/** Roles a given role is allowed to see and manage — mirrors the backend */
const MANAGEABLE_ROLES: Record<UserRole, UserRole[]> = {
  FLEET_MANAGER:    ['FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'VIEWER', 'MAINTENANCE_TECH'],
  DISPATCHER:       ['DISPATCHER', 'DRIVER', 'VIEWER', 'MAINTENANCE_TECH'],
  DRIVER:           ['DRIVER', 'VIEWER'],
  VIEWER:           ['VIEWER'],
  MAINTENANCE_TECH: [],
};

function getAvailableRoles(currentRole: UserRole | null): UserRole[] {
  if (!currentRole) return ['FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'VIEWER'];
  return MANAGEABLE_ROLES[currentRole] ?? [];
}

function canManage(currentRole: UserRole | null, targetRole: UserRole): boolean {
  if (!currentRole) return false;
  return (MANAGEABLE_ROLES[currentRole] ?? []).includes(targetRole);
}

const emptyForm: UserFormValues = {
  fullName: '',
  email: '',
  phone: '',
  role: 'FLEET_MANAGER',
  password: '',
};

export default function UsersPage() {
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const currentRole = getCurrentRole();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: rawUsers = [], isLoading } = useQuery<CompanyUser[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  // Filter client-side as well so users outside the requester's scope are never shown
  const users = rawUsers.filter((u) => canManage(currentRole, u.role));

  const saveMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (editing) {
        const payload: Partial<UserFormValues> = {
          fullName: values.fullName,
          phone: values.phone,
          role: values.role,
        };
        if (values.password) payload.password = values.password;
        return api.patch(`/users/${editing.id}`, payload);
      }
      return api.post('/users', values);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Error saving user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteId(null);
    },
  });

  function openCreate() {
    setEditing(null);
    const available = getAvailableRoles(currentRole);
    const defaultRole: UserRole = available[0] ?? 'VIEWER';
    setForm({ ...emptyForm, role: defaultRole });
    setError('');
    setShowModal(true);
  }

  function openEdit(user: CompanyUser) {
    setEditing(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      password: '',
    });
    setError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    saveMutation.mutate(form);
  }

  const roleBadgeColor: Record<UserRole, string> = {
    FLEET_MANAGER:    'bg-blue-100 text-blue-700',
    DISPATCHER:       'bg-purple-100 text-purple-700',
    DRIVER:           'bg-green-100 text-green-700',
    VIEWER:           'bg-gray-100 text-gray-600',
    MAINTENANCE_TECH: 'bg-orange-100 text-orange-700',
  };

  function getOnlineStatus(lastSeenAt: string | null): { dot: string; label: string } {
    if (!lastSeenAt) return { dot: 'bg-gray-300', label: 'Offline' };
    const diffMin = (Date.now() - new Date(lastSeenAt).getTime()) / 60_000;
    if (diffMin < 5)  return { dot: 'bg-green-500', label: 'Online' };
    if (diffMin < 30) return { dot: 'bg-yellow-400', label: 'Away' };
    return { dot: 'bg-gray-300', label: 'Offline' };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCog className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.users.title}</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.users.add}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-500">{t.common.loading}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">{t.users.empty}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-start px-4 py-3 font-medium text-gray-600">{t.users.name}</th>
                <th className="text-start px-4 py-3 font-medium text-gray-600">{t.users.email}</th>
                <th className="text-start px-4 py-3 font-medium text-gray-600">{t.users.phone}</th>
                <th className="text-start px-4 py-3 font-medium text-gray-600">{t.users.role}</th>
                <th className="text-start px-4 py-3 font-medium text-gray-600">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {(() => { const s = getOnlineStatus(user.lastSeenAt); return <span title={s.label} className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />; })()}
                      {user.fullName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColor[user.role]}`}>
                      {t.users.roles[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canManage(currentRole, user.role) && (
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title={t.common.edit}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canManage(currentRole, user.role) && (
                        <button
                          onClick={() => setDeleteId(user.id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">
                {editing ? t.users.saveUpdate : t.users.add}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.users.name}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  required
                />
              </div>

              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.users.email}</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.users.phone}</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.users.role}</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                >
                  {getAvailableRoles(currentRole).map((r) => (
                    <option key={r} value={r}>{t.users.roles[r]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.users.password}
                  {editing && <span className="text-gray-400 text-xs ms-2">{t.users.passwordHint}</span>}
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editing}
                  minLength={8}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {saveMutation.isPending
                    ? t.users.saving
                    : editing
                    ? t.users.saveUpdate
                    : t.users.saveCreate}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
                >
                  {t.documents.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <p className="text-gray-800 text-sm mb-6">{t.users.deleteConfirm}</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {t.common.confirmYes}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                {t.common.confirmNo}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}