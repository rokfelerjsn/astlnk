<?php

namespace App\Services;

use App\Models\Technician;
use App\Models\Ticket;
use App\Models\WhatsAppDevice;
use App\Models\WhatsAppLog;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    public static function sendTaskNotification(Ticket $ticket): bool
    {
        return app(self::class)->sendTicketTask($ticket);
    }

    public static function sendText(string $target, string $message, ?array $context = null): bool
    {
        return app(self::class)->sendTextMessage($target, $message, $context ?? []);
    }

    public static function sendTaskDoneMessage(Ticket $ticket, Technician $technician, ?array $context = null): bool
    {
        return self::sendText($technician->normalized_phone ?: $technician->phone, app(self::class)->formatDoneMessage($ticket, $technician), array_merge($context ?? [], [
            'ticket_id' => $ticket->id,
            'technician_id' => $technician->id,
            'message_type' => 'text',
        ]));
    }

    public static function sendCompletionPrompt(Ticket $ticket, Technician $technician, ?array $context = null): bool
    {
        return app(self::class)->sendTicketCompletionPrompt($ticket, $technician, $context ?? []);
    }

    public static function send(string $target, string $message, ?int $ticketId = null, ?int $technicianId = null, ?string $fileUrl = null): bool
    {
        return self::sendText($target, $message, [
            'ticket_id' => $ticketId,
            'technician_id' => $technicianId,
            'message_type' => $fileUrl ? 'image' : 'text',
            'file_url' => $fileUrl,
        ]);
    }

    public static function normalizePhoneNumber(?string $number): ?string
    {
        return app(TechnicianPhoneRegistry::class)->normalize($number);
    }

    public function __construct(
        private WhatsAppBridgeClient $bridge,
        private TechnicianPhoneRegistry $registry
    ) {
    }

    public function sendTicketTask(Ticket $ticket): bool
    {
        $ticket->loadMissing(['room.building', 'category', 'technician']);
        $technician = $ticket->technician;
        $target = $technician?->normalized_phone ?: $technician?->phone;
        $allowedTechnician = $this->registry->find($target);
        $message = $this->formatTaskMessage($ticket);

        $log = WhatsAppLog::create([
            'ticket_id' => $ticket->id,
            'technician_id' => $technician?->id,
            'target_number' => $this->registry->normalize($target) ?? (string) $target,
            'message' => $message,
            'direction' => 'outgoing',
            'status' => 'pending',
            'message_type' => 'task_notification',
        ]);

        if (! $technician || ! $allowedTechnician || $allowedTechnician->id !== $technician->id) {
            $log->update([
                'status' => 'failed',
                'error_message' => 'RECIPIENT_NOT_TECHNICIAN',
            ]);

            return false;
        }

        $deviceId = $this->outboundDeviceId();

        try {
            $response = $this->bridge->sendTaskNotification([
                'device_id' => $deviceId,
                'to' => $this->latestTechnicianJid($allowedTechnician) ?? $allowedTechnician->normalized_phone,
                'ticket' => $this->ticketPayload($ticket, $allowedTechnician),
                'buttons' => [
                    ['id' => 'dikerjakan_'.$ticket->id, 'text' => 'Mulai Kerjakan'],
                    ['id' => 'selesai_'.$ticket->id, 'text' => 'Tandai Selesai'],
                ],
            ]);

            $messageId = $response['message_id'] ?? $response['key']['id'] ?? null;
            $deviceId = $this->existingDeviceId($response['device_id'] ?? null);

            $log->update([
                'status' => 'sent',
                'wa_message_id' => $messageId,
                'whatsapp_device_id' => $deviceId,
                'provider_response' => $response,
                'sent_at' => now(),
            ]);

            $ticket->forceFill([
                'wa_message_id' => $messageId,
                'wa_sent_at' => now(),
                'wa_device_id' => $deviceId,
            ])->save();

            return true;
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error('WhatsApp bridge task notification error: '.$e->getMessage());

            return false;
        }
    }

    public function sendTextMessage(string $target, string $message, array $context = []): bool
    {
        $technician = $this->registry->find($target);
        $normalized = $this->registry->normalize($target);

        $log = WhatsAppLog::create([
            'ticket_id' => $context['ticket_id'] ?? null,
            'technician_id' => $context['technician_id'] ?? $technician?->id,
            'target_number' => $normalized ?? $target,
            'message' => $message,
            'direction' => 'outgoing',
            'status' => 'pending',
            'message_type' => $context['message_type'] ?? 'text',
            'callback_id' => $context['callback_id'] ?? null,
        ]);

        if (! $technician) {
            $log->update([
                'status' => 'failed',
                'error_message' => 'RECIPIENT_NOT_TECHNICIAN',
            ]);

            return false;
        }

        try {
            $response = $this->bridge->sendText([
                'device_id' => $this->outboundDeviceId($context['device_id'] ?? null),
                'to' => $context['target_jid'] ?? $technician->normalized_phone,
                'message' => $message,
            ]);

            $deviceId = $this->existingDeviceId($response['device_id'] ?? null);

            $log->update([
                'status' => 'sent',
                'wa_message_id' => $response['message_id'] ?? $response['key']['id'] ?? null,
                'whatsapp_device_id' => $deviceId,
                'provider_response' => $response,
                'sent_at' => now(),
            ]);

            return true;
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error('WhatsApp bridge text error: '.$e->getMessage());

            return false;
        }
    }

    public function sendTicketCompletionPrompt(Ticket $ticket, Technician $technician, array $context = []): bool
    {
        $ticket->loadMissing(['room.building', 'category']);
        $target = $technician->normalized_phone ?: $technician->phone;
        $allowedTechnician = $this->registry->find($target);
        $message = "Tiket: #{$ticket->ticket_code}\nStatus: Dikerjakan\n\nTekan tombol di bawah untuk menyelesaikan.";

        $log = WhatsAppLog::create([
            'ticket_id' => $ticket->id,
            'technician_id' => $technician->id,
            'target_number' => $this->registry->normalize($target) ?? (string) $target,
            'message' => $message,
            'direction' => 'outgoing',
            'status' => 'pending',
            'message_type' => 'completion_prompt',
        ]);

        if (! $allowedTechnician || $allowedTechnician->id !== $technician->id) {
            $log->update([
                'status' => 'failed',
                'error_message' => 'RECIPIENT_NOT_TECHNICIAN',
            ]);

            return false;
        }

        try {
            $response = $this->bridge->sendCompletionPrompt([
                'device_id' => $this->outboundDeviceId($context['device_id'] ?? null),
                'to' => $context['target_jid'] ?? $allowedTechnician->normalized_phone,
                'ticket' => $this->ticketPayload($ticket, $technician),
            ]);

            $deviceId = $this->existingDeviceId($response['device_id'] ?? null);

            $log->update([
                'status' => 'sent',
                'wa_message_id' => $response['message_id'] ?? $response['key']['id'] ?? null,
                'whatsapp_device_id' => $deviceId,
                'provider_response' => $response,
                'sent_at' => now(),
            ]);

            return true;
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error('WhatsApp bridge completion prompt error: '.$e->getMessage());

            return false;
        }
    }

    public function formatTaskMessage(Ticket $ticket): string
    {
        $ticket->loadMissing(['room.building', 'category']);

        return "*Tugas Baru!*\n\n".
            "Kerusakan: *{$ticket->category?->name}*\n".
            "Lokasi: {$ticket->room?->building?->name} / R.{$ticket->room?->room_number}\n".
            "Pelapor: {$ticket->reporter_name} ({$ticket->reporter_phone})\n".
            "Deskripsi: {$ticket->description}\n\n".
            "Tiket: #{$ticket->ticket_code}\n".
            "Waktu Lapor: ".$this->formatDate($ticket->created_at);
    }

    public function formatDoneMessage(Ticket $ticket, Technician $technician): string
    {
        $ticket->loadMissing(['room.building', 'category']);

        return "*Tiket Selesai*\n\n".
            "Tiket: #{$ticket->ticket_code}\n".
            "Kerusakan: {$ticket->category?->name}\n".
            "Lokasi: {$ticket->room?->building?->name} / R.{$ticket->room?->room_number}\n".
            "Diselesaikan oleh: {$technician->name}\n".
            "Waktu: ".$this->formatDate($ticket->resolved_at ?? now())."\n\n".
            "Terima kasih atas kerja kerasnya.";
    }

    private function ticketPayload(Ticket $ticket, Technician $technician): array
    {
        return [
            'id' => $ticket->id,
            'ticket_code' => $ticket->ticket_code,
            'category' => $ticket->category?->name,
            'building' => $ticket->room?->building?->name,
            'room' => $ticket->room?->room_number,
            'reporter_name' => $ticket->reporter_name,
            'reporter_phone' => $ticket->reporter_phone,
            'description' => $ticket->description,
            'photo_url' => $ticket->photo_path ? asset('storage/'.$ticket->photo_path) : null,
            'photo_path' => $ticket->photo_path ? storage_path('app/public/'.$ticket->photo_path) : null,
            'created_at' => $this->formatDate($ticket->created_at),
            'technician_name' => $technician->name,
        ];
    }

    private function formatDate($value): string
    {
        $date = $value instanceof \DateTimeInterface ? $value : now();
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        return $date->format('d').' '.$months[((int) $date->format('n')) - 1].' '.$date->format('Y, H:i');
    }

    private function existingDeviceId(mixed $deviceId): ?int
    {
        if (! is_numeric($deviceId)) {
            return null;
        }

        $id = (int) $deviceId;

        return WhatsAppDevice::whereKey($id)->exists() ? $id : null;
    }

    private function latestTechnicianJid(Technician $technician): ?string
    {
        $logs = WhatsAppLog::where('technician_id', $technician->id)
            ->where('direction', 'incoming')
            ->whereNotNull('payload')
            ->latest()
            ->limit(20)
            ->get(['payload']);

        foreach ($logs as $log) {
            $jid = $log->payload['from_jid'] ?? null;

            if (is_string($jid) && str_contains($jid, '@')) {
                return trim($jid);
            }
        }

        return null;
    }

    private function outboundDeviceId(mixed $preferred = null): mixed
    {
        if ($preferred) {
            return $preferred;
        }

        return WhatsAppDevice::where('status', 'connected')
            ->orderByDesc('last_seen_at')
            ->value('id') ?: config('services.whatsapp_bridge.default_device_id');
    }
}
