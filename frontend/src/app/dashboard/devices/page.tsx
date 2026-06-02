'use client';

import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Loader2, Plus, Power, RefreshCw, Smartphone, Trash2, Wifi, WifiOff } from 'lucide-react';
import {
  connectWhatsAppDevice,
  createWhatsAppDevice,
  deleteWhatsAppDevice,
  disconnectWhatsAppDevice,
  getWhatsAppDevices,
  restartWhatsAppDevice,
} from '@/lib/api';
import { WhatsAppConnectResult, WhatsAppDevice } from '@/lib/types';

function mergeDevice(device: WhatsAppDevice, result: WhatsAppConnectResult): WhatsAppDevice {
  return {
    ...device,
    id: result.id ?? result.device_id ?? device.id,
    status: result.status ?? device.status,
    qr: result.qr ?? device.qr,
    expires_at: result.expires_at ?? device.expires_at,
    phone_number: result.phone_number ?? result.phone ?? device.phone_number,
  };
}

function statusLabel(status: WhatsAppDevice['status']) {
  if (status === 'connected') return 'Connected';
  if (status === 'qr_pending') return 'QR Pending';
  if (status === 'error') return 'Error';
  if (status === 'banned') return 'Banned';
  return 'Disconnected';
}

function statusClass(status: WhatsAppDevice['status']) {
  if (status === 'connected') return 'text-emerald-700';
  if (status === 'qr_pending') return 'text-amber-700';
  if (status === 'error' || status === 'banned') return 'text-red-700';
  return 'text-slate-500';
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'WA';
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<WhatsAppDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const shouldPollDevices = useMemo(
    () => devices.some((device) => device.status === 'qr_pending' || device.status === 'error'),
    [devices]
  );

  const fetchDevices = async () => {
    try {
      const rows = await getWhatsAppDevices();
      setDevices(rows);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat device WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!shouldPollDevices) return;

    const timer = window.setInterval(fetchDevices, 4000);

    return () => window.clearInterval(timer);
  }, [shouldPollDevices]);

  const updateOne = (id: string | number, result: WhatsAppConnectResult) => {
    setDevices((current) => current.map((device) => String(device.id) === String(id) ? mergeDevice(device, result) : device));
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');

    try {
      const device = await createWhatsAppDevice({
        display_name: devices.length === 0 ? 'AsetLink WhatsApp' : `AsetLink WhatsApp ${devices.length + 1}`,
        provider: 'baileys',
      });
      setDevices((current) => [...current, device]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat device WhatsApp');
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async (device: WhatsAppDevice) => {
    setBusyId(device.id);
    setError('');

    try {
      updateOne(device.id, await connectWhatsAppDevice(device.id));
      await fetchDevices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal connect device WhatsApp');
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (device: WhatsAppDevice) => {
    setBusyId(device.id);
    setError('');

    try {
      updateOne(device.id, await disconnectWhatsAppDevice(device.id));
      await fetchDevices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal disconnect device WhatsApp');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestart = async (device: WhatsAppDevice) => {
    setBusyId(device.id);
    setError('');

    try {
      updateOne(device.id, await restartWhatsAppDevice(device.id));
      await fetchDevices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal restart device WhatsApp');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (device: WhatsAppDevice) => {
    if (!confirm('Yakin ingin menghapus device WhatsApp ini?')) return;

    setBusyId(device.id);
    setError('');

    try {
      await deleteWhatsAppDevice(device.id);
      setDevices((current) => current.filter((item) => String(item.id) !== String(device.id)));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menghapus device WhatsApp');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Devices</h1>
          <p className="text-sm text-slate-500">Kelola koneksi WhatsApp multi-device untuk notifikasi teknisi.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Tambah Device
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <Smartphone className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-base font-bold text-slate-900">Belum ada device</h2>
          <p className="mt-1 text-sm text-slate-500">Tambahkan device WhatsApp lalu scan QR dari Linked Devices.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {devices.map((device) => {
            const busy = String(busyId) === String(device.id);
            const connected = device.status === 'connected';
            const qrPending = device.status === 'qr_pending' && device.qr;

            return (
              <div key={device.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                      {initials(device.display_name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-slate-900">{device.display_name}</h2>
                      <p className="truncate text-sm text-slate-500">{device.phone_number || 'Belum terhubung'}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Multi-device</span>
                </div>

                <div className="mt-6 flex items-center justify-between text-sm">
                  <div className={`flex items-center gap-2 font-medium ${statusClass(device.status)}`}>
                    {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                    {statusLabel(device.status)}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    Quality
                    <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Messages Today</p>
                    <p className="mt-2 text-base font-bold text-slate-900">{device.messages_today ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Last Seen</p>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {device.last_seen_at ? new Date(device.last_seen_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </p>
                  </div>
                </div>

                {qrPending && (
                  <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <QRCodeSVG value={device.qr || ''} size={164} />
                      </div>
                      <div className="text-sm text-slate-600">
                        <p className="font-bold text-slate-900">Scan QR dari WhatsApp</p>
                        <p className="mt-1">Buka WhatsApp, masuk ke Linked Devices, lalu scan QR ini.</p>
                        {device.expires_at && (
                          <p className="mt-2 text-xs text-slate-500">Expired: {new Date(device.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {connected ? (
                    <button
                      onClick={() => handleDisconnect(device)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(device)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Connect
                    </button>
                  )}
                  <button
                    onClick={() => handleRestart(device)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                    Restart
                  </button>
                  <button
                    onClick={() => handleDelete(device)}
                    disabled={busy}
                    className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Hapus device"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
