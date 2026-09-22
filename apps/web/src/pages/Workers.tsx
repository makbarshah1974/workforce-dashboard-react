import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Worker, PaginatedResponse } from '../../../../packages/shared/src';
import WorkerModal from '../components/WorkerModal';
import ConfirmDialog from '../components/ConfirmDialog';

const statusColors = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  on_leave: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [departments, setDepartments] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Worker | null>(null);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (departmentFilter) params.set('department', departmentFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (shiftFilter) params.set('shift_type', shiftFilter);

      const res = await api.get<PaginatedResponse<Worker>>(`/api/workers?${params}`);
      setWorkers(res.data);
      setTotal(res.total);
    } catch (error) {
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get<{ data: string[] }>('/api/workers/departments/list');
      setDepartments(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchDepartments();
  }, [page, pageSize, search, departmentFilter, statusFilter, shiftFilter, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setModalOpen(true);
  };

  const handleDelete = async (worker: Worker) => {
    try {
      await api.delete(`/api/workers/${worker.id}`);
      toast.success('Worker deleted');
      fetchWorkers();
    } catch (error) {
      toast.error('Failed to delete worker');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingWorker(null);
  };

  const handleModalSuccess = () => {
    fetchWorkers();
    handleModalClose();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Workers</h1>
          <p className="text-slate-400">Manage workforce directory</p>
        </div>
        <button
          onClick={() => { setEditingWorker(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Worker
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search workers..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={e => { setDepartmentFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
          <select
            value={shiftFilter}
            onChange={e => { setShiftFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Shifts</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="rotating">Rotating</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead className="bg-slate-900/50">
                  <tr>
                    {[
                      { key: 'employee_id', label: 'Employee ID' },
                      { key: 'full_name', label: 'Name' },
                      { key: 'email', label: 'Email' },
                      { key: 'department', label: 'Department' },
                      { key: 'role', label: 'Role' },
                      { key: 'shift_type', label: 'Shift' },
                      { key: 'status', label: 'Status' },
                      { key: 'actions', label: '' },
                    ].map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        className={cn(
                          'px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider',
                          col.key !== 'actions' && 'cursor-pointer hover:text-white'
                        )}
                        onClick={() => col.key !== 'actions' && handleSort(col.key)}
                        style={{ width: col.key === 'actions' ? '100px' : undefined }}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortField === col.key && (
                            sortOrder === 'asc'
                              ? <ChevronUp className="h-3 w-3" />
                              : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {workers.map(worker => (
                    <tr key={worker.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{worker.employee_id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-medium">
                            {worker.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{worker.full_name}</p>
                            <p className="text-xs text-slate-400">{worker.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 hidden md:table-cell">{worker.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 hidden lg:table-cell">{worker.department}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 hidden lg:table-cell">{worker.role}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 hidden md:table-cell capitalize">{worker.shift_type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                            statusColors[worker.status as keyof typeof statusColors]
                          )}
                        >
                          {worker.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(worker)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                            aria-label={`Edit ${worker.full_name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(worker)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
                            aria-label={`Delete ${worker.full_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= total}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <WorkerModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        initialData={editingWorker}
      />
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { handleDelete(deleteConfirm!); setDeleteConfirm(null); }}
        title="Delete Worker"
        message={`Are you sure you want to delete ${deleteConfirm?.full_name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}


