'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Clock, MapPin, Tag, User, Wrench, X, Archive } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { Ticket } from '@/lib/types';
import { timeAgo, formatDate } from '@/lib/utils';

export default function TicketHistoryPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/admin/tickets/archived', { params: { search: search || undefined } });
      setTickets(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat Tiket</h1>
          <p className="text-sm text-slate-500">Tiket yang telah selesai dan diarsipkan</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Cari tiket atau pelapor..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Kode Tiket</th>
                  <th className="px-6 py-4 font-medium">Deskripsi</th>
                  <th className="px-6 py-4 font-medium">Pelapor</th>
                  <th className="px-6 py-4 font-medium">Lokasi</th>
                  <th className="px-6 py-4 font-medium">Teknisi</th>
                  <th className="px-6 py-4 font-medium">Diarsipkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => { setSelectedTicket(t); setIsModalOpen(true); }}>
                    <td className="px-6 py-4">
                      <span className="font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-1 rounded-md text-xs">{t.ticket_code}</span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-slate-800 truncate">{t.description}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{t.reporter_name}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{t.room?.room_number} — {t.room?.building?.name}</td>
                    <td className="px-6 py-4 text-slate-600">{t.technician?.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{t.archived_at ? timeAgo(t.archived_at) : '-'}</td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Archive className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    Belum ada tiket yang diarsipkan.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedTicket && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-in-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                Riwayat Tiket <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-sm">{selectedTicket.ticket_code}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Informasi Pelapor</h3>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                      <p className="text-sm"><span className="text-slate-500 w-20 inline-block">Nama:</span> <span className="font-medium text-slate-900">{selectedTicket.reporter_name}</span></p>
                      <p className="text-sm"><span className="text-slate-500 w-20 inline-block">No. WA:</span> <span className="font-medium text-slate-900">{selectedTicket.reporter_phone}</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lokasi & Kategori</h3>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                      <p className="text-sm"><span className="text-slate-500 w-20 inline-block">Gedung:</span> <span className="font-medium text-slate-900">{selectedTicket.room?.building?.name}</span></p>
                      <p className="text-sm"><span className="text-slate-500 w-20 inline-block">Ruangan:</span> <span className="font-medium text-slate-900">{selectedTicket.room?.room_number}</span></p>
                      <p className="text-sm"><span className="text-slate-500 w-20 inline-block">Kategori:</span> <span className="font-medium text-slate-900">{selectedTicket.category?.name}</span></p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Deskripsi</h3>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Teknisi</h3>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{selectedTicket.technician?.name || 'Tidak ditugaskan'}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Waktu</h3>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                      <p className="text-xs text-slate-500">Dibuat: <span className="text-slate-700">{formatDate(selectedTicket.created_at)}</span></p>
                      {selectedTicket.resolved_at && <p className="text-xs text-slate-500">Selesai: <span className="text-slate-700">{formatDate(selectedTicket.resolved_at)}</span></p>}
                      {selectedTicket.archived_at && <p className="text-xs text-slate-500">Diarsipkan: <span className="text-slate-700">{formatDate(selectedTicket.archived_at)}</span></p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
