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
  const [showReset, setShowReset] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!identifier.trim() || !crNumber.trim() || !newPassword || !confirmPassword) {
      setResetError(t.login.resetFillAllFields);
      return;
    }

    if (newPassword.length < 8) {
      setResetError(t.login.resetPasswordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError(t.login.resetPasswordsMismatch);
      return;
    }

    setResetLoading(true);
    try {
      await api.post('/auth/reset-password', {
        identifier: identifier.trim(),
        crNumber: crNumber.trim(),
        newPassword,
      });
      setResetSuccess(t.login.resetSuccess);
      setIdentifier('');
      setCrNumber('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setResetError(t.login.resetInvalidVerification);
      } else {
        setResetError(t.login.resetGeneralError);
      }
    } finally {
      setResetLoading(false);
    }
  }

  function closeResetModal() {
    setShowReset(false);
    setResetError('');
    setResetSuccess('');
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

          <div className={`-mt-1 flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              {t.login.forgotPassword}
            </button>
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

      {showReset && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={closeResetModal}>
          <div
            className={`w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-xl p-6 ${isRTL ? 'text-right' : 'text-left'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t.login.resetTitle}</h2>
              <p className="text-sm text-gray-500 mt-1">{t.login.resetSubtitle}</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.identifier}</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.login.identifierPlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.crNumber}</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.login.crNumberPlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.newPassword}</label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.login.passwordPlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.confirmPassword}</label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.login.passwordPlaceholder}
                />
              </div>

              {resetError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{resetError}</p>}
              {resetSuccess && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{resetSuccess}</p>}

              <div className={`pt-2 flex gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  {t.common.confirmNo}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {resetLoading ? t.login.resetSubmitting : t.login.resetSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
