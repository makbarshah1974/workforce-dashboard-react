import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ProductionRecord, Machine, Worker, Shift } from '@shared';
import { cn } from '../utils/cn';

const productionSchema = z.object({
  machine_id: z.string().uuid('Select a machine'),
  worker_id: z.string().uuid('Select a worker'),
  shift_id: z.string().uuid('Select a shift'),
  product_name: z.string().min(1, 'Product name is required'),
  quantity: z.coerce.number().int().min(0, 'Quantity must be >= 0'),
  target_quantity: z.coerce.number().int().min(0, 'Target must be >= 0'),
  quality_pass: z.coerce.number().int().min(0, 'Pass must be >= 0'),
  quality_fail: z.coerce.number().int().min(0, 'Fail must be >= 0'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  downtime_minutes: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
});

type ProductionForm = z.infer<typeof productionSchema>;

interface ProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: ProductionRecord | null;
  machines: Machine[];
  workers: Worker[];
  shifts: Shift[];
}

export default function ProductionModal({ isOpen, onClose, onSuccess, initialData, machines, workers, shifts }: ProductionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductionForm>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      machine_id: '',
      worker_id: '',
      shift_id: '',
      product_name: '',
      quantity: 0,
      target_quantity: 0,
      quality_pass: 0,
      quality_fail: 0,
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date().toISOString().slice(0, 16),
      downtime_minutes: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          machine_id: initialData.machine_id,
          worker_id: initialData.worker_id,
          shift_id: initialData.shift_id,
          product_name: initialData.product_name,
          quantity: initialData.quantity,
          target_quantity: initialData.target_quantity,
          quality_pass: initialData.quality_pass,
          quality_fail: initialData.quality_fail,
          start_time: initialData.start_time.slice(0, 16),
          end_time: initialData.end_time.slice(0, 16),
          downtime_minutes: initialData.downtime_minutes,
          notes: initialData.notes || '',
        });
      } else {
        reset({
          machine_id: '',
          worker_id: '',
          shift_id: '',
          product_name: '',
          quantity: 0,
          target_quantity: 0,
          quality_pass: 0,
          quality_fail: 0,
          start_time: new Date().toISOString().slice(0, 16),
          end_time: new Date().toISOString().slice(0, 16),
          downtime_minutes: 0,
          notes: '',
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: ProductionForm) => {
    try {
      setSubmitting(true);
      if (isEditing && initialData) {
        await api.patch(`/api/production/${initialData.id}`, data);
        toast.success('Record updated');
      } else {
        await api.post('/api/production', data);
        toast.success('Record created');
      }
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-800 rounded-2xl border border-slate-700"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 rounded-t-2xl">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Production Record' : 'Add Production Record'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Machine *</label>
            <select
              {...register('machine_id')}
              className={cn(
                'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                errors.machine_id ? 'border-red-500' : 'border-slate-600'
              )}
            >
              <option value="">Select machine</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.machine_code})</option>)}
            </select>
            {errors.machine_id && <p className="mt-1 text-sm text-red-400">{errors.machine_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Worker *</label>
            <select
              {...register('worker_id')}
              className={cn(
                'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                errors.worker_id ? 'border-red-500' : 'border-slate-600'
              )}
            >
              <option value="">Select worker</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.employee_id})</option>)}
            </select>
            {errors.worker_id && <p className="mt-1 text-sm text-red-400">{errors.worker_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Shift *</label>
            <select
              {...register('shift_id')}
              className={cn(
                'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                errors.shift_id ? 'border-red-500' : 'border-slate-600'
              )}
            >
              <option value="">Select shift</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.shift_id && <p className="mt-1 text-sm text-red-400">{errors.shift_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Product Name *</label>
            <input
              {...register('product_name')}
              className={cn(
                'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white placeholder-slate-500',
                errors.product_name ? 'border-red-500' : 'border-slate-600'
              )}
              placeholder="Product name"
            />
            {errors.product_name && <p className="mt-1 text-sm text-red-400">{errors.product_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Quantity *</label>
              <input
                {...register('quantity')}
                type="number"
                min="0"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.quantity ? 'border-red-500' : 'border-slate-600'
                )}
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-400">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Target Quantity *</label>
              <input
                {...register('target_quantity')}
                type="number"
                min="0"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.target_quantity ? 'border-red-500' : 'border-slate-600'
                )}
              />
              {errors.target_quantity && <p className="mt-1 text-sm text-red-400">{errors.target_quantity.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Quality Pass *</label>
              <input
                {...register('quality_pass')}
                type="number"
                min="0"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.quality_pass ? 'border-red-500' : 'border-slate-600'
                )}
              />
              {errors.quality_pass && <p className="mt-1 text-sm text-red-400">{errors.quality_pass.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Quality Fail *</label>
              <input
                {...register('quality_fail')}
                type="number"
                min="0"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.quality_fail ? 'border-red-500' : 'border-slate-600'
                )}
              />
              {errors.quality_fail && <p className="mt-1 text-sm text-red-400">{errors.quality_fail.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Start Time *</label>
              <input
                {...register('start_time')}
                type="datetime-local"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.start_time ? 'border-red-500' : 'border-slate-600'
                )}
              />
              {errors.start_time && <p className="mt-1 text-sm text-red-400">{errors.start_time.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">End Time *</label>
              <input
                {...register('end_time')}
                type="datetime-local"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.end_time ? 'border-red-500' : 'border-slate-600'
                )}
              />
              {errors.end_time && <p className="mt-1 text-sm text-red-400">{errors.end_time.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Downtime (minutes)</label>
            <input
              {...register('downtime_minutes')}
              type="number"
              min="0"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800/95 backdrop-blur-sm rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-white transition-colors',
                'bg-brand-600 hover:bg-brand-700 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-800',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>
              ) : (
                isEditing ? 'Update' : 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}