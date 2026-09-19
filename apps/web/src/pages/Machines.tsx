import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Zap,
  Monitor,
  AlertTriangle,
} from 'lucide-react';
import { Machine, PaginatedResponse } from '@shared';
import MachineModal from '../components/MachineModal';
import ConfirmDialog from '../components/ConfirmDialog';

const statusColors = {
  operational: 'bg-green-500/10 text-green-400 border-green-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  offline: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const statusIcons = {
  operational: Zap,
  maintenance: Wrench,
  offline: Monitor,
  error: AlertTriangle,
};

export default function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [types, setTypes] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Machine | null>(null);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get<PaginatedResponse<Machine>>(`/api/machines?${params}`);
      setMachines(res.data);
      setTotal(res.total);
    } catch (error) {
      toast.error('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const res = await api.get<{ data: string[] }>('/api/machines/types/list');
      setTypes(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMachines();
    fetchTypes();
  }, [page, pageSize, search, typeFilter, statusFilter, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setModalOpen(true);
  };

  const handleDelete = async (machine: Machine) => {
    try {
      await api.delete(`/api/machines/${machine.id}`);
      toast.success('Machine deleted');
      fetchMachines();
    } catch (error) {
      toast.error('Failed to delete machine');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingMachine(null);
  };

  const handleModalSuccess = () => {
    fetchMachines();
    handleModalClose();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Machines</h1>
          <p className="text-slate-400">Manage machine fleet</p>
        </div>
        <button
          onClick={() => { setEditingMachine(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Machine
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search machines..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
            <option value="error">Error</option>
          </select>
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
                      { key: 'machine_code', label: 'Code' },
                      { key: 'name', label: 'Name' },
                      { key: 'type', label: 'Type' },
                      { key: 'manufacturer', label: 'Manufacturer' },
                      { key: 'location', label: 'Location' },
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
                  {machines.map(machine => (
                    <tr key={machine.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{machine.machine_code}</td>
                      <td className="px-4 py-3 font-medium text-white">{machine.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 hidden md:table-cell">{machine.type}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 hidden lg:table-cell">{machine.manufacturer || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 hidden lg:table-cell">{machine.location || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                            statusColors[machine.status as keyof typeof statusColors]
                          )}
                        >
                          {(statusIcons[machine.status as keyof typeof statusIcons] || Factory) as React.ComponentType<{ className?: string }> ? (
                            React.createElement(statusIcons[machine.status as keyof typeof statusIcons] || Factory, { className: "h-3 w-3" })
                          ) : (
                            <Factory className="h-3 w-3" />
                          )}
                          {machine.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(machine)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                            aria-label={`Edit ${machine.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(machine)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
                            aria-label={`Delete ${machine.name}`}
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

      <MachineModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        initialData={editingMachine}
      />
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { handleDelete(deleteConfirm!); setDeleteConfirm(null); }}
        title="Delete Machine"
        message={`Are you sure you want to delete ${deleteConfirm?.name} (${deleteConfirm?.machine_code})? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}