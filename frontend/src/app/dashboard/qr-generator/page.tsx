'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, QrCode, Building2, DoorOpen, Printer, Download, MapPin, Wrench } from 'lucide-react';
import api from '@/lib/api';
import { Building, Room } from '@/lib/types';

export default function QRGeneratorPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [generating, setGenerating] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const getReportUrl = (roomId: number) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/report?room_id=${roomId}`;
    }

    return `${process.env.NEXT_PUBLIC_FRONTEND_URL || ''}/report?room_id=${roomId}`;
  };

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const res = await api.get('/admin/buildings');
        setBuildings(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (!selectedBuilding) {
      setRooms([]);
      setSelectedRoom(null);
      setQrUrl(null);
      return;
    }

    const fetchRooms = async () => {
      try {
        const res = await api.get('/admin/rooms', { params: { building_id: selectedBuilding } });
        setRooms(res.data);
        setSelectedRoom(null);
        setQrUrl(null);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRooms();
  }, [selectedBuilding]);

  const handleGenerate = async () => {
    if (!selectedRoom) return;
    setGenerating(true);
    try {
      const res = await api.post(`/admin/rooms/${selectedRoom.id}/qr`);
      setQrUrl(getReportUrl(selectedRoom.id));
      
      // Update room local state
      setRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, qr_path: res.data.qr_path } : r));
      setSelectedRoom({ ...selectedRoom, qr_path: res.data.qr_path });
    } catch (err) {
      alert('Gagal generate QR Code');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40; // padding
      canvas.height = img.height + 80; // padding + text space
      
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Ruang ${selectedRoom?.room_number}`, canvas.width / 2, canvas.height - 25);
        
        const a = document.createElement('a');
        a.download = `QR-${selectedRoom?.room_number}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">QR Code Generator</h1>
        <p className="text-sm text-slate-500">Generate dan cetak QR Code untuk pelaporan per ruangan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
        {/* Selection Area (Hidden when printing) */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Pilih Lokasi
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gedung</label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%2394a3b8%22%20d%3d%22M2%204l4%204%204-4%22%2f%3e%3c%2fsvg%3e')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat"
                >
                  <option value="">-- Pilih Gedung --</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {selectedBuilding && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ruangan</label>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {rooms.map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedRoom(r);
                          if (r.qr_path) {
                            setQrUrl(getReportUrl(r.id));
                          } else {
                            setQrUrl(null);
                          }
                        }}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                          selectedRoom?.id === r.id
                            ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-bold text-slate-900 font-mono text-sm">{r.room_number}</span>
                          {r.qr_path && <div className="w-2 h-2 rounded-full bg-emerald-500" title="QR Generated" />}
                        </div>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <DoorOpen className="w-3 h-3" /> Ruang
                        </span>
                      </button>
                    ))}
                    {rooms.length === 0 && (
                      <div className="col-span-2 text-center p-4 text-sm text-slate-500 border border-dashed rounded-xl border-slate-200">
                        Tidak ada ruangan di gedung ini.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-100 min-h-[500px] flex flex-col items-center justify-center print:border-none print:shadow-none print:p-0">
            {selectedRoom ? (
              <div className="w-full max-w-md mx-auto text-center animate-fade-in">
                {/* Print Template Structure */}
                <div id="print-area" className="bg-white border-2 border-slate-200 rounded-3xl p-8 mb-8 shadow-sm relative overflow-hidden print:border-4 print:border-black print:m-0 print:shadow-none">
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-indigo-600 rounded-tl-3xl opacity-20 print:border-black"></div>
                  <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-indigo-600 rounded-tr-3xl opacity-20 print:border-black"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-indigo-600 rounded-bl-3xl opacity-20 print:border-black"></div>
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-indigo-600 rounded-br-3xl opacity-20 print:border-black"></div>
                  
                  <div className="mb-6 flex flex-col items-center">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3 print:bg-black print:text-white">
                      <Wrench className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase print:text-black">AsetLink ITATS</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1 print:text-black font-semibold">Sistem Pelaporan Kerusakan</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-sm inline-block mb-6 print:shadow-none">
                    {qrUrl ? (
                      <QRCodeSVG
                        id="qr-svg"
                        value={qrUrl}
                        size={220}
                        bgColor={"#ffffff"}
                        fgColor={"#0f172a"}
                        level={"H"}
                        includeMargin={false}
                      />
                    ) : (
                      <div className="w-[220px] h-[220px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                        <QrCode className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-sm font-medium">QR Belum Dibuat</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 print:bg-white print:border-2 print:border-black">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-indigo-600 print:text-black" />
                      <p className="text-xs font-semibold text-slate-500 uppercase print:text-black">Lokasi</p>
                    </div>
                    <p className="text-3xl font-extrabold text-indigo-900 font-mono tracking-wider mb-1 print:text-black">{selectedRoom.room_number}</p>
                    <p className="text-sm text-slate-600 font-medium print:text-black">{buildings.find(b => b.id === selectedRoom.building_id)?.name}</p>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 mt-6 font-medium print:text-black">Scan untuk melaporkan kerusakan fasilitas di ruangan ini.</p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 print:hidden">
                  {!qrUrl ? (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                      Generate QR Code
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handlePrint}
                        className="px-6 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-lg shadow-slate-800/20"
                      >
                        <Printer className="w-5 h-5" /> Cetak (Print)
                      </button>
                      <button
                        onClick={handleDownload}
                        className="px-6 py-3 bg-white text-slate-700 border border-slate-200 font-medium rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" /> Download PNG
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 print:hidden">
                <QrCode className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-slate-600">Pilih gedung dan ruangan</p>
                <p className="text-sm">untuk melihat preview QR Code</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Print only CSS to hide everything else */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            max-width: 400px;
          }
        }
      `}</style>
    </div>
  );
}
