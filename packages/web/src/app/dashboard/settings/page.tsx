import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateLocalizedMetadata({ ar: 'الإعدادات', en: 'Settings' });
}

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Settings, Building2, User } from 'lucide-react';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';

interface CompanyData {
  id: string;
  name: string;
  crNumber: string;
  naqlCompanyCode: string | null;
  tammSubscriptionId: string | null;
}

interface ProfileData {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
}

export default function SettingsPage() {
  const { t } = useLocale();
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    setCurrentRole(localStorage.getItem('userRole'));
  }, []);

  // ── Company form ─────────────────────────────────────────
  const { data: company } = useQuery<CompanyData>({
    queryKey: ['settings-company'],
    queryFn: async () => (await api.get('/settings/company')).data,
    enabled: currentRole === 'FLEET_MANAGER' || currentRole === 'SUPER_ADMIN' || currentRole === 'DISPATCHER' || currentRole === 'VIEWER',
  });

  const [companyForm, setCompanyForm] = useState({
    name: '',
    crNumber: '',
    naqlCompanyCode: '',
    tammSubscriptionId: '',
  });
  const [companySaved, setCompanySaved] = useState(false);
  const [companyError, setCompanyError] = useState('');

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name ?? '',
        crNumber: company.crNumber ?? '',
        naqlCompanyCode: company.naqlCompanyCode ?? '',
        tammSubscriptionId: company.tammSubscriptionId ?? '',
      });
    }
  }, [company]);

  const companyMutation = useMutation({
    mutationFn: () => api.patch('/settings/company', companyForm),
    onSuccess: () => { setCompanySaved(true); setTimeout(() => setCompanySaved(false), 3000); },
    onError: (err: any) => setCompanyError(err?.response?.data?.message ?? 'Error saving'),
  });

  // ── Profile form ─────────────────────────────────────────
  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['settings-profile'],
    queryFn: async () => (await api.get('/settings/profile')).data,
  });

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (profile) {
      setProfileForm((f) => ({
        ...f,
        fullName: profile.fullName ?? '',
        phone: profile.phone ?? '',
      }));
    }
  }, [profile]);

  const profileMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
      };
      if (profileForm.newPassword) {
        payload.currentPassword = profileForm.currentPassword;
        payload.newPassword = profileForm.newPassword;
      }
      return api.patch('/settings/profile', payload);
    },
    onSuccess: () => {
      setProfileSaved(true);
      setProfileForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
      setTimeout(() => setProfileSaved(false), 3000);
    },
    onError: (err: any) => setProfileError(err?.response?.data?.message ?? 'Error saving'),
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{t.settings.title}</h1>
      </div>

      {/* Company Info — only visible to Fleet Manager / Super Admin */}
      {currentRole === 'FLEET_MANAGER' || currentRole === 'SUPER_ADMIN' ? (
      <section className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <Building2 className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">{t.settings.companySection}</h2>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setCompanyError(''); companyMutation.mutate(); }}
          className="p-6 space-y-4"
        >
          {companyError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{companyError}</div>
          )}
          {companySaved && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">{t.settings.savedSuccess}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.companyName}</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={companyForm.name}
                onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.crNumber}</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={companyForm.crNumber}
                onChange={(e) => setCompanyForm((f) => ({ ...f, crNumber: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.naqlCode}</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={companyForm.naqlCompanyCode}
                onChange={(e) => setCompanyForm((f) => ({ ...f, naqlCompanyCode: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.tammId}</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={companyForm.tammSubscriptionId}
                onChange={(e) => setCompanyForm((f) => ({ ...f, tammSubscriptionId: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={companyMutation.isPending}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {companyMutation.isPending ? t.settings.saving : t.settings.save}
            </button>
          </div>
        </form>
      </section>
      ) : null}

      {/* My Account */}
      <section className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <User className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">{t.settings.profileSection}</h2>
          {profile && (
            <span className="ms-auto text-xs text-gray-400">{profile.email}</span>
          )}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setProfileError(''); profileMutation.mutate(); }}
          className="p-6 space-y-4"
        >
          {profileError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{profileError}</div>
          )}
          {profileSaved && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">{t.settings.savedSuccess}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.fullName}</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.phone}</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-3">{t.settings.newPasswordHint}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.currentPassword}</label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm((f) => ({ ...f, currentPassword: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.newPassword}</label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm((f) => ({ ...f, newPassword: e.target.value }))}
                  minLength={8}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {profileMutation.isPending ? t.settings.saving : t.settings.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
