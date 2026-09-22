import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Machine } from '../../../../packages/shared/src';
import { formatDateTime } from '../utils/date';
import { cn } from '../utils/cn';
import { Loader2, ArrowLeft, Factory, Zap, Wrench, Monitor, AlertTriangle, MapPin, Tag, Clock } from 'lucide-react';

const statusIcons = {
  operational: Zap,
  maintenance: Wrench,
  offline: Monitor,
  error: AlertTriangle,
};

const statusColors = {
  operational: 'bg-green-500/10 text-green-400 border-green-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  offline: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMachine = async () => {
      try {
        const res = await api.get<{ data: Machine }>(`/api/machines/${id}`);
        setMachine(res.data);
      } catch (err) {
        setError('Failed to load machine');
      } finally {
        setLoading(false);
      }
    };
    fetchMachine();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
  }

  if (error || !machine) {
    return <div className="text-center py-12 text-red-400">Machine not found</div>;
  }

  const Icon = statusIcons[machine.status as keyof typeof statusIcons] || Factory;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/machines" className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{machine.name}</h1>
          <p className="text-slate-400">{machine.machine_code} • {machine.type}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Status</h2>
              <span className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium', statusColors[machine.status as keyof typeof statusColors])}>
                <Icon className="h-4 w-4" />
                {machine.status}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><dt className="text-sm text-slate-400">Machine Code</dt><dd className="text-white font-mono">{machine.machine_code}</dd></div>
              <div><dt className="text-sm text-slate-400">Type</dt><dd className="text-white">{machine.type}</dd></div>
              <div><dt className="text-sm text-slate-400">Manufacturer</dt><dd className="text-white">{machine.manufacturer || '-'}</dd></div>
              <div><dt className="text-sm text-slate-400">Model</dt><dd className="text-white">{machine.model || '-'}</dd></div>
              <div><dt className="text-sm text-slate-400">Serial Number</dt><dd className="text-white font-mono">{machine.serial_number || '-'}</dd></div>
              <div><dt className="text-sm text-slate-400">Location</dt><dd className="text-white flex items-center gap-1"><MapPin className="h-4 w-4" />{machine.location || '-'}</dd></div>
              <div><dt className="text-sm text-slate-400">Day Shift Hours</dt><dd className="text-white flex items-center gap-1"><Clock className="h-4 w-4" />{machine.day_hours || 11}h</dd></div>
              <div><dt className="text-sm text-slate-400">Night Shift Hours</dt><dd className="text-white flex items-center gap-1"><Clock className="h-4 w-4" />{machine.night_hours || 11}h</dd></div>
              <div className="sm:col-span-2"><dt className="text-sm text-slate-400">Notes</dt><dd className="text-white">{machine.notes || '-'}</dd></div>
            </dl>
          </div>

          {Object.keys(machine.specifications || {}).length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Tag className="h-5 w-5" /> Specifications</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(machine.specifications || {}).map(([key, value]) => (
                  <div key={key}><dt className="text-sm text-slate-400 font-mono">{key}</dt><dd className="text-white">{String(value)}</dd></div>
                ))}
              </dl>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Maintenance</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><dt className="text-sm text-slate-400">Last Maintenance</dt><dd className="text-white">{machine.last_maintenance ? formatDateTime(machine.last_maintenance) : 'Never'}</dd></div>
              <div><dt className="text-sm text-slate-400">Next Maintenance</dt><dd className="text-white">{machine.next_maintenance ? formatDateTime(machine.next_maintenance) : 'Not scheduled'}</dd></div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
            <div className="h-24 w-24 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-4">
              <Factory className="h-12 w-12 text-brand-500" />
            </div>
            <h3 className="text-xl font-semibold text-white">{machine.name}</h3>
            <p className="text-brand-400 mt-1">{machine.machine_code}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


