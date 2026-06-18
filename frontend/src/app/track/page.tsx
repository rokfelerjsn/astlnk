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
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-5 pb-24 lg:pb-36">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Lacak Tiket</h1>
            </div>
            <p className="text-indigo-200 text-sm">Masukkan kode tiket untuk melihat status perbaikan</p>
          </div>
          <div>
            <Link href="/report" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Form Laporan
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 -mt-16 lg:-mt-24 pb-12">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-5 mb-8 border border-slate-100">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(code); }} className="flex gap-3">
            <input
              id="ticket-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Masukkan Kode Tiket (Contoh: TK-12345)"
              className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            <button
              id="search-ticket-btn"
              type="submit"
              disabled={loading || !code.trim()}
              className="px-4 md:px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center shrink-0 focus:outline-none"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5 md:hidden" />
                  <span className="hidden md:inline text-sm">Cari Tiket</span>
                </>
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-8 text-center border border-slate-100">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold">{error}</p>
          </div>
        )}

        {ticket && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left Column (Ticket Info & Progress - lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Ticket Details Card */}
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-6 border border-slate-100">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Kode Tiket</p>
                    <span className="text-2xl font-black text-indigo-600 font-mono tracking-wide">{ticket.ticket_code}</span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${STATUS_COLORS[ticket.status].bg} ${STATUS_COLORS[ticket.status].text}`}>
                    {STATUS_LABELS[ticket.status]}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Pelapor</p>
                        <span className="text-slate-700 font-semibold">{ticket.reporter_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Lokasi</p>
                        <span className="text-slate-700 font-semibold">{ticket.room?.room_number} — {ticket.room?.building?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Kategori</p>
                        <span className="text-slate-700 font-semibold">{ticket.category?.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Dilaporkan Pada</p>
                        <span className="text-slate-700 font-semibold">{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Deskripsi Laporan</p>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{ticket.description}</p>
                </div>

                {ticket.technician && (
                  <div className="mt-4 flex items-center gap-3.5 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/30">
                    <Wrench className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-indigo-500 uppercase font-bold">Teknisi Ditugaskan</p>
                      <p className="text-sm font-bold text-indigo-900">{ticket.technician.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Stepper Card */}
              <div className="hidden md:block bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-6 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Status Progress</h3>
                <div className="flex items-center justify-between relative px-2">
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100" />
                  <div className="absolute top-4 left-4 h-0.5 bg-indigo-600 transition-all duration-300" style={{ width: `${(currentStatusIndex / (STATUS_FLOW.length - 1)) * 100}%`, maxWidth: 'calc(100% - 2rem)' }} />
                  {STATUS_FLOW.map((status, i) => (
                    <div key={status} className="relative flex flex-col items-center z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${i <= currentStatusIndex ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100 text-slate-400'}`}>
                        {i <= currentStatusIndex ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-slate-300" />}
                      </div>
                      <span className={`text-[10px] mt-2 font-bold ${i <= currentStatusIndex ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (Timeline Logs - lg:col-span-5) */}
            <div className="lg:col-span-5">
              {ticket.logs && ticket.logs.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-6 border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Riwayat Penanganan</h3>
                  <div className="space-y-6 relative pl-4 border-l border-slate-100 ml-2">
                    {ticket.logs.map((log, i) => (
                      <div key={log.id} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-white ${i === ticket.logs!.length - 1 ? 'bg-indigo-600 scale-125' : 'bg-slate-300'}`} />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {STATUS_LABELS[log.to_status as keyof typeof STATUS_LABELS] || log.to_status}
                          </p>
                          {log.notes && <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{log.notes}</p>}
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">{formatDate(log.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!ticket && !error && searched && !loading && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-12 text-center border border-slate-100">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold">Tiket tidak ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Periksa kembali apakah pengetikan kode tiket sudah benar.</p>
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
