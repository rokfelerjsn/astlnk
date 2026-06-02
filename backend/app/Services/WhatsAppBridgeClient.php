<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class WhatsAppBridgeClient
{
    public function health(): array
    {
        return $this->request()->get('/healthz')->throw()->json() ?? [];
    }

    public function devices(): array
    {
        return $this->request()->get('/api/devices')->throw()->json() ?? [];
    }

    public function createDevice(array $payload): array
    {
        return $this->request()->post('/api/devices', $payload)->throw()->json() ?? [];
    }

    public function updateDevice(int|string $id, array $payload): array
    {
        return $this->request()->patch("/api/devices/{$id}", $payload)->throw()->json() ?? [];
    }

    public function connectDevice(int|string $id): array
    {
        return $this->request(45)->post("/api/devices/{$id}/connect")->throw()->json() ?? [];
    }

    public function disconnectDevice(int|string $id): array
    {
        return $this->request()->post("/api/devices/{$id}/disconnect")->throw()->json() ?? [];
    }

    public function restartDevice(int|string $id): array
    {
        return $this->request(45)->post("/api/devices/{$id}/restart")->throw()->json() ?? [];
    }

    public function deleteDevice(int|string $id): array
    {
        return $this->request()->delete("/api/devices/{$id}")->throw()->json() ?? [];
    }

    public function sendTaskNotification(array $payload): array
    {
        return $this->request(60)->post('/api/messages/task-notification', $payload)->throw()->json() ?? [];
    }

    public function sendCompletionPrompt(array $payload): array
    {
        return $this->request(60)->post('/api/messages/completion-prompt', $payload)->throw()->json() ?? [];
    }

    public function sendText(array $payload): array
    {
        return $this->request(30)->post('/api/messages/text', $payload)->throw()->json() ?? [];
    }

    private function request(int $timeout = 15): PendingRequest
    {
        $headers = [];
        $apiKey = config('services.whatsapp_bridge.api_key');

        if ($apiKey) {
            $headers['Authorization'] = 'Bearer '.$apiKey;
            $headers['X-Bridge-Key'] = $apiKey;
        }

        return Http::baseUrl(rtrim((string) config('services.whatsapp_bridge.url'), '/'))
            ->timeout($timeout)
            ->acceptJson()
            ->asJson()
            ->withHeaders($headers);
    }
}
