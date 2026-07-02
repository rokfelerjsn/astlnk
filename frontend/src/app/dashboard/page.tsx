'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Ticket, CheckCircle2, AlertCircle, Clock, Activity, Loader2,
  ArrowRight, Sparkles, Building2, Tags, Play, CalendarDays, Filter, BarChart3, X
} from 'lucide-react';
import api from '@/lib/api';
import { AnalyticsData, Building, Category, Technician } from '@/lib/types';

const COLORS = ['#4f46e5', '#14b8a6', '#f97316', '#dc2626', '#d946ef', '#eab308', '#0284c7', '#64748b', '#7c3aed', '#0f766e', '#be123c', '#a16207', '#0369a1', '#c026d3'];
const CATEGORY_COLORS: Record<string, string> = {
  'ac / pendingin': '#4f46e5',
  'proyektor': '#14b8a6',
  'meja & kursi': '#f97316',
  'listrik & stopkontak': '#dc2626',
  'pintu & jendela': '#d946ef',
  'lampu': '#eab308',
  'komputer/pc': '#0284c7',
  'lainnya': '#64748b',
};
const RESERVED_CATEGORY_COLORS = new Set(Object.values(CATEGORY_COLORS));
const categoryColor = (entry: { id: number; name: string }, index: number) => CATEGORY_COLORS[entry.name.trim().toLowerCase()] || COLORS[index % COLORS.length];
const DEFAULT_PERIOD = 'last_6_months';
const PERIOD_OPTIONS = [
  ['today', 'Hari ini'],
  ['last_7_days', '7 hari terakhir'],
  ['last_30_days', '30 hari terakhir'],
  ['this_month', 'Bulan ini'],
  ['last_3_months', '3 bulan terakhir'],
  ['last_6_months', '6 bulan terakhir'],
  ['this_year', 'Tahun ini'],
  ['all_time', 'Semua waktu'],
  ['custom', 'Rentang khusus'],
];
const STATUS_OPTIONS = [['', 'Semua status'], ['new', 'Baru'], ['assigned', 'Ditugaskan'], ['in_progress', 'Dalam proses'], ['done', 'Selesai']];
const PRIORITY_OPTIONS = [['', 'Semua prioritas'], ['low', 'Rendah'], ['medium', 'Sedang'], ['high', 'Tinggi']];
const pad = (value: number) => String(value).padStart(2, '0');
const dateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const displayDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
};
const periodRange = (period: string, customFrom: string, customTo: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from: Date | null = null;
  let to: Date | null = today;

  if (period === 'today') from = today;
  else if (period === 'last_7_days') { from = new Date(today); from.setDate(today.getDate() - 6); }
  else if (period === 'last_30_days') { from = new Date(today); from.setDate(today.getDate() - 29); }
  else if (period === 'this_month') { from = new Date(today.getFullYear(), today.getMonth(), 1); to = new Date(today.getFullYear(), today.getMonth() + 1, 0); }
  else if (period === 'last_3_months') { from = new Date(today.getFullYear(), today.getMonth() - 2, 1); to = new Date(today.getFullYear(), today.getMonth() + 1, 0); }
  else if (period === 'last_6_months') { from = new Date(today.getFullYear(), today.getMonth() - 5, 1); to = new Date(today.getFullYear(), today.getMonth() + 1, 0); }
  else if (period === 'this_year') { from = new Date(today.getFullYear(), 0, 1); to = new Date(today.getFullYear(), 11, 31); }
  else if (period === 'all_time') { from = null; to = null; }
  else return { from: customFrom, to: customTo };

  return { from: from ? dateInput(from) : '', to: to ? dateInput(to) : '' };
};
const changeLabel = (percent?: number) => percent === undefined ? '' : `${percent > 0 ? '+' : ''}${percent}%`;

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const period = searchParams.get('period') || DEFAULT_PERIOD;
  const customFrom = searchParams.get('from') || '';
  const customTo = searchParams.get('to') || '';
  const buildingId = searchParams.get('buildingId') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const technicianId = searchParams.get('technicianId') || '';
  const priority = searchParams.get('priority') || '';
  const status = searchParams.get('status') || '';
  const compare = searchParams.get('compare') === '1';
  const range = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const periodText = period === 'all_time' ? 'Semua waktu' : `${displayDate(range.from)} - ${displayDate(range.to)}`;
  const periodLabel = PERIOD_OPTIONS.find((item) => item[0] === period)?.[1] || '6 bulan terakhir';
  const activeFilterCount = [buildingId, categoryId, technicianId, priority, status].filter(Boolean).length;

  const analyticsParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;
    if (buildingId) params.buildingId = buildingId;
    if (categoryId) params.categoryId = categoryId;
    if (technicianId) params.technicianId = technicianId;
    if (priority) params.priority = priority;
    if (status) params.status = status;
    if (compare) params.compare = '1';
    return params;
  }, [range.from, range.to, buildingId, categoryId, technicianId, priority, status, compare]);

  const updateQuery = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (!params.get('period')) params.set('period', DEFAULT_PERIOD);
    router.replace(`/dashboard?${params.toString()}`);
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [buildingRes, categoryRes, technicianRes] = await Promise.all([
          api.get('/admin/buildings'),
          api.get('/admin/categories'),
          api.get('/admin/technicians'),
        ]);
        setBuildings(buildingRes.data);
        setCategories(categoryRes.data);
        setTechnicians(technicianRes.data);
      } catch (err) {
        console.error('Failed to load dashboard filters', err);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/analytics', { params: analyticsParams });
        setData(res.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [analyticsParams]);
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const { summary, building_trends, category_distribution, monthly_trend } = data;

  // Smart Insights Client-Side Calculations
  const topBuilding = building_trends.length > 0 
    ? building_trends.reduce((prev, current) => (prev.total > current.total) ? prev : current, building_trends[0])
    : null;

  const topCategory = category_distribution.length > 0
    ? category_distribution.reduce((prev, current) => (prev.value > current.value) ? prev : current, category_distribution[0])
    : null;

  const avgHours = summary.avg_repair_hours;
  let repairPerformanceLabel = '';
  let repairPerformanceColor = '';
  let repairPerformanceDesc = '';
  if (avgHours === 0) {
    repairPerformanceLabel = 'Belum Ada Data';
    repairPerformanceColor = 'text-slate-600 bg-slate-100 border-slate-200';
    repairPerformanceDesc = 'Belum ada tiket diselesaikan untuk mengukur performa waktu perbaikan.';
  } else if (avgHours < 12) {
    repairPerformanceLabel = 'Sangat Cepat';
    repairPerformanceColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    repairPerformanceDesc = `Rata-rata waktu perbaikan adalah ${avgHours} jam. Tim pemeliharaan sangat responsif!`;
  } else if (avgHours <= 24) {
    repairPerformanceLabel = 'Cepat';
    repairPerformanceColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
    repairPerformanceDesc = `Rata-rata waktu perbaikan adalah ${avgHours} jam. Performa penyelesaian sudah cukup efisien.`;
  } else {
    repairPerformanceLabel = 'Perlu Perhatian';
    repairPerformanceColor = 'text-amber-700 bg-amber-50 border-amber-200';
    repairPerformanceDesc = `Rata-rata waktu perbaikan ${avgHours} jam. Perlu evaluasi beban kerja teknisi agar penanganan lebih cepat.`;
  }

  const totalTickets = summary.total;
  const resolvedTickets = summary.resolved;
  const completionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
  const usedCategoryColors = new Set<string>();
  const categoryColors = category_distribution.reduce<Record<number, string>>((acc, entry, index) => {
    const preferred = CATEGORY_COLORS[entry.name.trim().toLowerCase()];
    if (preferred && !usedCategoryColors.has(preferred)) {
      acc[entry.id] = preferred;
      usedCategoryColors.add(preferred);
      return acc;
    }

    const fallback = COLORS.find((color) => !usedCategoryColors.has(color) && !RESERVED_CATEGORY_COLORS.has(color)) || COLORS.find((color) => !usedCategoryColors.has(color)) || COLORS[index % COLORS.length];
    acc[entry.id] = fallback;
    usedCategoryColors.add(fallback);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Analitik</h1>
          <p className="text-sm text-slate-500">Ringkasan analitik dan tindakan operasional perbaikan fasilitas.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative">
            <CalendarDays className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={period} onChange={(event) => updateQuery({ period: event.target.value, from: null, to: null })} className="h-11 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none min-w-[190px]">
              {PERIOD_OPTIONS.map((item) => <option key={item[0]} value={item[0]}>{item[1]}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Filter Lainnya
            {activeFilterCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          <button type="button" onClick={() => updateQuery({ compare: compare ? null : '1' })} className={`h-11 px-4 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${compare ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
            <BarChart3 className="w-4 h-4" />
            Bandingkan
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center w-fit px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">{periodLabel}: {periodText}</span>
        {compare && data.comparison && <span className="inline-flex items-center w-fit px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-semibold">Dibandingkan dengan {displayDate(data.comparison.from)} - {displayDate(data.comparison.to)}</span>}
      </div>

      {period === 'custom' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dari tanggal<input type="date" value={customFrom} onChange={(event) => updateQuery({ from: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" /></label>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sampai tanggal<input type="date" value={customTo} onChange={(event) => updateQuery({ to: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" /></label>
        </div>
      )}

      {filtersOpen && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-slate-900">Filter Dashboard</h2><button type="button" onClick={() => router.replace(`/dashboard?period=${DEFAULT_PERIOD}`)} className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1"><X className="w-3.5 h-3.5" />Reset</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <select value={buildingId} onChange={(event) => updateQuery({ buildingId: event.target.value || null })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white"><option value="">Semua gedung</option>{buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select value={categoryId} onChange={(event) => updateQuery({ categoryId: event.target.value || null })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white"><option value="">Semua kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select value={technicianId} onChange={(event) => updateQuery({ technicianId: event.target.value || null })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white"><option value="">Semua teknisi</option>{technicians.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select value={priority} onChange={(event) => updateQuery({ priority: event.target.value || null })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">{PRIORITY_OPTIONS.map((item) => <option key={item[0]} value={item[0]}>{item[1]}</option>)}</select>
            <select value={status} onChange={(event) => updateQuery({ status: event.target.value || null })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">{STATUS_OPTIONS.map((item) => <option key={item[0]} value={item[0]}>{item[1]}</option>)}</select>
          </div>
        </div>
      )}
      {/* 5-Column Stats Row (Interactive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tiket */}
        <Link 
          href="/dashboard/tickets" 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <Ticket className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Laporan</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{summary.total}</p><p className="text-[11px] text-slate-400 mt-1">Pada periode terpilih {data.comparison && <span className={data.comparison.changes.total.better ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{changeLabel(data.comparison.changes.total.percent)}</span>}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-400 absolute right-4 top-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Tiket Terbuka */}
        <Link 
          href="/dashboard/tickets?status=open" 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md hover:border-amber-200 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiket Terbuka</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{summary.open}</p><p className="text-[11px] text-slate-400 mt-1">Snapshot saat ini</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 absolute right-4 top-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Dalam Proses */}
        <Link 
          href="/dashboard/tickets?status=active" 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md hover:border-blue-200 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <Play className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dalam Proses</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{summary.in_progress}</p><p className="text-[11px] text-slate-400 mt-1">Snapshot saat ini</p>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-400 absolute right-4 top-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Selesai */}
        <Link 
          href="/dashboard/tickets?status=done" 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiket Selesai</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{summary.resolved}</p><p className="text-[11px] text-slate-400 mt-1">Pada periode terpilih {data.comparison && <span className={data.comparison.changes.resolved.better ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{changeLabel(data.comparison.changes.resolved.percent)}</span>}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400 absolute right-4 top-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Waktu Rata-rata */}
        <Link 
          href="/dashboard/tickets/history" 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md hover:border-violet-200 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <Clock className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Respon</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{summary.avg_repair_hours} <span className="text-xs font-normal text-slate-400 lowercase">jam</span></p><p className="text-[11px] text-slate-400 mt-1">Pada periode terpilih {data.comparison && <span className={data.comparison.changes.avg_repair_hours.better ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{changeLabel(data.comparison.changes.avg_repair_hours.percent)}</span>}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-violet-400 absolute right-4 top-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Smart Automated Insights Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse-soft" />
          <h2 className="text-lg font-bold text-slate-900">Analisis & Insight Otomatis</h2>
          <span className="ml-auto text-[10px] sm:text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-semibold">Rekomendasi Tindakan</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Top Building Insight */}
          {topBuilding && (
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/20 hover:bg-amber-50/40 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  Gedung Teraktif
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">{topBuilding.building}</span> memiliki jumlah laporan terbanyak, yaitu <span className="font-bold text-slate-800">{topBuilding.total} tiket</span> ({topBuilding.pending} pending).
                </p>
              </div>
              <Link 
                href={`/dashboard/tickets?buildingId=${topBuilding.id}`} 
                className="mt-3 text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 group/btn w-fit"
              >
                Tinjau Tiket Gedung
                <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}

          {/* Top Category Insight */}
          {topCategory && topCategory.value > 0 ? (
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50/40 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-800 font-semibold text-sm mb-2">
                  <Tags className="w-4 h-4 text-indigo-600" />
                  Kerusakan Terpopuler
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kerusakan <span className="font-bold text-slate-800">{topCategory.name}</span> paling sering dilaporkan dengan total <span className="font-bold text-slate-800">{topCategory.value} laporan</span>. Pastikan suku cadang kategori ini siap sedia.
                </p>
              </div>
              <Link 
                href={`/dashboard/tickets?categoryId=${topCategory.id}`} 
                className="mt-3 text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 group/btn w-fit"
              >
                Tinjau Tiket Kategori
                <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm mb-2">
                  <Tags className="w-4 h-4 text-slate-400" />
                  Kerusakan Terpopuler
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Belum ada laporan kategori kerusakan yang tercatat saat ini.
                </p>
              </div>
            </div>
          )}

          {/* Repair Efficiency Insight */}
          <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/20 hover:bg-violet-50/40 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-violet-800 font-semibold text-sm mb-2">
                <Clock className="w-4 h-4 text-violet-600" />
                Efisiensi Perbaikan
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${repairPerformanceColor}`}>
                  {repairPerformanceLabel}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {repairPerformanceDesc}
              </p>
            </div>
            <Link 
              href="/dashboard/tickets/history" 
              className="mt-3 text-xs text-violet-700 hover:text-violet-900 font-bold flex items-center gap-1 group/btn w-fit"
            >
              Lihat Riwayat Perbaikan
              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Completion Rate Insight */}
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Rasio Penyelesaian
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tingkat penyelesaian masalah berada di angka <span className="font-bold text-slate-800">{completionRate}%</span>. Dari total laporan, sebanyak <span className="font-bold text-slate-800">{resolvedTickets} tiket</span> berhasil diselesaikan.
              </p>
            </div>
            <Link 
              href="/dashboard/tickets?status=open" 
              className="mt-3 text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 group/btn w-fit"
            >
              Tindak Lanjuti Laporan
              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div><h2 className="text-lg font-bold text-slate-900">Tren Laporan</h2><p className="text-xs text-slate-400 mt-1">{periodText}</p></div><Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly_trend} margin={{ top: 10, right: 24, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <RechartsTooltip cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="total" name="Total Laporan" stroke="#94a3b8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="resolved" name="Diselesaikan" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Chart (Interactive Grid Layout) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div><h2 className="text-lg font-bold text-slate-900">Distribusi Kategori</h2><p className="text-xs text-slate-400 mt-1">Konteks periode aktif: {periodText}</p></div><span className="text-xs text-slate-400">Klik kategori untuk memfilter tiket</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={category_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ percent }) => (percent !== undefined && percent > 0.08) ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {category_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[entry.id] || categoryColor(entry, index)} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {category_distribution.map((entry, index) => {
                const color = categoryColors[entry.id] || categoryColor(entry, index);
                return (
                  <Link
                    key={entry.name}
                    href={`/dashboard/tickets?categoryId=${entry.id}`}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: color }} 
                      />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors truncate max-w-[120px]">
                        {entry.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {entry.value}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                    </div>
                  </Link>
                );
              })}
              {category_distribution.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada data kategori.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Building Trends Table (Interactive) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div><h2 className="text-lg font-bold text-slate-900">Laporan per Gedung</h2><p className="text-xs text-slate-400 mt-1">Rentang tanggal aktif: {periodText}</p></div><span className="text-xs text-slate-400">Klik nama gedung untuk memfilter tiket di Kanban</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-medium">Gedung</th>
                <th className="px-6 py-4 font-medium text-center">Kode</th>
                <th className="px-6 py-4 font-medium text-center">Total Laporan</th>
                <th className="px-6 py-4 font-medium text-center">Diselesaikan</th>
                <th className="px-6 py-4 font-medium text-center">Pending</th>
                <th className="px-6 py-4 font-medium text-right">Penyelesaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {building_trends.map((b) => {
                const completionRate = b.total > 0 ? (b.resolved / b.total) * 100 : 0;
                return (
                  <tr key={b.code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <Link 
                        href={`/dashboard/tickets?buildingId=${b.id}`}
                        className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group/table w-fit"
                      >
                        {b.building}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/table:text-indigo-600 group-hover/table:translate-x-0.5 transition-all opacity-0 group-hover/table:opacity-100 flex-shrink-0" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs">{b.code}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700 font-medium">{b.total}</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-semibold">{b.resolved}</td>
                    <td className="px-6 py-4 text-center text-amber-600 font-semibold">{b.pending}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${completionRate > 75 ? 'bg-emerald-500' : completionRate > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${completionRate}%` }} 
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{Math.round(completionRate)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {building_trends.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data gedung.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
