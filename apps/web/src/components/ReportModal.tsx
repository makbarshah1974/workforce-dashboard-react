import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { cn } from '../utils/cn';

const reportSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  type: z.enum(['production', 'worker', 'machine', 'shift', 'quality']),
  filters: z.record(z.unknown()).default({}),
});

type ReportForm = z.infer<typeof reportSchema>;

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportModal({ isOpen, onClose, onSuccess }: ReportModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      name: '',
      type: 'production',
      filters: {},
    },
  });

  const type = watch('type');

  useEffect(() => {
    if (isOpen) {
      reset({ name: '', type: 'production', filters: {} });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: ReportForm) => {
    try {
      setSubmitting(true);
      await api.post('/api/reports/generate', data);
      toast.success('Report generation started');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-800 rounded-2xl border border-slate-700" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 rounded-t-2xl">
          <h2 id="modal-title" className="text-lg font-semibold text-white">Generate Report</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Report Name *</label>
            <input {...register('name')} className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.name ? 'border-red-500' : 'border-slate-600')} placeholder="Monthly Production Report" />
            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Type *</label>
            <select {...register('type')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
              <option value="production">Production</option>
              <option value="worker">Worker</option>
              <option value="machine">Machine</option>
              <option value="shift">Shift</option>
              <option value="quality">Quality</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Filters</label>
            <div className="space-y-2">
              {type === 'production' && (
                <>
                  <input type="date" placeholder="Date From" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
                  <input type="date" placeholder="Date To" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
                </>
              )}
              {type === 'worker' && (
                <input type="text" placeholder="Department" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
              )}
              {type === 'machine' && (
                <input type="text" placeholder="Machine Type" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
              )}
              {type === 'shift' && (
                <input type="text" placeholder="Shift Name" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
              )}
              {type === 'quality' && (
                <input type="text" placeholder="Product Name" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800/95 backdrop-blur-sm rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Cancel</button>
            <button type="submit" disabled={submitting} className={cn('px-4 py-2 rounded-lg font-medium text-white', 'bg-brand-600 hover:bg-brand-700', 'disabled:opacity-50')}>
              {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating...</span> : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}