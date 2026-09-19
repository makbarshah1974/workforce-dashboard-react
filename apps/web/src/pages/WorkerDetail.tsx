import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Worker } from '@shared';
import { formatDate, formatRelative } from '../utils/date';
import { cn } from '../utils/cn';
import { Loader2, ArrowLeft, User, Mail, Phone, Calendar, Shield, Award, Wrench } from 'lucide-react';

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const res = await api.get<{ data: Worker }>(`/api/workers/${id}`);
        setWorker(res.data);
      } catch (err) {
        setError('Failed to load worker');
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
  }

  if (error || !worker) {
    return <div className="text-center py-12 text-red-400">Worker not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/workers" className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{worker.full_name}</h1>
          <p className="text-slate-400">{worker.employee_id} • {worker.department}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><User className="h-5 w-5" /> Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><dt className="text-sm text-slate-400">Employee ID</dt><dd className="text-white font-mono">{worker.employee_id}</dd></div>
              <div><dt className="text-sm text-slate-400">Email</dt><dd className="text-white"><a href={`mailto:${worker.email}`} className="text-brand-400 hover:underline">{worker.email}</a></dd></div>
              <div><dt className="text-sm text-slate-400">Phone</dt><dd className="text-white">{worker.phone || '-'}</dd></div>
              <div><dt className="text-sm text-slate-400">Department</dt><dd className="text-white">{worker.department}</dd></div>
              <div><dt className="text-sm text-slate-400">Role</dt><dd className="text-white">{worker.role}</dd></div>
              <div><dt className="text-sm text-slate-400">Shift Type</dt><dd className="text-white capitalize">{worker.shift_type}</dd></div>
              <div><dt className="text-sm text-slate-400">Hire Date</dt><dd className="text-white">{formatDate(worker.hire_date)}</dd></div>
              <div><dt className="text-sm text-slate-400">Status</dt><dd className="text-white">
                <span className={cn('inline-flex px-2 py-1 rounded-full text-xs font-medium',
                  worker.status === 'active' && 'bg-green-500/10 text-green-400',
                  worker.status === 'inactive' && 'bg-slate-500/10 text-slate-400',
                  worker.status === 'on_leave' && 'bg-yellow-500/10 text-yellow-400')}>
                  {worker.status.replace('_', ' ')}
                </span>
              </dd></div>
              <div className="sm:col-span-2"><dt className="text-sm text-slate-400">Created</dt><dd className="text-white">{formatRelative(worker.created_at)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-sm text-slate-400">Updated</dt><dd className="text-white">{formatRelative(worker.updated_at)}</dd></div>
            </dl>
          </div>

          {worker.skills.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Wrench className="h-5 w-5" /> Skills</h2>
              <div className="flex flex-wrap gap-2">
                {worker.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-brand-600/20 text-brand-300 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {worker.certifications.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Award className="h-5 w-5" /> Certifications</h2>
              <div className="space-y-3">
                {worker.certifications.map((cert, i) => (
                  <div key={i} className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <p className="font-medium text-white">{cert.name}</p>
                    <p className="text-sm text-slate-400">{cert.issuer} • {formatDate(cert.issued_date)}{cert.expiry_date ? ` → ${formatDate(cert.expiry_date)}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
            <div className="h-24 w-24 rounded-full bg-brand-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
              {worker.full_name.charAt(0)}
            </div>
            <h3 className="text-xl font-semibold text-white">{worker.full_name}</h3>
            <p className="text-brand-400 mt-1">@{worker.employee_id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}