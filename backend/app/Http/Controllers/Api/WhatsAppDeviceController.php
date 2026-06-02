<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppDevice;
use App\Models\WhatsAppLog;
use App\Services\TechnicianPhoneRegistry;
use App\Services\WhatsAppBridgeClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppDeviceController extends Controller
{
    public function __construct(
        private WhatsAppBridgeClient $bridge,
        private TechnicianPhoneRegistry $registry
    ) {
    }

    public function index(): JsonResponse
    {
        try {
            $remoteDevices = $this->bridge->devices();

            foreach ($remoteDevices['devices'] ?? $remoteDevices as $remoteDevice) {
                if (is_array($remoteDevice)) {
                    $this->syncRemoteDevice($remoteDevice);
                }
            }
        } catch (\Throwable) {
        }

        $devices = WhatsAppDevice::query()
            ->with('session')
            ->orderBy('display_name')
            ->get()
            ->map(fn (WhatsAppDevice $device) => $this->devicePayload($device));

        return response()->json($devices);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'provider' => 'sometimes|string|max:50',
        ]);

        $device = WhatsAppDevice::create([
            'display_name' => $validated['display_name'],
            'provider' => $validated['provider'] ?? 'baileys',
            'status' => 'disconnected',
            'quality_rating' => 'unknown',
        ]);

        $device->session()->create([
            'session_path' => 'storage/sessions/'.$device->id,
        ]);

        try {
            $remote = $this->bridge->createDevice([
                'id' => $device->id,
                'display_name' => $device->display_name,
                'provider' => $device->provider,
            ]);

            $this->syncRemoteDevice($remote['device'] ?? $remote);
        } catch (\Throwable $e) {
            $device->update([
                'metadata' => ['bridge_error' => $e->getMessage()],
            ]);
        }

        return response()->json($this->devicePayload($device->fresh('session')), 201);
    }

    public function update(Request $request, WhatsAppDevice $device): JsonResponse
    {
        $validated = $request->validate([
            'display_name' => 'sometimes|string|max:255',
        ]);

        $device->update($validated);

        try {
            $remote = $this->bridge->updateDevice($device->id, $validated);
            $this->syncRemoteDevice($remote['device'] ?? $remote);
        } catch (\Throwable $e) {
            $device->update([
                'metadata' => array_merge($device->metadata ?? [], ['bridge_error' => $e->getMessage()]),
            ]);
        }

        return response()->json($this->devicePayload($device->fresh('session')));
    }

    public function connect(WhatsAppDevice $device): JsonResponse
    {
        $result = $this->bridge->connectDevice($device->id);
        $this->syncRemoteDevice($result['device'] ?? $result);

        return response()->json($result);
    }

    public function disconnect(WhatsAppDevice $device): JsonResponse
    {
        $result = $this->bridge->disconnectDevice($device->id);
        $this->syncRemoteDevice($result['device'] ?? $result);

        return response()->json($result);
    }

    public function restart(WhatsAppDevice $device): JsonResponse
    {
        $result = $this->bridge->restartDevice($device->id);
        $this->syncRemoteDevice($result['device'] ?? $result);

        return response()->json($result);
    }

    public function destroy(WhatsAppDevice $device): JsonResponse
    {
        try {
            $this->bridge->deleteDevice($device->id);
        } catch (\Throwable) {
        }

        $device->delete();

        return response()->json(['message' => 'Device WhatsApp berhasil dihapus.']);
    }

    public function health(): JsonResponse
    {
        $payload = [
            'status' => 'unknown',
            'devices' => WhatsAppDevice::count(),
            'connected' => WhatsAppDevice::where('status', 'connected')->count(),
        ];

        try {
            $payload = array_merge($payload, $this->bridge->health());
        } catch (\Throwable $e) {
            $payload['status'] = 'error';
            $payload['message'] = $e->getMessage();
        }

        return response()->json($payload);
    }

    public function technicianNumbers(Request $request): JsonResponse
    {
        $apiKey = config('services.whatsapp_bridge.api_key');

        if ($apiKey && $request->header('X-Bridge-Key') !== $apiKey && $request->bearerToken() !== $apiKey) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'numbers' => $this->registry->activeNumbers()->values(),
            'generated_at' => now()->toISOString(),
        ]);
    }

    private function syncRemoteDevice(array $remote): ?WhatsAppDevice
    {
        $id = $remote['id'] ?? $remote['device_id'] ?? null;

        if (! is_numeric($id)) {
            return null;
        }

        $device = WhatsAppDevice::find((int) $id);

        if (! $device) {
            return null;
        }

        $device->update([
            'display_name' => $remote['display_name'] ?? $device->display_name,
            'phone_number' => $remote['phone_number'] ?? $remote['phone'] ?? $device->phone_number,
            'provider' => $remote['provider'] ?? $device->provider,
            'status' => $remote['status'] ?? $device->status,
            'quality_rating' => $remote['quality_rating'] ?? $device->quality_rating,
            'last_seen_at' => isset($remote['last_seen_at']) ? $remote['last_seen_at'] : $device->last_seen_at,
            'connected_at' => isset($remote['connected_at']) ? $remote['connected_at'] : $device->connected_at,
            'metadata' => $remote['metadata'] ?? $device->metadata,
        ]);

        if (array_key_exists('qr', $remote) || array_key_exists('expires_at', $remote)) {
            $device->session()->updateOrCreate([], [
                'qr_string' => $remote['qr'] ?? null,
                'qr_expires_at' => $remote['expires_at'] ?? null,
                'keepalive_at' => now(),
                'session_path' => 'storage/sessions/'.$device->id,
            ]);
        }

        return $device;
    }

    private function devicePayload(WhatsAppDevice $device): array
    {
        $session = $device->session;

        return [
            'id' => $device->id,
            'display_name' => $device->display_name,
            'phone_number' => $device->phone_number,
            'provider' => $device->provider,
            'status' => $device->status,
            'quality_rating' => $device->quality_rating,
            'last_seen_at' => $device->last_seen_at?->toISOString(),
            'connected_at' => $device->connected_at?->toISOString(),
            'messages_today' => WhatsAppLog::where('whatsapp_device_id', $device->id)->whereDate('created_at', today())->count(),
            'metadata' => $device->metadata,
            'qr' => $session?->qr_string,
            'expires_at' => $session?->qr_expires_at?->toISOString(),
        ];
    }
}
