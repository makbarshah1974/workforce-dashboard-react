import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';
import { User, Bell, Moon, Sun, Monitor, Globe, Clock, Save, Loader2 } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  avatar_url: z.string().url().optional().or(z.literal('')),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

const preferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  notifications_enabled: z.boolean(),
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  language: z.string(),
  timezone: z.string(),
  date_format: z.string(),
  time_format: z.enum(['12h', '24h']),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type PreferencesForm = z.infer<typeof preferencesSchema>;

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
];

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences'>('profile');
  const [saving, setSaving] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: '', email: '', avatar_url: '' },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  const {
    register: registerPrefs,
    handleSubmit: handleSubmitPrefs,
    formState: { errors: prefsErrors },
  } = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      theme: 'system',
      notifications_enabled: true,
      email_notifications: true,
      push_notifications: true,
      language: 'en',
      timezone: 'Asia/Kolkata',
      date_format: 'DD MMM YYYY',
      time_format: '24h',
    },
  });

  useEffect(() => {
    if (user) {
      resetProfile({ full_name: user.full_name, email: user.email, avatar_url: user.avatar_url || '' });
    }
  }, [user, resetProfile]);

  const handleProfileSubmit = async (data: ProfileForm) => {
    try {
      setSaving(true);
      await api.patch('/api/settings/profile', data);
      toast.success('Profile updated');
      await refreshUser();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    try {
      setSaving(true);
      await api.patch('/api/settings/password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success('Password updated');
      resetPassword();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handlePrefsSubmit = async (data: PreferencesForm) => {
    try {
      setSaving(true);
      await api.patch('/api/settings/preferences', data);
      if (data.theme !== theme) setTheme(data.theme);
      toast.success('Preferences saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-1">
        <div className="flex" role="tablist">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'password', label: 'Password', icon: Save },
            { id: 'preferences', label: 'Preferences', icon: Bell },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSubmitProfile(handleProfileSubmit)} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Profile Information</h2>

          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Avatar URL</label>
              <input
                {...registerProfile('avatar_url')}
                className="w-full max-w-md px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500"
                placeholder="https://example.com/avatar.png"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
              <input
                {...registerProfile('full_name')}
                className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', profileErrors.full_name ? 'border-red-500' : 'border-slate-600')}
              />
              {profileErrors.full_name && <p className="mt-1 text-sm text-red-400">{profileErrors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
              <input
                {...registerProfile('email')}
                type="email"
                className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', profileErrors.email ? 'border-red-500' : 'border-slate-600')}
              />
              {profileErrors.email && <p className="mt-1 text-sm text-red-400">{profileErrors.email.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
            <input
              value={user?.role || ''}
              disabled
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-400"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-700">
            <button type="submit" disabled={saving} className={cn('px-6 py-2 rounded-lg font-medium text-white', 'bg-brand-600 hover:bg-brand-700', 'disabled:opacity-50')}>
              {saving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Changes</span>}
            </button>
          </div>
        </form>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handleSubmitPassword(handlePasswordSubmit)} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Change Password</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Current Password *</label>
              <input
                {...registerPassword('current_password')}
                type="password"
                className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', passwordErrors.current_password ? 'border-red-500' : 'border-slate-600')}
              />
              {passwordErrors.current_password && <p className="mt-1 text-sm text-red-400">{passwordErrors.current_password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Password *</label>
              <input
                {...registerPassword('new_password')}
                type="password"
                className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', passwordErrors.new_password ? 'border-red-500' : 'border-slate-600')}
              />
              {passwordErrors.new_password && <p className="mt-1 text-sm text-red-400">{passwordErrors.new_password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password *</label>
              <input
                {...registerPassword('confirm_password')}
                type="password"
                className={cn('w-full px-3 py-2 rounded-lg bg-slate-900 border text-white', passwordErrors.confirm_password ? 'border-red-500' : 'border-slate-600')}
              />
              {passwordErrors.confirm_password && <p className="mt-1 text-sm text-red-400">{passwordErrors.confirm_password.message}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-700">
            <button type="submit" disabled={saving} className={cn('px-6 py-2 rounded-lg font-medium text-white', 'bg-brand-600 hover:bg-brand-700', 'disabled:opacity-50')}>
              {saving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Updating...</span> : 'Update Password'}
            </button>
          </div>
        </form>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSubmitPrefs(handlePrefsSubmit)} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Preferences</h2>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(option => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                  <button
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all',
                      isActive
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    )}
                  >
                    <Icon className={cn('h-6 w-6', isActive ? 'text-brand-400' : 'text-slate-400')} />
                    <span className={cn('font-medium', isActive ? 'text-white' : 'text-slate-300')}>
                      {option.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {option.value === 'system' ? `(${resolvedTheme})` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications */}
          <div className="border-t border-slate-700 pt-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">Notifications</label>
            <div className="space-y-3">
              {[
                { key: 'notifications_enabled', label: 'Enable Notifications', desc: 'Receive in-app notifications' },
                { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive email alerts' },
                { key: 'push_notifications', label: 'Push Notifications', desc: 'Receive browser push notifications' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 cursor-pointer">
                  <input
                    {...registerPrefs(item.key as any)}
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-600 text-brand-600 focus:ring-brand-500 bg-slate-900"
                  />
                  <div>
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Regional */}
          <div className="border-t border-slate-700 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Language</label>
              <select {...registerPrefs('language')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Timezone</label>
              <select {...registerPrefs('timezone')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Date Format</label>
              <input {...registerPrefs('date_format')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Time Format</label>
              <select {...registerPrefs('time_format')} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white">
                <option value="12h">12 Hour (AM/PM)</option>
                <option value="24h">24 Hour</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-700">
            <button type="submit" disabled={saving} className={cn('px-6 py-2 rounded-lg font-medium text-white', 'bg-brand-600 hover:bg-brand-700', 'disabled:opacity-50')}>
              {saving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}