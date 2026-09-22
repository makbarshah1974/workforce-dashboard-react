import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ShiftAssignment, Worker, Shift } from '../../../../packages/shared/src';
import { cn } from '../utils/cn';

const assignmentSchema = z.object({
  worker_id: z.string().uuid('Select a worker'),
  shift_id: z.string().uuid('Select a shift'),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['scheduled', 'completed', 'absent', 'late']).default('scheduled'),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

interface ShiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: ShiftAssignment | null;
  workers: Worker[];
  shifts: Shift[];
}

export default function ShiftAssignmentModal({ isOpen, onClose, onSuccess, initialData, workers, shifts }: ShiftAssignmentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema) as any,
    defaultValues: {
      worker_id: '',
      shift_id: '',
      date: new Date().toISOString().split('T')[0],
      status: 'scheduled',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          worker_id: initialData.worker_id,
          shift_id: initialData.shift_id,
          date: initialData.date,
          status: initialData.status,
        });
      } else {
        reset({ worker_id: '', shift_id: '', date: new Date().toISOString().split('T')[0], status: 'scheduled' });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: AssignmentForm) => {
    try {
      setSubmitting(true);
      if (isEditing && initialData) {
        await api.patch(`/api/shifts/assignments/${initialData.id}`, data);
        toast.success('Assignment updated');
      } else {
        await api.post('/api/shifts/assignments', data);
        toast.success('Assignment created');
      }
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-slate-800 rounded-2xl border border-slate-700" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 rounded-t-2xl">
          <h2 id="modal-title" className="text-lg font-semibold text-white">{isEditing ? 'Edit Assignment' : 'Assign Worker'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Worker *</label>
            <select {...register('worker_id')} className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.worker_id ? 'border-red-500' : 'border-slate-600')}>
              <option value="">Select worker</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.employee_id})</option>)}
            </select>
            {errors.worker_id && <p className="mt-1 text-sm text-red-400">{errors.worker_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Shift *</label>
            <select {...register('shift_id')} className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.shift_id ? 'border-red-500' : 'border-slate-600')}>
              <option value="">Select shift</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0,5)}-{s.end_time.slice(0,5)})</option>)}
            </select>
            {errors.shift_id && <p className="mt-1 text-sm text-red-400">{errors.shift_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Date *</label>
            <input {...register('date')} type="date" className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', errors.date ? 'border-red-500' : 'border-slate-600')} />
            {errors.date && <p className="mt-1 text-sm text-red-400">{errors.date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select {...register('status')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800/95 backdrop-blur-sm rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Cancel</button>
            <button type="submit" disabled={submitting} className={cn('px-4 py-2 rounded-lg font-medium text-white', 'bg-brand-600 hover:bg-brand-700', 'disabled:opacity-50')}>
              {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : (isEditing ? 'Update' : 'Assign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


