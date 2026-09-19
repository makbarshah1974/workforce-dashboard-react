import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { formatRelative } from '../utils/date';
import {
  Loader2,
  Bell,
  Check,
  X,
  Mail,
  BellRing,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Notification, PaginatedResponse } from '@shared';
import ConfirmDialog from '../components/ConfirmDialog';

const typeIcons = {
  info: Bell,
  warning: BellRing,
  error: X,
  success: Check,
};

const typeColors = {
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Notification | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        unread_only: unreadOnly.toString(),
      });
      const res = await api.get<PaginatedResponse<Notification>>(`/api/notifications?${params}`);
      setNotifications(res.data);
      setTotal(res.total);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get<{ count: number }>('/api/notifications/unread-count');
      setUnreadCount(res.count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [page, pageSize, unreadOnly]);

  const handleMarkRead = async (notification: Notification) => {
    try {
      await api.patch(`/api/notifications/${notification.id}/read`);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notification: Notification) => {
    try {
      await api.delete(`/api/notifications/${notification.id}`);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      if (!notification.read) setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-slate-400">Stay updated with important alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={e => { setUnreadOnly(e.target.checked); setPage(1); }}
              className="w-4 h-4 rounded border-slate-600 text-brand-600 focus:ring-brand-500 bg-slate-900"
            />
            Unread only
          </label>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" /></div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No notifications yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-700">
              {notifications.map(notification => {
                const Icon = typeIcons[notification.type] || Bell;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 hover:bg-slate-700/50 transition-colors flex items-start gap-3',
                      !notification.read && 'bg-slate-700/30'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg flex-shrink-0', typeColors[notification.type])}>
                      {(() => {
                        const IconComp = typeIcons[notification.type] || Bell;
                        return React.createElement(IconComp, { className: "h-5 w-5" });
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {notification.action_url ? (
                        <a href={notification.action_url} className="block">
                          <p className={cn('font-medium', !notification.read ? 'text-white' : 'text-slate-300')}>
                            {notification.title}
                          </p>
                        </a>
                      ) : (
                        <p className={cn('font-medium', !notification.read ? 'text-white' : 'text-slate-300')}>
                          {notification.title}
                        </p>
                      )}
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-slate-500 mt-2">{formatRelative(notification.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkRead(notification)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-green-400"
                          aria-label="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(notification)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-red-400"
                        aria-label="Delete"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
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

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => { handleDelete(deleteConfirm!); setDeleteConfirm(null); }} title="Delete Notification" message="Delete this notification?" variant="destructive" />
    </div>
  );
}