import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ProductionRun, Machine, Product, Group } from '@shared';
import { cn } from '../utils/cn';

const runSchema = z.object({
  machine_id: z.number().int().positive('Select a machine'),
  product_id: z.number().int().positive().optional().nullable(),
  group_id: z.number().int().positive().optional().nullable(),
  item_name: z.string().optional(),
  item_code: z.string().optional(),
  operator: z.string().min(1, 'Operator is required'),
  note: z.string().optional(),
  started_at: z.string().min(1, 'Start time is required'),
  stopped_at: z.string().optional().nullable(),
  status: z.enum(['running', 'stopped']),
  shift: z.enum(['day', 'night']),
});

type RunForm = z.infer<typeof runSchema>;

interface RunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: ProductionRun | null;
  machines: Machine[];
  products: Product[];
  groups: Group[];
}

export default function RunModal({ isOpen, onClose, onSuccess, initialData, machines, products, groups }: RunModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RunForm>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      machine_id: 0,
      product_id: null,
      group_id: null,
      item_name: '',
      item_code: '',
      operator: '',
      note: '',
      started_at: new Date().toISOString().slice(0, 16),
      stopped_at: null,
      status: 'running',
      shift: 'day',
    },
  });

  const status = watch('status');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          machine_id: initialData.machine_id,
          product_id: initialData.product_id,
          group_id: initialData.group_id,
          item_name: initialData.item_name || '',
          item_code: initialData.item_code || '',
          operator: initialData.operator,
          note: initialData.note || '',
          started_at: initialData.started_at?.slice(0, 16) || '',
          stopped_at: initialData.stopped_at?.slice(0, 16) || null,
          status: initialData.status,
          shift: initialData.shift,
        });
      } else {
        reset({
          machine_id: 0,
          product_id: null,
          group_id: null,
          item_name: '',
          item_code: '',
          operator: '',
          note: '',
          started_at: new Date().toISOString().slice(0, 16),
          stopped_at: null,
          status: 'running',
          shift: 'day',
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: RunForm) => {
    try {
      setSubmitting(true);
      if (isEditing && initialData) {
        await api.put(`/api/run/${initialData.id}`, data);
        toast.success('Run updated');
      } else {
        await api.post('/api/run/start', data);
        toast.success('Run started');
      }
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save run');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-800 rounded-2xl border border-slate-700" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 rounded-t-2xl">
          <h2 id="modal-title" className="text-lg font-semibold text-white">{isEditing ? 'Edit Production Run' : 'Start Production Run'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Machine *</label>
            <select {...register('machine_id', { valueAsNumber: true })} className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.machine_id ? 'border-red-500' : 'border-slate-600')}>
              <option value="">Select machine</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {errors.machine_id && <p className="mt-1 text-sm text-red-400">{errors.machine_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Product</label>
            <select {...register('product_id', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
              <option value="">None</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Group</label>
            <select {...register('group_id', { valueAsNumber: true })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
              <option value="">None</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Item Name</label>
              <input {...register('item_name')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Item Code</label>
              <input {...register('item_code')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Operator *</label>
            <input {...register('operator')} className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.operator ? 'border-red-500' : 'border-slate-600')} />
            {errors.operator && <p className="mt-1 text-sm text-red-400">{errors.operator.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Start Time *</label>
              <input {...register('started_at')} type="datetime-local" className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.started_at ? 'border-red-500' : 'border-slate-600')} />
              {errors.started_at && <p className="mt-1 text-sm text-red-400">{errors.started_at.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Stop Time</label>
              <input {...register('stopped_at')} type="datetime-local" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
              <select {...register('status')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Shift</label>
              <select {...register('shift')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
                <option value="day">Day (07:00-19:00)</option>
                <option value="night">Night (19:00-07:00)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Note</label>
            <textarea {...register('note')} rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800/95 backdrop-blur-sm rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className={cn('px-4 py-2 rounded-lg font-medium text-white', 'bg-brand-600 hover:bg-brand-700', 'disabled:opacity-50')}>
              {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : (isEditing ? 'Update' : 'Start Run')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}