'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench, Camera, Send, ArrowLeft, MapPin, User, Phone,
  Tag, FileText, CheckCircle2, Loader2, AlertCircle, X, Upload, Search, Pencil
} from 'lucide-react';
import api from '@/lib/api';
import { Category, Room } from '@/lib/types';

function ReportFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get('room_id');

  const [room, setRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(roomId || '');
  const [showRoomSelect, setShowRoomSelect] = useState(!roomId);

  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_phone: '',
    category_id: '',
    description: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const selectedRoom = rooms.find((item) => String(item.id) === selectedRoomId)
    || (String(room?.id) === selectedRoomId ? room : null);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, roomsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/rooms'),
      ]);
      setCategories(catRes.data);
      setRooms(roomsRes.data);

      if (roomId) {
        const roomRes = await api.get(`/rooms/${roomId}`);
        setRoom(roomRes.data);
        setSelectedRoomId(roomId);
      } else {
        setRoom(null);
        setSelectedRoomId('');
        setShowRoomSelect(true);
      }
    } catch {
      setError('Gagal memuat data. Pastikan koneksi internet Anda stabil.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoomChange = (value: string) => {
    setSelectedRoomId(value);
    setRoom(rooms.find((item) => String(item.id) === value) || null);
    setShowRoomSelect(!value);

    const nextUrl = value ? `/report?room_id=${value}` : '/report';
    window.history.replaceState(window.history.state, '', nextUrl);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran foto maksimal 5MB.');
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!selectedRoomId) {
        setError('Pilih ruangan terlebih dahulu.');
        setSubmitting(false);
        return;
      }

      const fd = new FormData();
      fd.append('reporter_name', formData.reporter_name);
      fd.append('reporter_phone', formData.reporter_phone);
      fd.append('room_id', selectedRoomId);
      fd.append('category_id', formData.category_id);
      fd.append('description', formData.description);
      if (photo) {
        fd.append('photo', photo);
      }

      const res = await api.post('/tickets', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      router.push(`/report/success?ticket=${res.data.ticket_code}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="mt-3 text-slate-500">Memuat formulir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-5 pb-24 lg:pb-36">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Lapor Kerusakan</h1>
            </div>
            <p className="text-indigo-200 text-sm">Isi formulir untuk melaporkan kerusakan fasilitas kelas</p>
          </div>
          <div>
            <Link href="/track" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all">
              <Search className="w-4 h-4" />
              Lacak Status Tiket
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-5xl mx-auto px-4 -mt-16 lg:-mt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (Desktop Room Info & Guidelines) */}
          <div className="hidden lg:block lg:col-span-5 space-y-6">
            {/* Room Card */}
            {selectedRoom ? (
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-6 border border-slate-100">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Lokasi Terpilih</p>
                  <button
                    type="button"
                    onClick={() => setShowRoomSelect(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Ubah Lokasi
                  </button>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-tight">{selectedRoom.room_number}</h3>
                    {selectedRoom.building && (
                      <p className="text-sm text-slate-500 mt-1">{selectedRoom.building.name}</p>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-3 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      QR Code Terpindai
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 p-6 border border-slate-100">
                <p className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-2">Perhatian</p>
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Anda belum mendeteksi lokasi ruangan melalui QR Code. Silakan pilih lokasi ruangan secara manual pada form laporan.
                  </p>
                </div>
              </div>
            )}

            {/* Instruction Card (Desktop only) */}
            <div className="hidden lg:block bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <h3 className="text-sm font-bold tracking-wider text-indigo-400 uppercase mb-4">Alur Penanganan</h3>
              <div className="space-y-4">
                {[
                  { title: 'Kirim Laporan', desc: 'Isi formulir laporan lengkap beserta bukti foto (opsional).' },
                  { title: 'Notifikasi Teknisi', desc: 'Sistem otomatis meneruskan tiket ke WhatsApp teknisi terkait.' },
                  { title: 'Proses Perbaikan', desc: 'Teknisi datang ke lokasi dan mulai memperbaiki kerusakan.' },
                  { title: 'Validasi & Selesai', desc: 'Status tiket diubah menjadi selesai setelah perbaikan dikonfirmasi.' },
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 text-indigo-300">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{step.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Form Card) */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden border border-slate-100">
              {/* Room details header if present */}
              {selectedRoom && (
                <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100/30 lg:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />
                      <p className="text-sm text-indigo-600 font-semibold truncate">
                        Ruangan: <span className="font-extrabold">{selectedRoom.room_number}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRoomSelect(true)}
                      className="inline-flex items-center gap-1.5 px-3 h-9 shrink-0 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      title="Ubah lokasi ruangan"
                      aria-label="Ubah lokasi ruangan"
                    >
                      <Pencil className="w-4 h-4" />
                      Ubah
                    </button>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                {error && (
                  <div className="flex items-start gap-2.5 p-4 bg-red-50 rounded-xl border border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {showRoomSelect && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-sm font-semibold text-slate-700" htmlFor="room-select">
                        Lokasi Ruangan <span className="text-red-500">*</span>
                      </label>
                      {selectedRoom && (
                        <button
                          type="button"
                          onClick={() => setShowRoomSelect(false)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <select
                        id="room-select"
                        required
                        value={selectedRoomId}
                        onChange={(e) => handleRoomChange(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none bg-white"
                      >
                        <option value="">Pilih ruangan...</option>
                        {rooms.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.building ? `${item.building.name} / ${item.room_number}` : item.room_number}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500 w-0 h-0" />
                    </div>
                  </div>
                )}

                {/* Reporter Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="reporter-name">
                    Nama Pelapor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reporter-name"
                      type="text"
                      required
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                </div>

                {/* Reporter Phone */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="reporter-phone">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="reporter-phone"
                      type="tel"
                      required
                      value={formData.reporter_phone}
                      onChange={(e) => setFormData({ ...formData, reporter_phone: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      placeholder="Contoh: 08123456789"
                    />
                  </div>
                </div>

                {/* Category select */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="category-select">
                    Kategori Kerusakan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="category-select"
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none bg-white"
                    >
                      <option value="">Pilih kategori...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500 w-0 h-0" />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="description">
                    Deskripsi Kerusakan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
                    placeholder="Jelaskan kerusakan secara detail..."
                  />
                </div>

                {/* Photo Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Foto Kerusakan <span className="text-slate-400 font-normal">(Opsional, maks 5MB)</span>
                  </label>
                  
                  {photoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={photoPreview} alt="Preview" className="w-full h-48 object-contain" />
                      <button
                        type="button"
                        onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-lg flex items-center justify-center text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="photo-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition-all"
                    >
                      <Upload className="w-7 h-7 text-slate-300 mb-1" />
                      <span className="text-xs text-slate-500">Ketuk untuk mengambil / mengunggah foto</span>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Section */}
              <div className="px-6 pb-6">
                <button
                  id="submit-report"
                  type="submit"
                  disabled={submitting || !selectedRoomId}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mengirim Laporan...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Kirim Laporan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    }>
      <ReportFormContent />
    </Suspense>
  );
}
