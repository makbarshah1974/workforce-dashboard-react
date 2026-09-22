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
  Play,
  Square,
  Clock,
  Download,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { ProductionRun, PaginatedResponse, Machine, Product, Group } from '../../../../packages/shared/src';
import RunModal from '../components/RunModal';
import ConfirmDialog from '../components/ConfirmDialog';

const statusColors = {
  running: 'bg-green-500/10 text-green-400 border-green-500/20',
  stopped: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function ProductionRuns() {
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [machineStatusFilter, setMachineStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<ProductionRun | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ProductionRun | null>(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (machineFilter) params.set('machine_id', machineFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (machineStatusFilter) params.set('machine_status', machineStatusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (shiftFilter) params.set('shift', shiftFilter);

      const res = await api.get<PaginatedResponse<ProductionRun>>(`/api/runs?${params}`);
      setRuns(res.data);
      setTotal(res.total);
    } catch (error) {
      toast.error('Failed to load production runs');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [m, p, g] = await Promise.all([
        api.get<{ data: Machine[] }>('/api/machines?page_size=200'),
        api.get<{ data: Product[] }>('/api/products'),
        api.get<{ data: Group[] }>('/api/groups'),
      ]);
      setMachines(m.data);
      setProducts(p.data);
      setGroups(g.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [page, pageSize, machineFilter, statusFilter, machineStatusFilter, dateFrom, dateTo, shiftFilter]);

  const handleStartRun = async (machineId: string) => {
    try {
      const res = await api.post('/api/run/start', { machine_id: parseInt(machineId) });
      toast.success('Run started');
      fetchRuns();
    } catch (error) {
      toast.error('Failed to start run');
    }
  };

  const handleStopRun = async (run: ProductionRun) => {
    try {
      await api.post(`/api/run/stop/${run.id}`);
      toast.success('Run stopped');
      fetchRuns();
    } catch (error) {
      toast.error('Failed to stop run');
    }
  };

  const handleEdit = (run: ProductionRun) => {
    setEditingRun(run);
    setModalOpen(true);
  };

  const handleDelete = async (run: ProductionRun) => {
    try {
      await api.delete(`/api/run/${run.id}`);
      toast.success('Run deleted');
      fetchRuns();
    } catch (error) {
      toast.error('Failed to delete run');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingRun(null);
  };

  const handleModalSuccess = () => {
    fetchRuns();
    handleModalClose();
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (machineFilter) params.set('machine_id', machineFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (machineStatusFilter) params.set('machine_status', machineStatusFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (shiftFilter) params.set('shift', shiftFilter);

      const res = await fetch(`/api/runs/export?${params}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'production_runs.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Production Runs</h1>
          <p className="text-slate-400">Track machine production sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search runs..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <select value={machineFilter} onChange={e => { setMachineFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
            <option value="">All Machines</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
            <option value="">All Status</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
          <select value={machineStatusFilter} onChange={e => { setMachineStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
            <option value="">Machine Status</option>
            <option value="running">Running</option>
            <option value="idle">Idle</option>
            <option value="out_of_order">Break Down</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
          <select value={shiftFilter} onChange={e => { setShiftFilter(e.target.value); setPage(1); }} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
            <option value="">All Shifts</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
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
                      { key: 'started_at', label: 'Started' },
                      { key: 'stopped_at', label: 'Stopped' },
                      { key: 'run_time', label: 'Run Time' },
                      { key: 'machine_name', label: 'Machine' },
                      { key: 'group_name', label: 'Group' },
                      { key: 'product_name', label: 'Product' },
                      { key: 'item_name', label: 'Item' },
                      { key: 'item_code', label: 'Code' },
                      { key: 'operator', label: 'Operator' },
                      { key: 'status', label: 'Status' },
                      { key: 'actions', label: '' },
                    ].map(col => (
                      <th key={col.key} scope="col" className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {runs.map(run => (
                    <tr key={run.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-3 py-3 text-sm text-slate-300">{formatDateTime(run.started_at)}</td>
                      <td className="px-3 py-3 text-sm text-slate-300">{run.stopped_at ? formatDateTime(run.stopped_at) : <span className="text-green-400">Running</span>}</td>
                      <td className="px-3 py-3 font-mono text-white">{formatDuration(run.run_seconds || 0)}</td>
                      <td className="px-3 py-3 text-sm text-slate-300">{run.machine_name}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden lg:table-cell">{run.group_name || '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden lg:table-cell">{run.product_name || '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden md:table-cell">{run.item_name || '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden lg:table-cell">{run.item_code || '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-300 hidden lg:table-cell">{run.operator}</td>
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', statusColors[run.status as keyof typeof statusColors])}>
                          {run.status === 'running' ? <Play className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                          {run.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {run.status === 'running' && (
                            <button onClick={() => handleStopRun(run)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors" aria-label="Stop run">
                              <Square className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => handleEdit(run)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(run)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors">
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

      <RunModal isOpen={modalOpen} onClose={handleModalClose} onSuccess={handleModalSuccess} initialData={editingRun} machines={machines} products={products} groups={groups} />
      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => { handleDelete(deleteConfirm!); setDeleteConfirm(null); }} title="Delete Run" message="Delete this production run?" variant="destructive" />
    </div>
  );
}


