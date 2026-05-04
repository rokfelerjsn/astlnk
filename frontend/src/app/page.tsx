'use client';

import Link from 'next/link';
import { QrCode, Search, Shield, BarChart3, ArrowRight, Wrench, Building2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">AsetLink</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Lacak Tiket
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-semibold text-indigo-700 bg-white rounded-xl hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-900/20"
            >
              Login Admin
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-28 md:pt-24 md:pb-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-medium text-indigo-200 bg-white/10 backdrop-blur rounded-full border border-white/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Pelaporan Digital ITATS
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Laporkan Kerusakan
              <span className="block mt-1 bg-gradient-to-r from-indigo-200 to-cyan-200 bg-clip-text text-transparent">
                Semudah Scan QR
              </span>
            </h1>
            <p className="mt-6 text-lg text-indigo-100/80 max-w-lg leading-relaxed">
              AsetLink memudahkan civitas akademika untuk melaporkan kerusakan fasilitas kampus secara cepat dan terstruktur. Tanpa perlu login.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/report"
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-indigo-700 bg-white rounded-2xl hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-900/25"
              >
                <QrCode className="w-5 h-5" />
                Buat Laporan
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/track"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-white border-2 border-white/30 rounded-2xl hover:bg-white/10 transition-all"
              >
                <Search className="w-5 h-5" />
                Lacak Status Tiket
              </Link>
            </div>
          </div>
        </div>

        {/* Floating decoration */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/3 w-48 h-48 bg-cyan-500/15 rounded-full blur-2xl" />
      </header>

      {/* Features Section */}
      <section className="relative -mt-16 z-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: QrCode,
              title: 'Scan & Lapor',
              desc: 'Scan QR Code di ruangan, isi formulir singkat, dan laporan langsung terkirim ke tim Sarpras.',
              gradient: 'from-blue-500 to-indigo-600',
            },
            {
              icon: Search,
              title: 'Lacak Real-time',
              desc: 'Pantau progress perbaikan secara real-time dengan kode tiket unik yang diberikan saat pelaporan.',
              gradient: 'from-indigo-500 to-purple-600',
            },
            {
              icon: BarChart3,
              title: 'Dashboard Analitik',
              desc: 'Admin mendapatkan insight lengkap tentang tren kerusakan, performa teknisi, dan status fasilitas.',
              gradient: 'from-purple-500 to-pink-600',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group glass rounded-2xl p-7 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Cara Kerja
          </h2>
          <p className="mt-3 text-slate-500 max-w-md mx-auto">
            Tiga langkah sederhana untuk melaporkan kerusakan fasilitas
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              step: '01',
              title: 'Scan QR Code',
              desc: 'Arahkan kamera ke QR Code yang terpasang di ruangan kelas.',
              icon: QrCode,
            },
            {
              step: '02',
              title: 'Isi Formulir',
              desc: 'Masukkan nama, kategori kerusakan, deskripsi, dan foto bukti.',
              icon: Building2,
            },
            {
              step: '03',
              title: 'Pantau Progress',
              desc: 'Dapatkan kode tiket dan lacak perbaikan secara real-time.',
              icon: Shield,
            },
          ].map((item, i) => (
            <div key={i} className="relative text-center">
              <div className="text-7xl font-extrabold text-indigo-100 mb-4">{item.step}</div>
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <item.icon className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
              {i < 2 && (
                <div className="hidden md:block absolute top-12 -right-5 w-10">
                  <ArrowRight className="w-6 h-6 text-indigo-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-slate-900 p-10 md:p-16">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-lg">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Siap Melaporkan Kerusakan?
            </h2>
            <p className="mt-4 text-indigo-200/80">
              Bantu kami menjaga kualitas fasilitas kampus. Setiap laporan Anda membantu menciptakan lingkungan belajar yang lebih baik.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/report"
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-indigo-700 bg-white rounded-2xl hover:bg-indigo-50 transition-all"
              >
                Buat Laporan Sekarang
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-900">AsetLink</span>
            <span className="text-sm text-slate-400">• ITATS Sarpras</span>
          </div>
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} AsetLink. Unit Sarana dan Prasarana ITATS.
          </p>
        </div>
      </footer>
    </div>
  );
}
