import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmColor = variant === 'destructive'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 id="confirm-title" className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p id="confirm-message" className="text-slate-300">{message}</p>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-white transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800',
              confirmColor,
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}