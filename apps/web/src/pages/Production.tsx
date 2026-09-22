import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { formatDateTime, formatDuration } from '../utils/date';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { ProductionRecord, PaginatedResponse, Machine, Worker, Shift } from '../../../../packages/shared/src';
import ProductionModal from '../components/ProductionModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Production() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('start_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ProductionRecord | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (machineFilter) params.set('machine_id', machineFilter);
      if (workerFilter) params.set('worker_id', workerFilter);
      if (shiftFilter) params.set('shift_id', shiftFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await api.get<PaginatedResponse<ProductionRecord>>(`/api/production?${params}`);
      setRecords(res.data);
      setTotal(res.total);
    } catch (error) {
      toast.error('Failed to load production records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [m, w, s] = await Promise.all([
        api.get<{ data: Machine[] }>('/api/machines?page_size=100'),
        api.get<{ data: Worker[] }>('/api/workers?page_size=100&status=active'),
        api.get<{ data: Shift[] }>('/api/shifts?page_size=100&is_active=true'),
      ]);
      setMachines(m.data);
      setWorkers(w.data);
      setShifts(s.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchDropdowns();
  }, [page, pageSize, search, machineFilter, workerFilter, shiftFilter, dateFrom, dateTo, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleEdit = (record: ProductionRecord) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const handleDelete = async (record: ProductionRecord) => {
    try {
      await api.delete(`/api/production/${record.id}`);
      toast.success('Record deleted');
      fetchRecords();
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingRecord(null);
  };

  const handleModalSuccess = () => {
    fetchRecords();
    handleModalClose();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Production</h1>
          <p className="text-slate-400">Track production output</p>
        </div>
        <button
          onClick={() => { setEditingRecord(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Record
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <select
            value={machineFilter}
            onChange={e => { setMachineFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.machine_code})</option>)}
          </select>
          <select
            value={workerFilter}
            onChange={e => { setWorkerFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.employee_id})</option>)}
          </select>
          <select
            value={shiftFilter}
            onChange={e => { setShiftFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Shifts</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="To date"
          />
        </div>
      </div>

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
                      { key: 'product_name', label: 'Product' },
                      { key: 'machine_name', label: 'Machine' },
                      { key: 'worker_name', label: 'Worker' },
                      { key: 'shift_name', label: 'Shift' },
                      { key: 'quantity', label: 'Qty' },
                      { key: 'target_quantity', label: 'Target' },
                      { key: 'quality_pass', label: 'Pass' },
                      { key: 'quality_fail', label: 'Fail' },
                      { key: 'start_time', label: 'Start' },
                      { key: 'end_time', label: 'End' },
                      { key: 'downtime_minutes', label: 'Downtime' },
                      { key: 'actions', label: '' },
                    ].map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        className={cn(
                          'px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider',
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
                  {records.map(record => (
                    <tr key={record.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-3 py-3 font-medium text-white">{record.product_name}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden md:table-cell">{record.machine_name || '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden lg:table-cell">{record.worker_name || '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden lg:table-cell">{record.shift_name || '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-300">{record.quantity}</td>
                      <td className="px-3 py-3 text-sm text-slate-300">{record.target_quantity}</td>
                      <td className="px-3 py-3 text-sm text-green-400">{record.quality_pass}</td>
                      <td className="px-3 py-3 text-sm text-red-400">{record.quality_fail}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden md:table-cell">{formatDateTime(record.start_time)}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden md:table-cell">{formatDateTime(record.end_time)}</td>
                      <td className="px-3 py-3 text-sm text-slate-300">{record.downtime_minutes > 0 ? formatDuration(record.downtime_minutes) : '-'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(record)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
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
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= total}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ProductionModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        initialData={editingRecord}
        machines={machines}
        workers={workers}
        shifts={shifts}
      />
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { handleDelete(deleteConfirm!); setDeleteConfirm(null); }}
        title="Delete Production Record"
        message={`Are you sure you want to delete this production record? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}


