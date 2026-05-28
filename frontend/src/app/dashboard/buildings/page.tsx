'use client';

import { useState, useEffect } from 'react';
import { Building, Plus, Search, Loader2, X, Building2, DoorOpen, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { Building as BuildingType } from '@/lib/types';
import ActionDropdown from '@/components/ActionDropdown';

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/admin/buildings', { params: { search } });
      setBuildings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, [search]); // eslint-disable-line

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: '', code: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (b: BuildingType) => {
    setEditingId(b.id);
    setFormData({ name: b.name, code: b.code });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/buildings/${editingId}`, formData);
      } else {
        await api.post('/admin/buildings', formData);
      }
      setIsModalOpen(false);
      fetchBuildings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan gedung');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus gedung ini? Semua ruangan dan tiket terkait akan terhapus.')) return;
    try {
      await api.delete(`/admin/buildings/${id}`);
      fetchBuildings();
    } catch (err) {
      alert('Gagal menghapus gedung');
    }
  };

  const modal = isModalOpen ? createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Gedung' : 'Tambah Gedung'}</h2>
          <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Gedung</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="Contoh: Gedung A - Teknik Informatika"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kode Gedung</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="Contoh: GD-A"
            />
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
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gedung</h1>
          <p className="text-sm text-slate-500">Kelola data gedung di lingkungan ITATS</p>
        </div>
        <button onClick={openCreateModal} className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Tambah Gedung
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama gedung..."
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
                  <th className="px-6 py-4 font-medium">Nama Gedung</th>
                  <th className="px-6 py-4 font-medium">Kode</th>
                  <th className="px-6 py-4 font-medium text-center">Jumlah Ruangan</th>
                  <th className="px-6 py-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buildings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-medium text-slate-900">{b.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <span className="px-2 py-1 bg-slate-100 rounded-md font-mono text-xs">{b.code}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700">{b.rooms_count || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <ActionDropdown
                          actions={[
                            {
                              label: 'Lihat Ruangan',
                              icon: <DoorOpen className="w-4 h-4" />,
                              onClick: () => { window.location.href = `/dashboard/buildings/${b.id}/rooms`; },
                            },
                            {
                              label: 'Edit Gedung',
                              icon: <Edit2 className="w-4 h-4" />,
                              onClick: () => openEditModal(b),
                            },
                            {
                              label: 'Hapus Gedung',
                              icon: <Trash2 className="w-4 h-4" />,
                              onClick: () => handleDelete(b.id),
                              variant: 'danger',
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {buildings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      Tidak ada data gedung.
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
