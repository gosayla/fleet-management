'use client';

import { AlertTriangle } from 'lucide-react';
import { useLocale } from '@/providers/locale-provider';

interface ConfirmDialogProps {
  open: boolean;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({ open, message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  const { t } = useLocale();
  const tc = t.common;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-sm text-gray-700">{message ?? tc.deleteConfirm}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {tc.confirmNo}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '…' : tc.confirmYes}
          </button>
        </div>
      </div>
    </div>
  );
}
