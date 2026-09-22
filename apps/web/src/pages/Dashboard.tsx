import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatNumber, formatDate } from '../utils/date';
import { cn } from '../utils/cn';
import {
  Users,
  Factory,
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Stats {
  totalWorkers: number;
  activeWorkers: number;
  totalMachines: number;
  operationalMachines: number;
  todayProduction: number;
  todayTarget: number;
  todayEfficiency: number;
  qualityRate: number;
  recentAlerts: Alert[];
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  time: string;
}

interface ProductionTrend {
  date: string;
  quantity: number;
  target: number;
}

interface MachineStatus {
  status: string;
  count: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [productionTrend, setProductionTrend] = useState<ProductionTrend[]>([]);
  const [machineStatus, setMachineStatus] = useState<MachineStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, trendRes, machineRes] = await Promise.all([
        api.get<{ data: Stats }>('/api/dashboard/stats'),
        api.get<{ data: ProductionTrend[] }>('/api/dashboard/production-trend?days=7'),
        api.get<{ data: MachineStatus[] }>('/api/dashboard/machine-status'),
      ]);
      setStats(statsRes.data);
      setProductionTrend(trendRes.data);
      setMachineStatus(machineRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p>{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Workers',
      value: stats?.totalWorkers || 0,
      subtitle: `${stats?.activeWorkers || 0} active`,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Machines',
      value: stats?.totalMachines || 0,
      subtitle: `${stats?.operationalMachines || 0} operational`,
      icon: Factory,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Today Production',
      value: formatNumber(stats?.todayProduction || 0),
      subtitle: `Target: ${formatNumber(stats?.todayTarget || 0)}`,
      icon: Package,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Efficiency',
      value: `${stats?.todayEfficiency || 0}%`,
      subtitle: `Quality: ${stats?.qualityRate || 0}%`,
      icon: TrendingUp,
      color: stats && stats.todayEfficiency >= 90 ? 'text-green-400' : stats && stats.todayEfficiency >= 70 ? 'text-yellow-400' : 'text-red-400',
      bgColor: stats && stats.todayEfficiency >= 90 ? 'bg-green-500/10' : stats && stats.todayEfficiency >= 70 ? 'bg-yellow-500/10' : 'bg-red-500/10',
    },
  ];

  const productionChartData = {
    labels: productionTrend.map(d => format(new Date(d.date), 'EEE')),
    datasets: [
      {
        label: 'Actual',
        data: productionTrend.map(d => d.quantity),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Target',
        data: productionTrend.map(d => d.target),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderDash: [5, 5],
      },
    ],
  };

  const machineStatusData = {
    labels: machineStatus.map(m => m.status),
    datasets: [{
      data: machineStatus.map(m => m.count),
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(99, 102, 241, 0.8)',
      ],
      borderWidth: 0,
    }],
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Overview of today's production metrics</p>
        </div>
        <div className="text-sm text-slate-400">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{card.title}</p>
                <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
                <p className="text-sm text-slate-500 mt-1">{card.subtitle}</p>
              </div>
              <div className={cn('p-3 rounded-xl', card.bgColor)}>
                <card.icon className={cn('h-6 w-6', card.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Trend */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Production Trend (7 Days)</h2>
          <div className="h-72">
            <Line
              data={productionChartData as ChartData<'line'>}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, labels: { color: '#94a3b8', usePointStyle: true } },
                },
                scales: {
                  x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#64748b' } },
                  y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#64748b' } },
                },
                interaction: { intersect: false, mode: 'index' },
              }}
            />
          </div>
        </div>

        {/* Machine Status */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Machine Status</h2>
          <div className="h-72 flex items-center justify-center">
            <Doughnut
              data={machineStatusData as ChartData<'doughnut'>}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right', labels: { color: '#94a3b8', usePointStyle: true, padding: 20 } },
                },
                cutout: '60%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Alerts</h2>
        {stats?.recentAlerts && stats.recentAlerts.length > 0 ? (
          <div className="space-y-3">
            {stats.recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border',
                  alert.type === 'error' && 'border-red-500/30 bg-red-500/5',
                  alert.type === 'warning' && 'border-yellow-500/30 bg-yellow-500/5',
                  alert.type === 'info' && 'border-blue-500/30 bg-blue-500/5'
                )}
              >
                {alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />}
                {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />}
                {alert.type === 'info' && <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-white">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No recent alerts</p>
        )}
      </div>
    </div>
  );
}