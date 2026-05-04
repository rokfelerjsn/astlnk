<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Building;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuildingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $buildings = Building::withCount('rooms')
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->get();

        return response()->json($buildings);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:buildings',
        ]);

        $building = Building::create($validated);

        return response()->json($building, 201);
    }

    public function show(Building $building): JsonResponse
    {
        return response()->json($building->load('rooms'));
    }

    public function update(Request $request, Building $building): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:buildings,code,' . $building->id,
        ]);

        $building->update($validated);

        return response()->json($building);
    }

    public function destroy(Building $building): JsonResponse
    {
        $building->delete();

        return response()->json(['message' => 'Gedung berhasil dihapus.']);
    }
}
