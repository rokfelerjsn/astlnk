'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Loader2, Search, Clock, MapPin, Tag, User, AlertCircle, Wrench, X, ChevronDown,
  Archive, CheckSquare, Square, Maximize2, Trash2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { Ticket, TicketStatus, Technician, Category, Building } from '@/lib/types';
import { STATUS_LABELS, STATUS_FLOW, timeAgo } from '@/lib/utils';

const ALLOWED_DRAG: Record<string, string[]> = {
  new: [],
  assigned: ['in_progress', 'new'],
  in_progress: ['done', 'assigned'],
  done: ['in_progress'],
};

function getErrorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === 'string') return response.data.message;
  }

  return fallback;
}

function KanbanBoard() {
  const searchParams = useSearchParams();
  const backendAssetBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [assigningTechnician, setAssigningTechnician] = useState<number | ''>('');
  const [updating, setUpdating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<number | null>(null);
  const [selectedDoneIds, setSelectedDoneIds] = useState<Set<number>>(new Set());
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const pollingBusyRef = useRef(false);
  const ticketFetchInFlightRef = useRef(false);
  const draggingRef = useRef(false);

  // Read URL query parameters
  useEffect(() => {
    const bldgId = searchParams.get('buildingId');
    const catId = searchParams.get('categoryId');
    const q = searchParams.get('search');
    const statusParam = searchParams.get('status');

    if (bldgId) setFilterBuilding(bldgId);
    if (catId) setFilterCategory(catId);
    if (q) setSearch(q);
    if (statusParam) setFilterStatus(statusParam);
  }, [searchParams]);

  useEffect(() => {
    pollingBusyRef.current = updating || archiving || bulkArchiving || deletingTicketId !== null;
  }, [updating, archiving, bulkArchiving, deletingTicketId]);

  useEffect(() => {
    if (!isPhotoOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPhotoOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPhotoOpen]);

  const applyTickets = useCallback((rows: Ticket[]) => {
    setTickets(rows);
    setSelectedTicket((current) => {
      if (!current) return current;
      return rows.find((ticket) => ticket.id === current.id) ?? current;
    });
    setSelectedDoneIds((current) => {
      const activeDoneIds = new Set(rows.filter((ticket) => ticket.status === 'done').map((ticket) => ticket.id));
      return new Set(Array.from(current).filter((id) => activeDoneIds.has(id)));
    });
  }, []);

  const fetchTickets = useCallback(async () => {
    if (ticketFetchInFlightRef.current) return;
    ticketFetchInFlightRef.current = true;

    try {
      const ticketsRes = await api.get('/admin/tickets');
      applyTickets(ticketsRes.data);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      ticketFetchInFlightRef.current = false;
    }
  }, [applyTickets]);

  const fetchData = useCallback(async () => {
    try {
      const [techsRes, catsRes, bldgsRes] = await Promise.all([
        api.get('/admin/technicians'),
        api.get('/admin/categories'), api.get('/admin/buildings')
      ]);
      await fetchTickets();
      setTechnicians(techsRes.data);
      setCategories(catsRes.data);
      setBuildings(bldgsRes.data);
    } catch (err) { console.error('Failed to load data', err); }
    finally { setLoading(false); }
  }, [fetchTickets]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (pollingBusyRef.current) return;
      if (draggingRef.current) return;
      fetchTickets();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [fetchTickets]);

  const handleDragEnd = async (result: DropResult) => {
    draggingRef.current = false;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TicketStatus;
    const oldStatus = source.droppableId as TicketStatus;
    const ticketId = parseInt(draggableId);
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    // Enforce drag rules
    if (!ALLOWED_DRAG[oldStatus]?.includes(newStatus)) {
      if (oldStatus === 'new' && newStatus === 'assigned') {
        alert('Untuk memindahkan ke Ditugaskan, buka detail tiket dan tugaskan teknisi terlebih dahulu.');
      } else {
        alert(`Tidak dapat memindahkan tiket dari "${STATUS_LABELS[oldStatus]}" ke "${STATUS_LABELS[newStatus]}".`);
      }
      return;
    }

    const prevStatus = ticket.status;
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    try {
      await api.patch(`/admin/tickets/${ticketId}/status`, { status: newStatus });
      await fetchTickets();
    } catch (err) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: prevStatus } : t));
      alert('Gagal mengupdate status tiket.');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !assigningTechnician) return;
    setUpdating(true);
    try {
      await api.patch(`/admin/tickets/${selectedTicket.id}/assign`, { technician_id: assigningTechnician });
      setIsModalOpen(false);
      await fetchTickets();
    } catch (err) { alert('Gagal menugaskan teknisi.'); }
    finally { setUpdating(false); }
  };

  const handleArchive = async (ticketId: number) => {
    setArchiving(true);
    try {
      await api.patch(`/admin/tickets/${ticketId}/archive`);
      setIsModalOpen(false);
      await fetchTickets();
      setSelectedDoneIds(prev => { const n = new Set(prev); n.delete(ticketId); return n; });
    } catch (err) { alert(getErrorMessage(err, 'Gagal mengarsipkan tiket.')); }
    finally { setArchiving(false); }
  };

  const handleDeleteTicket = async (ticket: Ticket, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (ticket.status !== 'new') return;
    if (!confirm(`Hapus tiket ${ticket.ticket_code}? Data tiket akan hilang dari Kanban.`)) return;

    setDeletingTicketId(ticket.id);
    try {
      await api.delete(`/admin/tickets/${ticket.id}`);
      setTickets(prev => prev.filter(t => t.id !== ticket.id));
      setSelectedTicket(current => current?.id === ticket.id ? null : current);
      setIsModalOpen(current => current && selectedTicket?.id === ticket.id ? false : current);
      await fetchTickets();
    } catch (err) {
      alert(getErrorMessage(err, 'Gagal menghapus tiket.'));
    } finally {
      setDeletingTicketId(null);
    }
  };
  const handleBulkArchive = async () => {
    if (selectedDoneIds.size === 0) return;
    if (!confirm(`Arsipkan ${selectedDoneIds.size} tiket ke riwayat?`)) return;
    setBulkArchiving(true);
    try {
      await api.post('/admin/tickets/bulk-archive', { ticket_ids: Array.from(selectedDoneIds) });
      setSelectedDoneIds(new Set());
      await fetchTickets();
    } catch (err) { alert('Gagal mengarsipkan tiket.'); }
    finally { setBulkArchiving(false); }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const s = search.toLowerCase();
      const matchSearch = !search || t.ticket_code.toLowerCase().includes(s) ||
        t.reporter_name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s) ||
        t.room?.room_number?.toLowerCase().includes(s) || t.room?.building?.name?.toLowerCase().includes(s) ||
        t.category?.name?.toLowerCase().includes(s);
      const matchCat = !filterCategory || t.category_id === Number(filterCategory);
      const matchBldg = !filterBuilding || t.room?.building_id === Number(filterBuilding);
      const matchStatus = !filterStatus || t.status === filterStatus ||
        (filterStatus === 'open' && (t.status === 'new')) ||
        (filterStatus === 'active' && (t.status === 'assigned' || t.status === 'in_progress'));
      return matchSearch && matchCat && matchBldg && matchStatus;
    });
  }, [tickets, search, filterCategory, filterBuilding, filterStatus]);

  const columns = STATUS_FLOW.reduce((acc, status) => {
    acc[status] = filteredTickets.filter(t => t.status === status);
    return acc;
  }, {} as Record<TicketStatus, Ticket[]>);

  const hasActiveFilters = !!filterCategory || !!filterBuilding;
  const doneTickets = columns['done'] || [];
  const allDoneSelected = doneTickets.length > 0 && doneTickets.every(t => selectedDoneIds.has(t.id));

  const toggleSelectAll = () => {
    if (allDoneSelected) { setSelectedDoneIds(new Set()); }
    else { setSelectedDoneIds(new Set(doneTickets.map(t => t.id))); }
  };

  const toggleSelectOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDoneIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col -mb-4 lg:-mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Tiket</h1>
          <p className="text-sm text-slate-500">Geser kartu tiket untuk mengubah status</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Cari tiket, pelapor, lokasi..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-72 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white" />
          </div>
          <div className="relative">
            <button onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3 py-2 border rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors ${hasActiveFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Filter
              {hasActiveFilters && <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">{(filterCategory ? 1 : 0) + (filterBuilding ? 1 : 0)}</span>}
              <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-[60] space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kategori</label>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white">
                    <option value="">Semua Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gedung</label>
                  <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white">
                    <option value="">Semua Gedung</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                {hasActiveFilters && <button onClick={() => { setFilterCategory(''); setFilterBuilding(''); }} className="w-full text-center text-sm text-red-600 hover:text-red-700 font-medium py-1.5">Reset Filter</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk archive bar */}
      {selectedDoneIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex-shrink-0">
          <span className="text-sm font-medium text-emerald-800">{selectedDoneIds.size} tiket dipilih</span>
          <button onClick={handleBulkArchive} disabled={bulkArchiving}
            className="ml-auto px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            {bulkArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Masukkan Riwayat
          </button>
          <button onClick={() => setSelectedDoneIds(new Set())} className="text-sm text-slate-500 hover:text-slate-700">Batal</button>
        </div>
      )}

      {/* Active filters notification bar */}
      {(hasActiveFilters || filterStatus || search) && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex-shrink-0 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2 text-sm text-indigo-900 font-medium">
            <span>Filter Aktif:</span>
            {filterStatus && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs">
                Status: {filterStatus === 'open' ? 'Tiket Terbuka' : filterStatus === 'active' ? 'Dalam Proses' : filterStatus === 'done' ? 'Selesai' : filterStatus}
              </span>
            )}
            {filterBuilding && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs">
                Gedung: {buildings.find(b => b.id === Number(filterBuilding))?.name || 'Loading...'}
              </span>
            )}
            {filterCategory && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs">
                Kategori: {categories.find(c => c.id === Number(filterCategory))?.name || 'Loading...'}
              </span>
            )}
            {search && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs">
                Pencarian: "{search}"
              </span>
            )}
          </div>
          <button 
            onClick={() => {
              setFilterCategory('');
              setFilterBuilding('');
              setFilterStatus('');
              setSearch('');
              window.history.replaceState(null, '', '/dashboard/tickets');
            }} 
            className="ml-auto px-3 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 min-h-0">
        <DragDropContext onDragStart={() => { draggingRef.current = true; }} onDragEnd={handleDragEnd}>
          <div className="flex gap-5 h-full items-stretch min-w-max px-1">
            {STATUS_FLOW.map((status) => (
              <div key={status} className={`w-80 flex flex-col h-full rounded-2xl kanban-col-${status} shadow-sm`}>
                <div className={`p-4 rounded-t-2xl kanban-${status} flex-shrink-0`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700">{STATUS_LABELS[status]}</h3>
                    <div className="flex items-center gap-2">
                      {status === 'done' && doneTickets.length > 0 && (
                        <button onClick={toggleSelectAll} className="p-1 rounded hover:bg-white/50 transition-colors" title="Pilih Semua">
                          {allDoneSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </button>
                      )}
                      <span className="bg-white/60 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{columns[status].length}</span>
                    </div>
                  </div>
                </div>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-3 custom-scrollbar transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}>
                      {columns[status].map((ticket, index) => (
                        <Draggable key={ticket.id.toString()} draggableId={ticket.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                              onClick={() => { setSelectedTicket(ticket); setAssigningTechnician(ticket.technician_id || ''); setIsModalOpen(true); }}
                              className={`bg-white p-4 mb-3 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-300 transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500/50 rotate-2' : ''} ${status === 'done' && selectedDoneIds.has(ticket.id) ? 'ring-2 ring-emerald-400 border-emerald-300' : ''}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  {status === 'done' && (
                                    <button onClick={(e) => toggleSelectOne(ticket.id, e)} className="flex-shrink-0">
                                      {selectedDoneIds.has(ticket.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                                    </button>
                                  )}
                                  <span className="text-xs font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-1 rounded-md">{ticket.ticket_code}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(ticket.created_at)}</span>
                                  {status === 'new' && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteTicket(ticket, e)}
                                      disabled={deletingTicketId === ticket.id}
                                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                      aria-label={`Hapus tiket ${ticket.ticket_code}`}
                                      title="Hapus tiket"
                                    >
                                      {deletingTicketId === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-slate-800 font-medium mb-3 line-clamp-2">{ticket.description}</p>
                              <div className="space-y-1.5 mb-1">
                                <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="w-3 h-3 text-slate-400" /><span className="truncate">{ticket.room?.room_number} - {ticket.room?.building?.name}</span></div>
                                <div className="flex items-center gap-2 text-xs text-slate-500"><Tag className="w-3 h-3 text-slate-400" /><span className="truncate">{ticket.category?.name}</span></div>
                                <div className="flex items-center gap-2 text-xs text-slate-500"><User className="w-3 h-3 text-slate-400" /><span className="truncate">{ticket.reporter_name}</span></div>
                              </div>
                              {ticket.technician && (
                                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center"><Wrench className="w-3 h-3 text-indigo-600" /></div>
                                  <span className="text-xs font-medium text-slate-700 truncate">{ticket.technician.name}</span>
                                </div>
                              )}
                              {!ticket.technician && status !== 'new' && status !== 'done' && (
                                <div className="pt-2 mt-2 border-t border-slate-100">
                                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center w-fit gap-1"><AlertCircle className="w-3 h-3" /> Belum ditugaskan</span>
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

      {/* Detail Modal */}
      {isModalOpen && selectedTicket && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-in-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                Detail Tiket <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-sm">{selectedTicket.ticket_code}</span>
              </h2>
              <button onClick={() => { setIsPhotoOpen(false); setIsModalOpen(false); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
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
                      <div className="relative flex items-center justify-center rounded-xl overflow-hidden border border-slate-200 bg-slate-50 min-h-40 max-h-72">
                        <img src={`${backendAssetBaseUrl}/storage/${selectedTicket.photo_path}`} alt="Foto lampiran tiket" className="w-full h-auto max-h-72 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Gb3RvIHRpZGFrIHRlcnNlZGlhPC90ZXh0Pjwvc3ZnPg=='; }} />
                        <button
                          type="button"
                          onClick={() => setIsPhotoOpen(true)}
                          className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/75 px-2.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-white/70"
                          aria-label="Buka foto ukuran penuh"
                        >
                          <Maximize2 className="w-4 h-4" />
                          Perbesar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Assign Technician */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Tugaskan Teknisi</h3>
                <form onSubmit={handleAssign} className="flex flex-col sm:flex-row gap-3">
                  <select value={assigningTechnician} onChange={(e) => setAssigningTechnician(Number(e.target.value))}
                    className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white">
                    <option value="">-- Pilih Teknisi --</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status === 'available' ? 'Tersedia' : 'Sibuk'}) - {t.tickets_count || 0} Tiket Aktif</option>)}
                  </select>
                  <button type="submit" disabled={updating || !assigningTechnician || assigningTechnician === selectedTicket.technician_id}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {updating && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
                  </button>
                </form>
              </div>

              {/* Archive button for done tickets */}
              {selectedTicket.status === 'done' && (
                <div className="mt-4 border-t border-slate-100 pt-5">
                  <button onClick={() => handleArchive(selectedTicket.id)} disabled={archiving}
                    className="w-full px-5 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                    Masukkan Riwayat
                  </button>
                </div>
              )}
            </div>
          </div>
          {isPhotoOpen && selectedTicket.photo_path && (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-3 sm:p-6"
              onClick={() => setIsPhotoOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Foto lampiran ukuran penuh"
            >
              <button
                type="button"
                onClick={() => setIsPhotoOpen(false)}
                className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Tutup foto"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={`${backendAssetBaseUrl}/storage/${selectedTicket.photo_path}`}
                alt="Foto lampiran tiket ukuran penuh"
                className="max-h-full max-w-full object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function KanbanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>}>
      <KanbanBoard />
    </Suspense>
  );
}
