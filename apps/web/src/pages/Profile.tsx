import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { formatDate } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Loader2,
  Settings,
  Edit,
  Bell,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { User as UserType } from '@shared';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserType | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get<{ user: UserType }>('/api/auth/me');
        setUserData(res.user);
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
      </div>
    );
  }

  const u = userData || user;

  if (!u) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-slate-400">View and manage your account</p>
        </div>
        <a href="/settings" className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
          <Settings className="h-4 w-4" />
          Edit Settings
        </a>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-brand-900/50 to-brand-800/50 border-b border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-brand-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {u.full_name?.charAt(0) || 'U'}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold text-white">{u.full_name}</h2>
              <p className="text-brand-300 mt-1">@{u.username}</p>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
                  u.role === 'admin' && 'bg-purple-500/20 text-purple-400',
                  u.role === 'manager' && 'bg-blue-500/20 text-blue-400',
                  u.role === 'operator' && 'bg-green-500/20 text-green-400'
                )}>
                  <Shield className="h-3 w-3" />
                  {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
                <Mail className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-white">{u.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-500">User ID</p>
                <p className="text-sm font-mono text-white">{u.id}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-500">Member Since</p>
                <p className="text-sm text-white">{formatDate(u.created_at)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-500">Last Login</p>
                <p className="text-sm text-white">{u.last_login ? formatDate(u.last_login) : 'Never'}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <p className="text-xs text-slate-500">Status</p>
                <p className="text-sm text-green-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  Active
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a href="/settings?tab=profile" className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-brand-500 transition-colors text-center">
                <Edit className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Edit Profile</p>
                <p className="text-xs text-slate-500">Update name, email, avatar</p>
              </a>
              <a href="/settings?tab=password" className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-brand-500 transition-colors text-center">
                <Shield className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Change Password</p>
                <p className="text-xs text-slate-500">Update your password</p>
              </a>
              <a href="/settings?tab=preferences" className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-brand-500 transition-colors text-center">
                <div className="h-6 w-6 flex items-center justify-center mx-auto mb-2">
                  {u.theme === 'dark' ? <Moon className="h-5 w-5 text-slate-400" /> : u.theme === 'light' ? <Sun className="h-5 w-5 text-slate-400" /> : <Monitor className="h-5 w-5 text-slate-400" />}
                </div>
                <p className="text-sm font-medium text-white">Preferences</p>
                <p className="text-xs text-slate-500">Theme, notifications, locale</p>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Account Activity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-slate-900/50">
            <p className="text-3xl font-bold text-brand-400">—</p>
            <p className="text-sm text-slate-400">Production Records</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-900/50">
            <p className="text-3xl font-bold text-green-400">—</p>
            <p className="text-sm text-slate-400">Shift Assignments</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-900/50">
            <p className="text-3xl font-bold text-purple-400">—</p>
            <p className="text-sm text-slate-400">Reports Generated</p>
          </div>
        </div>
      </div>
    </div>
  );
}