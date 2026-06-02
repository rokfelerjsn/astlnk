<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Technician;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TechnicianController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $technicians = Technician::withCount('tickets')
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->get();

        return response()->json($technicians);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'status' => 'sometimes|in:available,busy',
            'whatsapp_enabled' => 'sometimes|boolean',
        ]);

        $validated['normalized_phone'] = Technician::normalizePhone($validated['phone']);
        $this->ensureUniquePhone($validated['normalized_phone']);

        $technician = Technician::create($validated);

        return response()->json($technician, 201);
    }

    public function show(Technician $technician): JsonResponse
    {
        return response()->json($technician->load('tickets'));
    }

    public function update(Request $request, Technician $technician): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'status' => 'sometimes|in:available,busy',
            'whatsapp_enabled' => 'sometimes|boolean',
        ]);

        if (array_key_exists('phone', $validated)) {
            $validated['normalized_phone'] = Technician::normalizePhone($validated['phone']);
            $this->ensureUniquePhone($validated['normalized_phone'], $technician->id);
        }

        $technician->update($validated);

        return response()->json($technician);
    }

    public function destroy(Technician $technician): JsonResponse
    {
        $technician->delete();

        return response()->json(['message' => 'Teknisi berhasil dihapus.']);
    }

    private function ensureUniquePhone(?string $normalizedPhone, ?int $ignoreId = null): void
    {
        if (! $normalizedPhone) {
            throw ValidationException::withMessages([
                'phone' => ['Nomor WhatsApp tidak valid.'],
            ]);
        }

        $exists = Technician::query()
            ->where('normalized_phone', $normalizedPhone)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'phone' => ['Nomor WhatsApp sudah digunakan teknisi lain.'],
            ]);
        }
    }
}
