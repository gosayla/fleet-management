'use client';

import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useLocale } from '@/providers/locale-provider';

export default function LoginPage() {
  const router = useRouter();
  const { locale, isRTL, toggleLocale, t } = useLocale();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: { role: string; fullName: string } }>('/auth/login', { phone, password });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('userRole', res.data.user?.role ?? '');
      localStorage.setItem('userName', res.data.user?.fullName ?? '');
      router.push(`/${locale}/dashboard`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError(t.login.invalidCredentials);
      } else {
        setError(t.login.connectionError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8 ${isRTL ? 'text-right' : 'text-left'}`}>
        <div className={`mb-6 flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
          <button
            type="button"
            onClick={toggleLocale}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t.common.languageLabel}
          </button>
        </div>
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 17l4 4 4-4m-4-5v9M3 7l9-4 9 4M3 7l9 4m0-4v4m9-4l-9 4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t.login.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.phone}</label>
            <input
              type="tel"
              dir="ltr"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t.login.phonePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.password}</label>
            <input
              type="password"
              dir="ltr"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t.login.passwordPlaceholder}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t.login.submitting : t.login.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
