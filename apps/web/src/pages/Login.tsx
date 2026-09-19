import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Factory, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.username, data.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-600 mb-4">
            <Factory className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Metex Production</h1>
          <p className="text-slate-400 mt-2">Workforce & Machine Dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  {...register('username')}
                  id="username"
                  type="text"
                  autoComplete="username"
                  className={cn(
                    'w-full px-4 py-3 rounded-lg bg-slate-900 border text-white placeholder-slate-500 transition-colors',
                    errors.username
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-600 focus:ring-brand-500'
                  )}
                  placeholder="Enter your username"
                  disabled={isSubmitting || authLoading}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
              </div>
              {errors.username && (
                <p id="username-error" className="mt-1.5 text-sm text-red-400" role="alert">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn(
                    'w-full px-4 py-3 rounded-lg bg-slate-900 border text-white placeholder-slate-500 transition-colors pr-12',
                    errors.password
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-600 focus:ring-brand-500'
                  )}
                  placeholder="Enter your password"
                  disabled={isSubmitting || authLoading}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-sm text-red-400" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className={cn(
                'w-full py-3 px-4 rounded-lg font-medium text-white transition-colors',
                'bg-brand-600 hover:bg-brand-700 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting || authLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              Demo credentials: <code className="text-slate-300">admin</code> / <code className="text-slate-300">admin123</code>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          © 2024 Metex Production. All rights reserved.
        </p>
      </div>
    </div>
  );
}