'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Copy, Search, ArrowRight, Loader2 } from 'lucide-react';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketCode = searchParams.get('ticket') || 'TK-00000';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewReport = () => {
    router.replace('/report');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-25" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Laporan Berhasil Dikirim!</h1>
        <p className="text-slate-500 mb-8">Terima kasih, laporan Anda telah kami terima dan akan segera ditindaklanjuti.</p>
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 mb-6">
          <p className="text-sm text-slate-500 mb-3">Kode Tiket Anda</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-extrabold text-indigo-600 tracking-wider font-mono">{ticketCode}</span>
            <button onClick={handleCopy} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
              <Copy className="w-5 h-5" />
            </button>
          </div>
          {copied && <p className="text-xs text-emerald-600 mt-2 animate-fade-in">✓ Kode tersalin!</p>}
          <p className="text-xs text-slate-400 mt-4">Simpan kode ini untuk melacak status perbaikan</p>
        </div>
        <div className="space-y-3">
          <Link href={`/track?code=${ticketCode}`} className="group w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200">
            <Search className="w-5 h-5" />
            Lacak Tiket
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button type="button" onClick={handleNewReport} className="w-full flex items-center justify-center px-6 py-4 text-slate-600 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
            Buat Laporan Baru
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
