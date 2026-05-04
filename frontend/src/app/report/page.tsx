'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench, Camera, Send, ArrowLeft, MapPin, User, Phone,
  Tag, FileText, CheckCircle2, Loader2, AlertCircle, X, Upload
} from 'lucide-react';
import api from '@/lib/api';
import { Category, Room } from '@/lib/types';

function ReportFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get('room_id');

  const [room, setRoom] = useState<Room | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_phone: '',
    category_id: '',
    description: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [catRes] = await Promise.all([
        api.get('/categories'),
      ]);
      setCategories(catRes.data);

      if (roomId) {
        const roomRes = await api.get(`/rooms/${roomId}`);
        setRoom(roomRes.data);
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
      const fd = new FormData();
      fd.append('reporter_name', formData.reporter_name);
      fd.append('reporter_phone', formData.reporter_phone);
      fd.append('room_id', roomId || '');
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
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-5 pb-20">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-indigo-200 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Lapor Kerusakan</h1>
          </div>
          <p className="text-indigo-200 text-sm">Isi formulir di bawah untuk melaporkan kerusakan fasilitas</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-lg mx-auto px-4 -mt-14">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Room Info */}
          {room && (
            <div className="bg-indigo-50 px-5 py-4 border-b border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-indigo-500 font-medium">Ruangan</p>
                  <p className="text-sm font-bold text-indigo-900">{room.room_number}</p>
                  {room.building && (
                    <p className="text-xs text-indigo-600">{room.building.name}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!roomId && (
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Scan QR Code di ruangan untuk pelaporan otomatis.
                </p>
              </div>
            </div>
          )}

          <div className="p-5 space-y-5">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <User className="w-4 h-4 text-slate-400" />
                Nama Pelapor
              </label>
              <input
                id="reporter-name"
                type="text"
                required
                value={formData.reporter_name}
                onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Nomor WhatsApp
              </label>
              <input
                id="reporter-phone"
                type="tel"
                required
                value={formData.reporter_phone}
                onChange={(e) => setFormData({ ...formData, reporter_phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                placeholder="08xxxxxxxxxx"
              />
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Tag className="w-4 h-4 text-slate-400" />
                Kategori Kerusakan
              </label>
              <select
                id="category-select"
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none bg-white"
              >
                <option value="">Pilih kategori...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Deskripsi Kerusakan
              </label>
              <textarea
                id="description"
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400 resize-none"
                placeholder="Jelaskan kerusakan yang terjadi secara detail..."
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Camera className="w-4 h-4 text-slate-400" />
                Foto Kerusakan <span className="text-slate-400 font-normal">(Opsional, maks 5MB)</span>
              </label>
              
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                >
                  <Upload className="w-8 h-8 text-slate-300 mb-2" />
                  <span className="text-sm text-slate-400">Ketuk untuk ambil foto</span>
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

          {/* Submit Button */}
          <div className="px-5 pb-5">
            <button
              id="submit-report"
              type="submit"
              disabled={submitting || !roomId}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Mengirim Laporan...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Kirim Laporan
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6 mb-8">
          Laporan Anda akan ditangani oleh tim Sarpras ITATS
        </p>
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
