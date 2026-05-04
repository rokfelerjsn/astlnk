<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
     * Admin: List all tickets with filters
     */
    public function index(Request $request): JsonResponse
    {
        $tickets = Ticket::with(['room.building', 'category', 'technician'])
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
            'status' => 'required|in:new,validated,assigned,in_progress,done',
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

        if ($ticket->status === 'validated' || $ticket->status === 'new') {
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

        return response()->json($ticket->load(['room.building', 'category', 'technician']));
    }
}
