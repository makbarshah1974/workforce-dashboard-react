import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { formatDate, formatDateTime } from '../utils/date';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { Shift, ShiftAssignment, PaginatedResponse, Worker } from '../../../../packages/shared/src';
import ShiftModal from '../components/ShiftModal';
import ShiftAssignmentModal from '../components/ShiftAssignmentModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<'shifts' | 'assignments'>('shifts');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'shift' | 'assignment'; item: Shift | ShiftAssignment } | null>(null);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search) params.set('search', search);

      const res = await api.get<PaginatedResponse<Shift>>(`/api/shifts?${params}`);
      setShifts(res.data);
      setTotal(res.total);
    } catch (error) {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (workerFilter) params.set('worker_id', workerFilter);
      if (shiftFilter) params.set('shift_id', shiftFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get<PaginatedResponse<ShiftAssignment>>(`/api/shifts/assignments?${params}`);
      setAssignments(res.data);
      setTotal(res.total);
    } catch (error) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get<{ data: Worker[] }>('/api/workers?page_size=200&status=active');
      setWorkers(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (activeTab === 'shifts') fetchShifts();
    else fetchAssignments();
  }, [activeTab, page, pageSize, search, dateFrom, dateTo, workerFilter, shiftFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'shift') {
        await api.delete(`/api/shifts/${deleteConfirm.item.id}`);
        toast.success('Shift deleted');
        fetchShifts();
      } else {
        await api.delete(`/api/shifts/assignments/${deleteConfirm.item.id}`);
        toast.success('Assignment deleted');
        fetchAssignments();
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
    setDeleteConfirm(null);
  };

  if (activeTab === 'shifts') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Shifts</h1>
            <p className="text-slate-400">Manage shift schedules</p>
          </div>
          <button
            onClick={() => { setEditingShift(null); setShiftModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Shift
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search shifts..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead className="bg-slate-900/50">
                    <tr>
                      {[
                        { key: 'name', label: 'Name' },
                        { key: 'start_time', label: 'Start' },
                        { key: 'end_time', label: 'End' },
                        { key: 'days', label: 'Days' },
                        { key: 'is_active', label: 'Status' },
                        { key: 'actions', label: '' },
                      ].map(col => (
                        <th key={col.key} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {shifts.map(shift => (
                      <tr key={shift.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{shift.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{shift.start_time.slice(0,5)}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{shift.end_time.slice(0,5)}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {shift.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                            shift.is_active ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'
                          )}>
                            {shift.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingShift(shift); setShiftModalOpen(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteConfirm({ type: 'shift', item: shift })} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total > pageSize && (
                <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                  <p className="text-sm text-slate-400">Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                    <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="p-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <ShiftModal isOpen={shiftModalOpen} onClose={() => { setShiftModalOpen(false); setEditingShift(null); }} onSuccess={fetchShifts} initialData={editingShift} />
        <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete} title="Delete Shift" message={`Delete ${(deleteConfirm?.item as { name?: string })?.name || 'Shift'}?`} variant="destructive" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Assignments</h1>
          <p className="text-slate-400">Manage worker shift assignments</p>
        </div>
        <button
          onClick={() => { setEditingAssignment(null); setAssignmentModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Assign Worker
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
          <select value={workerFilter} onChange={e => { setWorkerFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
            <option value="">All Workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
          </select>
          <select value={shiftFilter} onChange={e => { setShiftFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
            <option value="">All Shifts</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead className="bg-slate-900/50">
                  <tr>
                    {[
                      { key: 'date', label: 'Date' },
                      { key: 'worker_name', label: 'Worker' },
                      { key: 'shift_name', label: 'Shift' },
                      { key: 'shift_start', label: 'Start' },
                      { key: 'shift_end', label: 'End' },
                      { key: 'status', label: 'Status' },
                      { key: 'actions', label: '' },
                    ].map(col => (
                      <th key={col.key} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {assignments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300">{formatDate(a.date)}</td>
                      <td className="px-4 py-3 font-medium text-white">{a.worker_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{a.shift_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{a.shift_start?.slice(0,5)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{a.shift_end?.slice(0,5)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex px-2 py-1 rounded-full text-xs font-medium',
                          a.status === 'completed' && 'bg-green-500/10 text-green-400',
                          a.status === 'scheduled' && 'bg-blue-500/10 text-blue-400',
                          a.status === 'absent' && 'bg-red-500/10 text-red-400',
                          a.status === 'late' && 'bg-yellow-500/10 text-yellow-400'
                        )}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingAssignment(a); setAssignmentModalOpen(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteConfirm({ type: 'assignment', item: a })} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > pageSize && (
              <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                <p className="text-sm text-slate-400">Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="p-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ShiftAssignmentModal isOpen={assignmentModalOpen} onClose={() => { setAssignmentModalOpen(false); setEditingAssignment(null); }} onSuccess={() => { fetchAssignments(); fetchShifts(); }} initialData={editingAssignment} workers={workers} shifts={shifts} />
      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete} title="Delete Assignment" message="Delete this assignment?" variant="destructive" />
    </div>
  );
}


