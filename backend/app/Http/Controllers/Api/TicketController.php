<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendTicketAssignmentJob;
use App\Models\Ticket;
use App\Models\TicketLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TicketController extends Controller
{
    /**
     * Public: Submit a new ticket report
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reporter_name' => 'required|string|max:255',
            'reporter_phone' => 'required|string|max:20',
            'room_id' => 'required|exists:rooms,id',
            'category_id' => 'required|exists:categories,id',
            'description' => 'required|string|max:2000',
            'photo' => 'nullable|image|max:5120', // 5MB max
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('tickets', 'public');
        }

        $ticket = Ticket::create([
            'ticket_code' => Ticket::generateTicketCode(),
            'reporter_name' => $validated['reporter_name'],
            'reporter_phone' => $validated['reporter_phone'],
            'room_id' => $validated['room_id'],
            'category_id' => $validated['category_id'],
            'description' => $validated['description'],
            'photo_path' => $photoPath,
            'status' => 'new',
        ]);

        // Create initial log
        TicketLog::create([
            'ticket_id' => $ticket->id,
            'from_status' => null,
            'to_status' => 'new',
            'notes' => 'Laporan baru diterima.',
            'changed_by' => 'system',
        ]);

        return response()->json([
            'ticket_code' => $ticket->ticket_code,
            'message' => 'Laporan berhasil dikirim.',
        ], 201);
    }

    /**
     * Public: Track a ticket by code
     */
    public function track(string $code): JsonResponse
    {
        $ticket = Ticket::where('ticket_code', $code)
            ->with(['room.building', 'category', 'technician', 'logs' => fn($q) => $q->orderBy('created_at')])
            ->first();

        if (! $ticket) {
            return response()->json(['message' => 'Tiket tidak ditemukan.'], 404);
        }

        return response()->json($ticket);
    }

    /**
     * Admin: List all tickets with filters (excludes archived)
     */
    public function index(Request $request): JsonResponse
    {
        $tickets = Ticket::with(['room.building', 'category', 'technician'])
            ->whereNull('archived_at')
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->room_id, fn($q, $id) => $q->where('room_id', $id))
            ->when($request->category_id, fn($q, $id) => $q->where('category_id', $id))
            ->when($request->building_id, fn($q, $id) => $q->whereHas('room', fn($rq) => $rq->where('building_id', $id)))
            ->when($request->search, fn($q, $s) => $q->where('ticket_code', 'like', "%{$s}%")
                ->orWhere('reporter_name', 'like', "%{$s}%"))
            ->orderByDesc('created_at')
            ->get();

        return response()->json($tickets);
    }

    /**
     * Admin: List archived tickets (history)
     */
    public function archived(Request $request): JsonResponse
    {
        $tickets = Ticket::with(['room.building', 'category', 'technician'])
            ->whereNotNull('archived_at')
            ->when($request->search, fn($q, $s) => $q->where(function ($query) use ($s) {
                $query->where('ticket_code', 'like', "%{$s}%")
                    ->orWhere('reporter_name', 'like', "%{$s}%");
            }))
            ->orderByDesc('archived_at')
            ->get();

        return response()->json($tickets);
    }

    /**
     * Admin: Show single ticket
     */
    public function show(Ticket $ticket): JsonResponse
    {
        return response()->json(
            $ticket->load(['room.building', 'category', 'technician', 'logs' => fn($q) => $q->orderBy('created_at')])
        );
    }

    /**
     * Admin: Update ticket status
     */
    public function updateStatus(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:new,assigned,in_progress,done',
            'notes' => 'nullable|string|max:500',
        ]);

        $fromStatus = $ticket->status;
        $ticket->status = $validated['status'];

        if ($validated['status'] === 'done') {
            $ticket->resolved_at = now();
        }

        $ticket->save();

        TicketLog::create([
            'ticket_id' => $ticket->id,
            'from_status' => $fromStatus,
            'to_status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
            'changed_by' => $request->user()?->name ?? 'admin',
        ]);

        return response()->json($ticket->load(['room.building', 'category', 'technician']));
    }

    /**
     * Admin: Assign technician to ticket
     */
    public function assign(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'technician_id' => 'required|exists:technicians,id',
        ]);

        $fromStatus = $ticket->status;
        $ticket->technician_id = $validated['technician_id'];

        if ($ticket->status === 'new') {
            $ticket->status = 'assigned';
        }

        $ticket->save();

        TicketLog::create([
            'ticket_id' => $ticket->id,
            'from_status' => $fromStatus,
            'to_status' => $ticket->status,
            'notes' => 'Teknisi ditugaskan.',
            'changed_by' => $request->user()?->name ?? 'admin',
        ]);

        // Dispatch job to send WhatsApp notification
        SendTicketAssignmentJob::dispatch($ticket);

        return response()->json($ticket->load(['room.building', 'category', 'technician']));
    }

    /**
     * Admin: Archive a single ticket (move to history)
     */
    public function archive(Request $request, Ticket $ticket): JsonResponse
    {
        if ($ticket->status !== 'done') {
            return response()->json(['message' => 'Hanya tiket dengan status Selesai yang dapat diarsipkan.'], 422);
        }

        $ticket->archived_at = now();
        $ticket->save();

        TicketLog::create([
            'ticket_id' => $ticket->id,
            'from_status' => 'done',
            'to_status' => 'done',
            'notes' => 'Tiket dipindahkan ke riwayat.',
            'changed_by' => $request->user()?->name ?? 'admin',
        ]);

        return response()->json(['message' => 'Tiket berhasil diarsipkan.']);
    }

    public function destroy(Ticket $ticket): JsonResponse
    {
        if ($ticket->status !== 'new') {
            return response()->json(['message' => 'Hanya tiket Baru yang dapat dihapus.'], 422);
        }

        if ($ticket->photo_path) {
            Storage::disk('public')->delete($ticket->photo_path);
        }

        $ticket->delete();

        return response()->json(['message' => 'Tiket berhasil dihapus.']);
    }

    /**
     * Admin: Bulk archive tickets (move to history)
     */
    public function bulkArchive(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ticket_ids' => 'required|array|min:1',
            'ticket_ids.*' => 'integer|exists:tickets,id',
        ]);

        $tickets = Ticket::whereIn('id', $validated['ticket_ids'])
            ->where('status', 'done')
            ->whereNull('archived_at')
            ->get();

        foreach ($tickets as $ticket) {
            $ticket->archived_at = now();
            $ticket->save();

            TicketLog::create([
                'ticket_id' => $ticket->id,
                'from_status' => 'done',
                'to_status' => 'done',
                'notes' => 'Tiket dipindahkan ke riwayat (bulk).',
                'changed_by' => $request->user()?->name ?? 'admin',
            ]);
        }

        return response()->json([
            'message' => $tickets->count() . ' tiket berhasil diarsipkan.',
            'archived_count' => $tickets->count(),
        ]);
    }
}
