import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { Worker } from '@shared';
import { cn } from '../utils/cn';

const workerSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  role: z.string().min(1, 'Role is required'),
  shift_type: z.enum(['day', 'night', 'rotating']),
  hire_date: z.string().min(1, 'Hire date is required'),
  status: z.enum(['active', 'inactive', 'on_leave']),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string(),
    issued_date: z.string(),
    expiry_date: z.string().optional(),
    issuer: z.string(),
  })).default([]),
});

type WorkerForm = z.infer<typeof workerSchema>;

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: Worker | null;
}

export default function WorkerModal({ isOpen, onClose, onSuccess, initialData }: WorkerModalProps) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<WorkerForm>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      employee_id: '',
      full_name: '',
      email: '',
      phone: '',
      department: '',
      role: '',
      shift_type: 'day',
      hire_date: new Date().toISOString().split('T')[0],
      status: 'active',
      skills: [],
      certifications: [],
    },
  });

  const skills = watch('skills');
  const certifications = watch('certifications');

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      if (initialData) {
        reset({
          employee_id: initialData.employee_id,
          full_name: initialData.full_name,
          email: initialData.email,
          phone: initialData.phone || '',
          department: initialData.department,
          role: initialData.role,
          shift_type: initialData.shift_type,
          hire_date: initialData.hire_date.split('T')[0],
          status: initialData.status,
          skills: initialData.skills || [],
          certifications: initialData.certifications || [],
        });
      } else {
        reset({
          employee_id: '',
          full_name: '',
          email: '',
          phone: '',
          department: '',
          role: '',
          shift_type: 'day',
          hire_date: new Date().toISOString().split('T')[0],
          status: 'active',
          skills: [],
          certifications: [],
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get<{ data: string[] }>('/api/workers/departments/list');
      setDepartments(res.data);
    } catch {
      // ignore
    }
  };

  const addSkill = () => {
    const newSkill = prompt('Enter skill:');
    if (newSkill && newSkill.trim()) {
      setValue('skills', [...skills, newSkill.trim()]);
    }
  };

  const removeSkill = (index: number) => {
    setValue('skills', skills.filter((_, i) => i !== index));
  };

  const addCertification = () => {
    const name = prompt('Certification name:');
    if (!name) return;
    const issuer = prompt('Issuer:');
    if (!issuer) return;
    const issued_date = prompt('Issued date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!issued_date) return;
    const expiry_date = prompt('Expiry date (YYYY-MM-DD, optional):');
    
    setValue('certifications', [...certifications, {
      id: crypto.randomUUID(),
      name: name.trim(),
      issuer: issuer.trim(),
      issued_date,
      expiry_date: expiry_date || undefined,
    }]);
  };

  const removeCertification = (index: number) => {
    setValue('certifications', certifications.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: WorkerForm) => {
    try {
      setSubmitting(true);
      if (isEditing && initialData) {
        await api.patch(`/api/workers/${initialData.id}`, data);
        toast.success('Worker updated');
      } else {
        await api.post('/api/workers', data);
        toast.success('Worker created');
      }
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save worker');
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 rounded-t-2xl">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Worker' : 'Add Worker'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Employee ID *</label>
              <input
                {...register('employee_id')}
                disabled={isEditing}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white placeholder-slate-500',
                  errors.employee_id ? 'border-red-500' : 'border-slate-600'
                )}
                placeholder="EMP-001"
              />
              {errors.employee_id && <p className="mt-1 text-sm text-red-400">{errors.employee_id.message}</p>}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
              <input
                {...register('full_name')}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white placeholder-slate-500',
                  errors.full_name ? 'border-red-500' : 'border-slate-600'
                )}
                placeholder="John Doe"
              />
              {errors.full_name && <p className="mt-1 text-sm text-red-400">{errors.full_name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
              <input
                {...register('email')}
                type="email"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white placeholder-slate-500',
                  errors.email ? 'border-red-500' : 'border-slate-600'
                )}
                placeholder="john@metex.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
              <input
                {...register('phone')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500"
                placeholder="+91-9876543210"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Department *</label>
              <select
                {...register('department')}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.department ? 'border-red-500' : 'border-slate-600'
                )}
              >
                <option value="">Select department</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="mt-1 text-sm text-red-400">{errors.department.message}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Role *</label>
              <input
                {...register('role')}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white placeholder-slate-500',
                  errors.role ? 'border-red-500' : 'border-slate-600'
                )}
                placeholder="CNC Operator"
              />
              {errors.role && <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>}
            </div>

            {/* Shift Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Shift Type *</label>
              <select
                {...register('shift_type')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white"
              >
                <option value="day">Day</option>
                <option value="night">Night</option>
                <option value="rotating">Rotating</option>
              </select>
            </div>

            {/* Hire Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Hire Date *</label>
              <input
                {...register('hire_date')}
                type="date"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-slate-900 border text-white',
                  errors.hire_date ? 'border-red-500' : 'border-slate-600'
                )}
              />
              {errors.hire_date && <p className="mt-1 text-sm text-red-400">{errors.hire_date.message}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Status *</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">Skills</label>
              <button type="button" onClick={addSkill} className="text-sm text-brand-400 hover:text-brand-300">+ Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-brand-600/20 text-brand-300 rounded-full text-sm flex items-center gap-1">
                  {skill}
                  <button type="button" onClick={() => removeSkill(index)} className="hover:text-brand-400">×</button>
                </span>
              ))}
              {skills.length === 0 && <span className="text-sm text-slate-500">No skills added</span>}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">Certifications</label>
              <button type="button" onClick={addCertification} className="text-sm text-brand-400 hover:text-brand-300">+ Add</button>
            </div>
            <div className="space-y-2">
              {certifications.map((cert, index) => (
                <div key={cert.id} className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-white">{cert.name}</p>
                      <p className="text-xs text-slate-400">{cert.issuer} • {cert.issued_date}{cert.expiry_date ? ` → ${cert.expiry_date}` : ''}</p>
                    </div>
                    <button type="button" onClick={() => removeCertification(index)} className="text-slate-400 hover:text-red-400">×</button>
                  </div>
                </div>
              ))}
              {certifications.length === 0 && <span className="text-sm text-slate-500">No certifications added</span>}
            </div>
          </div>

          {/* Actions */}
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