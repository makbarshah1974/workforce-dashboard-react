import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Factory,
  Package,
  Clock,
  BarChart2,
  Bell,
  HelpCircle,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  ChevronRight,
  Play,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workers', href: '/workers', icon: Users },
  { name: 'Machines', href: '/machines', icon: Factory },
  { name: 'Production', href: '/production', icon: Package },
  { name: 'Runs', href: '/runs', icon: Play },
  { name: 'Shifts', href: '/shifts', icon: Clock },
  { name: 'Reports', href: '/reports', icon: BarChart2 },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

const userNavigation = [
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700">
          <NavLink to="/dashboard" className="flex items-center gap-2 text-xl font-bold text-white">
            <Factory className="h-8 w-8 text-brand-500" />
            <span>Metex Prod</span>
          </NavLink>
          <button
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-700"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600/20 text-brand-300'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={toggleTheme}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors'
            )}
            aria-label={`Current theme: ${theme}. Click to cycle.`}
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Moon className="h-5 w-5" aria-hidden="true" />
                <span>Dark Mode</span>
              </>
            ) : theme === 'light' ? (
              <>
                <Sun className="h-5 w-5" aria-hidden="true" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Monitor className="h-5 w-5" aria-hidden="true" />
                <span>System</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 px-4 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-700"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          {/* Notifications bell */}
          <NavLink
            to="/notifications"
            className="relative p-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </NavLink>

          {/* Theme toggle (desktop) */}
          <button
            onClick={toggleTheme}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label={`Current theme: ${theme}. Click to cycle.`}
          >
            {resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            <span className="capitalize">{theme}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-medium">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white">{user?.full_name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800 border border-slate-700 shadow-lg py-1 z-50">
                {userNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </NavLink>
                ))}
                <hr className="my-1 border-slate-700" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6" id="main-content" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}