'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowLeft, Loader2, MapPin, Tag, Clock, User, CheckCircle2, Circle, Wrench, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { Ticket } from '@/lib/types';
import { STATUS_LABELS, STATUS_COLORS, STATUS_FLOW, formatDate } from '@/lib/utils';

function TrackContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (searchCode: string) => {
    if (!searchCode.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await api.get(`/tickets/${searchCode.trim()}/track`);
      setTicket(res.data);
    } catch {
      setTicket(null);
      setError('Tiket tidak ditemukan. Periksa kembali kode tiket Anda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) handleSearch(initialCode);
  }, [initialCode, handleSearch]);

  const currentStatusIndex = ticket ? STATUS_FLOW.indexOf(ticket.status) : -1;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-5 pb-20">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-indigo-200 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Lacak Tiket</h1>
          </div>
          <p className="text-indigo-200 text-sm">Masukkan kode tiket untuk melihat status perbaikan</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-14">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-5 mb-6">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(code); }} className="flex gap-3">
            <input
              id="ticket-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: TK-12345"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
            />
            <button
              id="search-ticket-btn"
              type="submit"
              disabled={loading || !code.trim()}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center mb-6">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">{error}</p>
          </div>
        )}

        {ticket && (
          <div className="space-y-4 animate-fade-in pb-8">
            {/* Ticket Header */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-indigo-600 font-mono">{ticket.ticket_code}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[ticket.status].bg} ${STATUS_COLORS[ticket.status].text}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><User className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{ticket.reporter_name}</span></div>
                <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{ticket.room?.room_number} — {ticket.room?.building?.name}</span></div>
                <div className="flex items-center gap-3"><Tag className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{ticket.category?.name}</span></div>
                <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{formatDate(ticket.created_at)}</span></div>
              </div>
              <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-600">{ticket.description}</p>
              </div>
              {ticket.technician && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                  <Wrench className="w-4 h-4 text-indigo-500" />
                  <div><p className="text-xs text-indigo-500">Teknisi</p><p className="text-sm font-medium text-indigo-900">{ticket.technician.name}</p></div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Progress</h3>
              <div className="flex items-center justify-between relative">
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200" />
                <div className="absolute top-4 left-4 h-0.5 bg-indigo-500 transition-all" style={{ width: `${(currentStatusIndex / (STATUS_FLOW.length - 1)) * 100}%`, maxWidth: 'calc(100% - 2rem)' }} />
                {STATUS_FLOW.map((status, i) => (
                  <div key={status} className="relative flex flex-col items-center z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i <= currentStatusIndex ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {i <= currentStatusIndex ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-medium ${i <= currentStatusIndex ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            {ticket.logs && ticket.logs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Riwayat Status</h3>
                <div className="space-y-4">
                  {ticket.logs.map((log, i) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${i === ticket.logs!.length - 1 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                        {i < ticket.logs!.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-slate-900">
                          {STATUS_LABELS[log.to_status as keyof typeof STATUS_LABELS] || log.to_status}
                        </p>
                        {log.notes && <p className="text-xs text-slate-500 mt-0.5">{log.notes}</p>}
                        <p className="text-xs text-slate-400 mt-1">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!ticket && !error && searched && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Tidak ada tiket ditemukan</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>}>
      <TrackContent />
    </Suspense>
  );
}
