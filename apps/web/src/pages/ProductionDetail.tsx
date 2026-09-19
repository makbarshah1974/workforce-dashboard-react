import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ProductionRecord } from '@shared';
import { formatDateTime, formatDuration } from '../utils/date';
import { cn } from '../utils/cn';
import { Loader2, ArrowLeft, Package, Factory, User, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function ProductionDetail() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<ProductionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await api.get<{ data: ProductionRecord }>(`/api/production/${id}`);
        setRecord(res.data);
      } catch (err) {
        setError('Failed to load production record');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-brand-500" /></div>;
  }

  if (error || !record) {
    return <div className="text-center py-12 text-red-400">Production record not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/production" className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{record.product_name}</h1>
          <p className="text-slate-400">{record.machine_name} • {record.shift_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Package className="h-5 w-5" /> Production Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><dt className="text-sm text-slate-400">Quantity</dt><dd className="text-2xl font-bold text-white">{record.quantity}</dd></div>
              <div><dt className="text-sm text-slate-400">Target</dt><dd className="text-2xl font-bold text-brand-400">{record.target_quantity}</dd></div>
              <div><dt className="text-sm text-slate-400">Efficiency</dt><dd className="text-2xl font-bold text-green-400">
                {record.target_quantity > 0 ? `${Math.round((record.quantity / record.target_quantity) * 100)}%` : 'N/A'}
              </dd></div>
              <div><dt className="text-sm text-slate-400">Quality Pass</dt><dd className="text-white flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-400" />{record.quality_pass}</dd></div>
              <div><dt className="text-sm text-slate-400">Quality Fail</dt><dd className="text-white flex items-center gap-2"><XCircle className="h-5 w-5 text-red-400" />{record.quality_fail}</dd></div>
              <div><dt className="text-sm text-slate-400">Quality Rate</dt><dd className="text-white">
                {(record.quality_pass + record.quality_fail) > 0
                  ? `${Math.round((record.quality_pass / (record.quality_pass + record.quality_fail)) * 100)}%`
                  : 'N/A'}
              </dd></div>
              <div><dt className="text-sm text-slate-400">Start Time</dt><dd className="text-white">{formatDateTime(record.start_time)}</dd></div>
              <div><dt className="text-sm text-slate-400">End Time</dt><dd className="text-white">{formatDateTime(record.end_time)}</dd></div>
              <div><dt className="text-sm text-slate-400">Duration</dt><dd className="text-white">{formatDuration(Math.floor((new Date(record.end_time).getTime() - new Date(record.start_time).getTime()) / 60000))}</dd></div>
              <div><dt className="text-sm text-slate-400">Downtime</dt><dd className="text-white flex items-center gap-2">{record.downtime_minutes > 0 ? <AlertTriangle className="h-5 w-5 text-yellow-400" /> : <span className="h-5 w-5" />} {record.downtime_minutes > 0 ? formatDuration(record.downtime_minutes) : 'None'}</dd></div>
            </dl>
          </div>

          {record.notes && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Related</h2>
            <dl className="space-y-3">
              <div><dt className="text-sm text-slate-400">Machine</dt><dd className="text-white flex items-center gap-2"><Factory className="h-4 w-4" />{record.machine_name}</dd></div>
              <div><dt className="text-sm text-slate-400">Worker</dt><dd className="text-white flex items-center gap-2"><User className="h-4 w-4" />{record.worker_name}</dd></div>
              <div><dt className="text-sm text-slate-400">Shift</dt><dd className="text-white flex items-center gap-2"><Clock className="h-4 w-4" />{record.shift_name}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}