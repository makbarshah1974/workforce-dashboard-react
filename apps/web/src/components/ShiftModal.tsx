import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook_form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { Shift } from '@shared';
import { cn } from '../utils/cn';

const shiftSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  days: z.array(z.number().int().min(0).max(6)).min(1, 'Select at least one day'),
  is_active: z.boolean().default(true),
});

type ShiftForm = z.infer<typeof shiftSchema>;

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: Shift | null;
}

export default function ShiftModal({ isOpen, onClose, onSuccess, initialData }: ShiftModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ShiftForm>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: '',
      start_time: '06:00',
      end_time: '14:00',
      days: [1,2,3,4,5],
      is_active: true,
    },
  });

  const days = watch('days');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          start_time: initialData.start_time.slice(0,5),
          end_time: initialData.end_time.slice(0,5),
          days: initialData.days,
          is_active: initialData.is_active,
        });
      } else {
        reset({ name: '', start_time: '06:00', end_time: '14:00', days: [1,2,3,4,5], is_active: true });
      }
    }
  }, [isOpen, initialData, reset]);

  const toggleDay = (day: number) => {
    setValue('days', days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  };

  const onSubmit = async (data: ShiftForm) => {
    try {
      setSubmitting(true);
      if (isEditing && initialData) {
        await api.patch(`/api/shifts/${initialData.id}`, data);
        toast.success('Shift updated');
      } else {
        await api.post('/api/shifts', data);
        toast.success('Shift created');
      }
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save shift');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-800 rounded-2xl border border-slate-700" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 rounded-t-2xl">
          <h2 id="modal-title" className="text-lg font-semibold text-white">{isEditing ? 'Edit Shift' : 'Add Shift'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
            <input {...register('name')} className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.name ? 'border-red-500' : 'border-slate-600')} placeholder="Morning Shift" />
            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Start Time *</label>
              <input {...register('start_time')} type="time" className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.start_time ? 'border-red-500' : 'border-slate-600')} />
              {errors.start_time && <p className="mt-1 text-sm text-red-400">{errors.start_time.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">End Time *</label>
              <input {...register('end_time')} type="time" className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.end_time ? 'border-red-500' : 'border-slate-600')} />
              {errors.end_time && <p className="mt-1 text-sm text-red-400">{errors.end_time.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Days *</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    days.includes(day.value)
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {errors.days && <p className="mt-1 text-sm text-red-400">{errors.days.message}</p>}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input {...register('is_active')} type="checkbox" className="w-4 h-4 rounded border-slate-600 text-brand-600 focus:ring-brand-500 bg-slate-900" />
              <span className="text-sm text-slate-300">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800/95 backdrop-blur-sm rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Cancel</button>
            <button type="submit" disabled={submitting} className={cn('px-4 py-2 rounded-lg font-medium text-white', 'bg-brand-600 hover:bg-brand-700', 'disabled:opacity-50')}>
              {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : (isEditing ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}