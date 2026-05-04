'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Loader2, Filter, Search, Clock, MapPin, Tag, User, AlertCircle, Wrench, X
} from 'lucide-react';
import api from '@/lib/api';
import { Ticket, TicketStatus, Technician } from '@/lib/types';
import { STATUS_LABELS, STATUS_FLOW, STATUS_COLORS, timeAgo } from '@/lib/utils';

export default function KanbanPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assigningTechnician, setAssigningTechnician] = useState<number | ''>('');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [ticketsRes, techsRes] = await Promise.all([
        api.get('/admin/tickets'),
        api.get('/admin/technicians')
      ]);
      setTickets(ticketsRes.data);
      setTechnicians(techsRes.data);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TicketStatus;
    const ticketId = parseInt(draggableId);
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket || ticket.status === newStatus) return;

    // Optimistic update
    const prevStatus = ticket.status;
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));

    try {
      await api.patch(`/admin/tickets/${ticketId}/status`, { status: newStatus });
      // Reload specific ticket to get logs updated, or just rely on state
      fetchData(); 
    } catch (err) {
      console.error('Failed to update status', err);
      // Revert optimistic update
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: prevStatus } : t));
      alert('Gagal mengupdate status tiket.');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !assigningTechnician) return;

    setUpdating(true);
    try {
      await api.patch(`/admin/tickets/${selectedTicket.id}/assign`, {
        technician_id: assigningTechnician
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to assign technician', err);
      alert('Gagal menugaskan teknisi.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.ticket_code.toLowerCase().includes(search.toLowerCase()) || 
    t.reporter_name.toLowerCase().includes(search.toLowerCase())
  );

  // Group tickets by status
  const columns = STATUS_FLOW.reduce((acc, status) => {
    acc[status] = filteredTickets.filter(t => t.status === status);
    return acc;
  }, {} as Record<TicketStatus, Ticket[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Tiket</h1>
          <p className="text-sm text-slate-500">Geser kartu tiket untuk mengubah status</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tiket atau pelapor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full items-start min-w-max px-1">
            {STATUS_FLOW.map((status) => (
              <div key={status} className="w-80 flex flex-col h-full bg-slate-100/50 rounded-2xl">
                <div className={`p-4 rounded-t-2xl kanban-${status}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700">{STATUS_LABELS[status]}</h3>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                      {columns[status].length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-3 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      {columns[status].map((ticket, index) => (
                        <Draggable key={ticket.id.toString()} draggableId={ticket.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setAssigningTechnician(ticket.technician_id || '');
                                setIsModalOpen(true);
                              }}
                              className={`bg-white p-4 mb-3 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-300 transition-all ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500/50 rotate-2' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-1 rounded-md">
                                  {ticket.ticket_code}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {timeAgo(ticket.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-800 font-medium mb-3 line-clamp-2">
                                {ticket.description}
                              </p>
                              <div className="space-y-1.5 mb-3">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span className="truncate">{ticket.room?.room_number} — {ticket.room?.building?.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Tag className="w-3 h-3 text-slate-400" />
                                  <span className="truncate">{ticket.category?.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span className="truncate">{ticket.reporter_name}</span>
                                </div>
                              </div>
                              
                              {ticket.technician && (
                                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Wrench className="w-3 h-3 text-indigo-600" />
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 truncate">
                                    {ticket.technician.name}
                                  </span>
                                </div>
                              )}
                              {!ticket.technician && status !== 'new' && status !== 'done' && (
                                <div className="pt-2 mt-2 border-t border-slate-100">
                                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center w-fit gap-1">
                                    <AlertCircle className="w-3 h-3" /> Belum ditugaskan
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Ticket Details Modal */}
      {isModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                Detail Tiket 
                <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-sm">{selectedTicket.ticket_code}</span>
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
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
                  
                  {selectedTicket.photo_path && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Foto Lampiran</h3>
                      <div className="rounded-xl overflow-hidden border border-slate-200 h-32 relative group cursor-pointer">
                        {/* Note: the photo URL will depend on server config. For dev we use localhost:8000/storage/ */}
                        <img 
                          src={`http://localhost:8000/storage/${selectedTicket.photo_path}`} 
                          alt="Lampiran kerusakan" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Gb3RvIHRpZGFrIHRlcnNlZGlhPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Form */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Tugaskan Teknisi</h3>
                <form onSubmit={handleAssign} className="flex gap-3">
                  <select
                    value={assigningTechnician}
                    onChange={(e) => setAssigningTechnician(Number(e.target.value))}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white"
                  >
                    <option value="">-- Pilih Teknisi --</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status === 'available' ? 'Tersedia' : 'Sibuk'}) - {t.tickets_count || 0} Tiket Aktif
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={updating || !assigningTechnician || assigningTechnician === selectedTicket.technician_id}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Simpan
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
