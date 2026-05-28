'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, X, DoorOpen, ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { Room, Building } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ActionDropdown from '@/components/ActionDropdown';

export default function BuildingRoomsPage() {
  const params = useParams();
  const buildingId = params.id as string;
  const router = useRouter();

  const [building, setBuilding] = useState<Building | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ room_number: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [roomsRes, bldgRes] = await Promise.all([
        api.get('/admin/rooms', { params: { search, building_id: buildingId } }),
        api.get(`/admin/buildings/${buildingId}`)
      ]);
      setRooms(roomsRes.data);
      setBuilding(bldgRes.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 404) {
        // Building might not exist
        router.push('/dashboard/buildings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buildingId) {
      fetchData();
    }
  }, [search, buildingId]); // eslint-disable-line

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ room_number: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (r: Room) => {
    setEditingId(r.id);
    setFormData({ room_number: r.room_number });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/rooms/${editingId}`, formData);
      } else {
        await api.post('/admin/rooms', { ...formData, building_id: buildingId });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan ruangan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus ruangan ini? Semua tiket terkait akan terhapus.')) return;
    try {
      await api.delete(`/admin/rooms/${id}`);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus ruangan');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const modal = isModalOpen ? createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Ruangan' : 'Tambah Ruangan'}</h2>
          <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Ruangan</label>
            <input
              type="text"
              required
              value={formData.room_number}
              onChange={e => setFormData({...formData, room_number: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 uppercase font-mono"
              placeholder="Contoh: GD-A-101"
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
      <div className="mb-6">
        <Link href="/dashboard/buildings" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Gedung
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ruangan - {building?.name}</h1>
          <p className="text-sm text-slate-500">Kelola data ruangan untuk {building?.name}</p>
        </div>
        <button onClick={openCreateModal} className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Tambah Ruangan
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor ruangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-medium">No. Ruangan</th>
                <th className="px-6 py-4 font-medium text-center">Total Tiket</th>
                <th className="px-6 py-4 font-medium text-center">Status QR</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <DoorOpen className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="font-bold text-slate-900 font-mono">{r.room_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-700">{r.tickets_count || 0}</td>
                  <td className="px-6 py-4 text-center">
                    {r.qr_path ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">Generated</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">Belum</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <ActionDropdown
                        actions={[
                          {
                            label: 'Edit Ruangan',
                            icon: <Edit2 className="w-4 h-4" />,
                            onClick: () => openEditModal(r),
                          },
                          {
                            label: 'Hapus Ruangan',
                            icon: <Trash2 className="w-4 h-4" />,
                            onClick: () => handleDelete(r.id),
                            variant: 'danger',
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data ruangan untuk gedung ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal}
    </div>
  );
}
