'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Email atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white font-sans">
      {/* Left Panel - Glowing Gradient Side */}
      <div className="hidden md:flex flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white border-r border-slate-800">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Header (Top of left panel) */}
        <div className="relative z-10 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-slate-200 tracking-wide text-sm">AsetLink</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-8 border border-indigo-400/20">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">AsetLink</h2>
          <p className="text-sm font-medium text-indigo-300 tracking-wide uppercase mb-6">Asset & Maintenance System</p>
          <p className="text-sm text-slate-400 leading-relaxed font-normal">
            Solusi terpadu untuk mengelola aset, memantau laporan kerusakan, dan koordinasi perbaikan fasilitas kampus secara mudah dan efisien.
          </p>
        </div>

        {/* Footer (Bottom of left panel) */}
        <div className="relative z-10 text-xs text-slate-500">
          ITATS Sarpras Division
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex items-center justify-center p-8 sm:p-16 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            {/* Mobile Logo Header */}
            <div className="flex items-center gap-2 mb-6 md:hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight text-xl">AsetLink</span>
            </div>
            
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Login</h1>
            <p className="text-slate-500 text-sm mt-2">
              Silakan masukkan email dan password Anda untuk melanjutkan
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                  placeholder="Masukkan email Anda"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                  placeholder="Masukkan password Anda"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/25 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-600">Ingat saya</span>
              </label>
              <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                Lupa Password?
              </a>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
            </button>
          </form>

          {/* <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <p className="text-xs text-slate-500 text-center font-medium">Demo: admin@asetlink.id / password</p>
          </div> */}

          <div className="text-center text-xs text-slate-400 pt-4">
            © {new Date().getFullYear()} AsetLink by ITATS. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
