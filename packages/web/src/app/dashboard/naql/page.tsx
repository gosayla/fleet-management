'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { NaqlPermit, PermitStatus } from '@fleet/shared';
import { Package, Plus, X } from 'lucide-react';
import { formatDate, formatEnumLabel, formatNumber } from '@/lib/i18n';
import { useLocale } from '@/providers/locale-provider';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-800',
};

const emptyForm = {
  vehiclePlate: '',
  driverNationalId: '',
  origin: '',
  destination: '',
  cargoType: '',
  cargoWeight: '',
  validFrom: '',
  validTo: '',
};

export default function NaqlPage() {
  const { isRTL, locale, t } = useLocale();
  const tf = t.naql.form;
  const qc = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: permits = [], isLoading } = useQuery({
    queryKey: ['naql-permits'],
    queryFn: async () => {
      const res = await api.get('/naql/permits');
      return res.data as NaqlPermit[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Omit<typeof emptyForm, 'cargoWeight'> & { cargoWeight: number }) =>
      api.post('/naql/permits', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['naql-permits'] });
      setShowModal(false);
      setForm(emptyForm);
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Error issuing permit');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    createMutation.mutate({ ...form, cargoWeight: Number(form.cargoWeight) });
  }

  function field(
    key: keyof typeof emptyForm,
    label: string,
    opts?: { type?: string; min?: string },
  ) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={opts?.type ?? 'text'}
          min={opts?.min}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          required
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.naql.title}</h1>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            naql.com.sa
          </span>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(''); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.naql.newPermit}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.naql.permitId}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.naql.vehicle}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.naql.route}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.naql.cargo}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.naql.weight}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.naql.validTo}</th>
                <th className={`px-4 py-3 text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t.naql.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {permits.map((p) => (
                <tr key={p.permitId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.permitId}</td>
                  <td className="px-4 py-3 font-semibold text-blue-700">{p.vehiclePlate}</td>
                  <td className="px-4 py-3">{p.origin} → {p.destination}</td>
                  <td className="px-4 py-3 text-gray-600">{p.cargoType}</td>
                  <td className="px-4 py-3">{formatNumber(p.cargoWeight, locale)}</td>
                  <td className="px-4 py-3">{formatDate(p.validTo, locale)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status]}`}>
                      {formatEnumLabel('permitStatus', p.status, locale)}
                    </span>
                  </td>
                </tr>
              ))}
              {permits.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">{t.naql.empty}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* New Permit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">{tf.title}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {field('vehiclePlate', tf.vehiclePlate)}
                {field('driverNationalId', tf.driverNationalId)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field('origin', tf.origin)}
                {field('destination', tf.destination)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field('cargoType', tf.cargoType)}
                {field('cargoWeight', tf.cargoWeight, { type: 'number', min: '1' })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field('validFrom', tf.validFrom, { type: 'date' })}
                {field('validTo', tf.validTo, { type: 'date' })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {createMutation.isPending ? tf.submitting : tf.submit}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
                >
                  {tf.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
