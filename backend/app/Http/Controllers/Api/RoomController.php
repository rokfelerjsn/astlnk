<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Facades\Storage;

class RoomController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rooms = Room::with('building')
            ->withCount('tickets')
            ->when($request->building_id, fn($q, $id) => $q->where('building_id', $id))
            ->when($request->search, fn($q, $s) => $q->where('room_number', 'like', "%{$s}%"))
            ->orderBy('room_number')
            ->get();

        return response()->json($rooms);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'building_id' => 'required|exists:buildings,id',
            'room_number' => 'required|string|max:50',
        ]);

        $room = Room::create($validated);

        return response()->json($room->load('building'), 201);
    }

    public function show(Room $room): JsonResponse
    {
        return response()->json($room->load('building'));
    }

    public function update(Request $request, Room $room): JsonResponse
    {
        $validated = $request->validate([
            'building_id' => 'sometimes|exists:buildings,id',
            'room_number' => 'sometimes|string|max:50',
        ]);

        $room->update($validated);

        return response()->json($room->load('building'));
    }

    public function destroy(Room $room): JsonResponse
    {
        $room->delete();

        return response()->json(['message' => 'Ruangan berhasil dihapus.']);
    }

    public function generateQr(Room $room): JsonResponse
    {
        $url = config('app.frontend_url', 'http://localhost:3000') . '/report?room_id=' . $room->id;
        
        $qrContent = QrCode::format('svg')
            ->size(300)
            ->margin(2)
            ->generate($url);

        $filename = 'qrcodes/room-' . $room->id . '.svg';
        Storage::disk('public')->put($filename, $qrContent);
        
        $room->update(['qr_path' => $filename]);

        return response()->json([
            'qr_path' => Storage::disk('public')->url($filename),
            'url' => $url,
        ]);
    }
}
