'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, X, Users, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { Technician } from '@/lib/types';
import ActionDropdown from '@/components/ActionDropdown';

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', status: 'available' });
  const [saving, setSaving] = useState(false);

  const fetchTechnicians = async () => {
    try {
      const res = await api.get('/admin/technicians', { params: { search } });
      setTechnicians(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [search]); // eslint-disable-line

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', status: 'available' });
    setIsModalOpen(true);
  };

  const openEditModal = (t: Technician) => {
    setEditingId(t.id);
    setFormData({ name: t.name, phone: t.phone, status: t.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/technicians/${editingId}`, formData);
      } else {
        await api.post('/admin/technicians', formData);
      }
      setIsModalOpen(false);
      fetchTechnicians();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan teknisi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus teknisi ini?')) return;
    try {
      await api.delete(`/admin/technicians/${id}`);
      fetchTechnicians();
    } catch (err) {
      alert('Gagal menghapus teknisi');
    }
  };

  const modal = isModalOpen ? createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Teknisi' : 'Tambah Teknisi'}</h2>
          <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Teknisi</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="Contoh: Budi Santoso"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">No. Telepon / WhatsApp</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <div className="relative">
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none bg-white pr-10"
              >
                <option value="available">Tersedia</option>
                <option value="busy">Sibuk</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teknisi</h1>
          <p className="text-sm text-slate-500">Kelola data teknisi untuk penugasan tiket</p>
        </div>
        <button onClick={openCreateModal} className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Tambah Teknisi
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama teknisi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Nama Teknisi</th>
                  <th className="px-6 py-4 font-medium">No. Telepon</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Tiket Aktif</th>
                  <th className="px-6 py-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technicians.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                          <Users className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-medium text-slate-900">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{t.phone}</td>
                    <td className="px-6 py-4 text-center">
                      {t.status === 'available' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Tersedia
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
                          <AlertCircle className="w-3.5 h-3.5" /> Sibuk
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700 font-medium">{t.tickets_count || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <ActionDropdown
                          actions={[
                            {
                              label: 'Edit Teknisi',
                              icon: <Edit2 className="w-4 h-4" />,
                              onClick: () => openEditModal(t),
                            },
                            {
                              label: 'Hapus Teknisi',
                              icon: <Trash2 className="w-4 h-4" />,
                              onClick: () => handleDelete(t.id),
                              variant: 'danger',
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {technicians.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Tidak ada data teknisi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal}
    </div>
  );
}
