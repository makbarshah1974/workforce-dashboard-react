import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { Machine } from '@shared';
import { cn } from '../utils/cn';

const machineSchema = z.object({
  machine_code: z.string().min(1, 'Machine code is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.string().min(1, 'Type is required'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['operational', 'maintenance', 'offline', 'error']),
  last_maintenance: z.string().optional(),
  next_maintenance: z.string().optional(),
  specifications: z.record(z.unknown()).default({}),
});

type MachineForm = z.infer<typeof machineSchema>;

interface MachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: Machine | null;
}

export default function MachineModal({ isOpen, onClose, onSuccess, initialData }: MachineModalProps) {
  const [types, setTypes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MachineForm>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      machine_code: '',
      name: '',
      type: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      location: '',
      status: 'operational',
      last_maintenance: '',
      next_maintenance: '',
      specifications: {},
    },
  });

  const specs = watch('specifications');

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
      if (initialData) {
        reset({
          machine_code: initialData.machine_code,
          name: initialData.name,
          type: initialData.type,
          manufacturer: initialData.manufacturer || '',
          model: initialData.model || '',
          serial_number: initialData.serial_number || '',
          location: initialData.location || '',
          status: initialData.status,
          last_maintenance: initialData.last_maintenance?.split('T')[0] || '',
          next_maintenance: initialData.next_maintenance?.split('T')[0] || '',
          specifications: initialData.specifications || {},
        });
      } else {
        reset({
          machine_code: '',
          name: '',
          type: '',
          manufacturer: '',
          model: '',
          serial_number: '',
          location: '',
          status: 'operational',
          last_maintenance: '',
          next_maintenance: '',
          specifications: {},
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const fetchTypes = async () => {
    try {
      const res = await api.get<{ data: string[] }>('/api/machines/types/list');
      setTypes(res.data);
    } catch {
      // ignore
    }
  };

  const addSpec = () => {
    const key = prompt('Specification key:');
    if (!key) return;
    const value = prompt(`Value for ${key}:`);
    if (value === null) return;
    setValue('specifications', { ...specs, [key.trim()]: value.trim() });
  };

  const removeSpec = (key: string) => {
    const newSpecs = { ...specs };
    delete newSpecs[key];
    setValue('specifications', newSpecs);
  };

  const onSubmit = async (data: MachineForm) => {
    try {
      setSubmitting(true);
      if (isEditing && initialData) {
        await api.patch(`/api/machines/${initialData.id}`, data);
        toast.success('Machine updated');
      } else {
        await api.post('/api/machines', data);
        toast.success('Machine created');
      }
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save machine');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 rounded-2xl border border-slate-700"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 rounded-t-2xl">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Machine' : 'Add Machine'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Machine Code *</label>
              <input
                {...register('machine_code')}
                disabled={isEditing}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white placeholder-slate-500',
                  errors.machine_code ? 'border-red-500' : 'border-slate-600'
                )}
                placeholder="MC-001"
              />
              {errors.machine_code && <p className="mt-1 text-sm text-red-400">{errors.machine_code.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
              <input
                {...register('name')}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white placeholder-slate-500',
                  errors.name ? 'border-red-500' : 'border-slate-600'
                )}
                placeholder="CNC Lathe 1"
              />
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Type *</label>
              <select
                {...register('type')}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.type ? 'border-red-500' : 'border-slate-600'
                )}
              >
                <option value="">Select type</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-400">{errors.type.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Manufacturer</label>
              <input
                {...register('manufacturer')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500"
                placeholder="Haas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
              <input
                {...register('model')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500"
                placeholder="ST-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Serial Number</label>
              <input
                {...register('serial_number')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500"
                placeholder="SN123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
              <input
                {...register('location')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500"
                placeholder="Floor A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Status *</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white"
              >
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Last Maintenance</label>
              <input
                {...register('last_maintenance')}
                type="date"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Next Maintenance</label>
              <input
                {...register('next_maintenance')}
                type="date"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">Specifications</label>
              <button type="button" onClick={addSpec} className="text-sm text-brand-400 hover:text-brand-300">+ Add</button>
            </div>
            <div className="space-y-2">
              {Object.entries(specs).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-700">
                  <span className="font-mono text-sm text-brand-300 min-w-[120px]">{key}</span>
                  <span className="text-slate-300 flex-1">{String(value)}</span>
                  <button type="button" onClick={() => removeSpec(key)} className="text-slate-400 hover:text-red-400">×</button>
                </div>
              ))}
              {Object.keys(specs).length === 0 && <span className="text-sm text-slate-500">No specifications added</span>}
            </div>
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