<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Technician;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        ]);

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
        ]);

        $technician->update($validated);

        return response()->json($technician);
    }

    public function destroy(Technician $technician): JsonResponse
    {
        $technician->delete();

        return response()->json(['message' => 'Teknisi berhasil dihapus.']);
    }
}
