<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketLog;
use App\Models\WebhookLog;
use App\Models\WhatsAppLog;
use App\Services\TechnicianPhoneRegistry;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppWebhookController extends Controller
{
    public function __construct(private TechnicianPhoneRegistry $registry)
    {
    }

    public function handle(Request $request): JsonResponse
    {
        $apiKey = config('services.whatsapp_bridge.api_key');

        if ($apiKey && $request->header('X-Bridge-Key') !== $apiKey && $request->bearerToken() !== $apiKey) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $payload = $request->all();
        $webhookLog = WebhookLog::create(['payload' => $payload]);
        $senderCandidates = $this->extractSenderCandidates($payload);
        $sender = $senderCandidates[0] ?? null;
        $text = trim((string) ($payload['text'] ?? $payload['message'] ?? ''));
        $normalized = $this->registry->normalize($sender);
        $technician = $this->findTechnician($senderCandidates) ?: $this->findTechnicianFromQuotedMessage($payload);
        $callbackId = $this->extractCallback($payload) ?: $this->resolveTextCallback($text, $payload, $technician);
        $messageId = $this->extractMessageId($payload);
        $replyContext = $this->replyContext($payload);

        $incomingLog = WhatsAppLog::create([
            'technician_id' => $technician?->id,
            'target_number' => $normalized ?? (string) $sender,
            'wa_message_id' => $messageId,
            'message' => $callbackId ?: ($text ?: '[empty]'),
            'direction' => 'incoming',
            'status' => 'received',
            'message_type' => $callbackId ? 'interactive' : 'text',
            'callback_id' => $callbackId,
            'payload' => $payload,
            'received_at' => now(),
        ]);

        if (! $technician) {
            $incomingLog->update(['error_message' => 'ignored_non_technician']);
            $webhookLog->update(['processed' => true, 'processed_at' => now()]);

            return response()->json(['status' => 'ignored_non_technician']);
        }

        $technician->forceFill(['last_whatsapp_seen_at' => now()])->save();

        if (! $callbackId) {
            $webhookLog->update(['processed' => true, 'processed_at' => now()]);

            return response()->json(['status' => 'ignored', 'reason' => 'missing_callback']);
        }

        $parsed = $this->parseCallback($callbackId);

        if (! $parsed) {
            WhatsAppService::sendText($technician->normalized_phone, 'Callback tidak dikenal: '.$callbackId, array_merge($replyContext, [
                'technician_id' => $technician->id,
                'callback_id' => $callbackId,
            ]));

            $webhookLog->update(['processed' => true, 'processed_at' => now()]);

            return response()->json(['status' => 'invalid_callback']);
        }

        $ticket = Ticket::with(['room.building', 'category', 'technician'])->find($parsed['ticket_id']);

        if (! $ticket) {
            WhatsAppService::sendText($technician->normalized_phone, 'Tiket tidak ditemukan.', array_merge($replyContext, [
                'technician_id' => $technician->id,
                'callback_id' => $callbackId,
            ]));

            $webhookLog->update(['processed' => true, 'processed_at' => now()]);

            return response()->json(['status' => 'ticket_not_found']);
        }

        if ($ticket->technician_id !== $technician->id) {
            WhatsAppService::sendText($technician->normalized_phone, 'Anda tidak memiliki wewenang untuk memperbarui tiket ini.', array_merge($replyContext, [
                'ticket_id' => $ticket->id,
                'technician_id' => $technician->id,
                'callback_id' => $callbackId,
            ]));

            $webhookLog->update(['processed' => true, 'processed_at' => now()]);

            return response()->json(['status' => 'unauthorized']);
        }

        if ($this->isDuplicateCallback($incomingLog, $technician, $callbackId)) {
            $incomingLog->update([
                'ticket_id' => $ticket->id,
                'technician_id' => $technician->id,
                'error_message' => 'duplicate_callback',
            ]);

            $webhookLog->update(['processed' => true, 'processed_at' => now()]);

            return response()->json(['status' => 'duplicate_callback']);
        }

        $result = $this->applyAction($ticket, $technician, $parsed['action'], $callbackId, $replyContext);

        $incomingLog->update([
            'ticket_id' => $ticket->id,
            'technician_id' => $technician->id,
        ]);

        $webhookLog->update(['processed' => true, 'processed_at' => now()]);

        return response()->json($result);
    }

    private function applyAction(Ticket $ticket, $technician, string $action, string $callbackId, array $replyContext = []): array
    {
        if ($action === 'dikerjakan') {
            if ($ticket->status === 'done') {
                WhatsAppService::sendText($technician->normalized_phone, 'Tiket ini sudah selesai.', array_merge($replyContext, [
                    'ticket_id' => $ticket->id,
                    'technician_id' => $technician->id,
                    'callback_id' => $callbackId,
                ]));

                return ['status' => 'idempotent_done'];
            }

            if ($ticket->status === 'in_progress') {
                WhatsAppService::sendText($technician->normalized_phone, 'Tiket ini sedang dikerjakan.', array_merge($replyContext, [
                    'ticket_id' => $ticket->id,
                    'technician_id' => $technician->id,
                    'callback_id' => $callbackId,
                ]));

                return ['status' => 'idempotent_in_progress'];
            }

            $this->transition($ticket, 'in_progress', 'Status diubah ke in_progress oleh teknisi via WhatsApp.', $technician->name);

            WhatsAppService::sendText($technician->normalized_phone, 'Status tiket diubah ke Dikerjakan.', array_merge($replyContext, [
                'ticket_id' => $ticket->id,
                'technician_id' => $technician->id,
                'callback_id' => $callbackId,
            ]));

            WhatsAppService::sendCompletionPrompt($ticket->fresh(['room.building', 'category']), $technician, array_merge($replyContext, [
                'callback_id' => $callbackId,
            ]));

            return ['status' => 'success', 'ticket_status' => 'in_progress'];
        }

        if ($action === 'selesai') {
            if ($ticket->status === 'done') {
                WhatsAppService::sendText($technician->normalized_phone, 'Tiket ini sudah selesai sebelumnya.', array_merge($replyContext, [
                    'ticket_id' => $ticket->id,
                    'technician_id' => $technician->id,
                    'callback_id' => $callbackId,
                ]));

                return ['status' => 'idempotent_done'];
            }

            $this->transition($ticket, 'done', 'Status diubah ke selesai oleh teknisi via WhatsApp.', $technician->name);

            WhatsAppService::sendText($technician->normalized_phone, 'Tiket berhasil ditandai Selesai.', array_merge($replyContext, [
                'ticket_id' => $ticket->id,
                'technician_id' => $technician->id,
                'callback_id' => $callbackId,
            ]));

            WhatsAppService::sendTaskDoneMessage($ticket->fresh(['room.building', 'category']), $technician, array_merge($replyContext, [
                'callback_id' => $callbackId,
            ]));

            return ['status' => 'success', 'ticket_status' => 'done'];
        }

        if ($action === 'tolak') {
            if ($ticket->status === 'done') {
                WhatsAppService::sendText($technician->normalized_phone, 'Tiket ini sudah selesai dan tidak bisa ditolak.', array_merge($replyContext, [
                    'ticket_id' => $ticket->id,
                    'technician_id' => $technician->id,
                    'callback_id' => $callbackId,
                ]));

                return ['status' => 'idempotent_done'];
            }

            $oldStatus = $ticket->status;
            $ticket->forceFill([
                'status' => 'new',
                'technician_id' => null,
            ])->save();

            TicketLog::create([
                'ticket_id' => $ticket->id,
                'from_status' => $oldStatus,
                'to_status' => 'new',
                'notes' => 'Penugasan ditolak oleh teknisi via WhatsApp.',
                'changed_by' => $technician->name,
            ]);

            WhatsAppService::sendText($technician->normalized_phone, 'Tugas telah ditolak. Admin akan menugaskan teknisi lain.', array_merge($replyContext, [
                'ticket_id' => $ticket->id,
                'technician_id' => $technician->id,
                'callback_id' => $callbackId,
            ]));

            return ['status' => 'success', 'ticket_status' => 'new'];
        }

        return ['status' => 'invalid_callback'];
    }

    private function transition(Ticket $ticket, string $status, string $notes, string $changedBy): void
    {
        $oldStatus = $ticket->status;
        $ticket->status = $status;

        if ($status === 'done') {
            $ticket->resolved_at = now();
        }

        $ticket->save();

        TicketLog::create([
            'ticket_id' => $ticket->id,
            'from_status' => $oldStatus,
            'to_status' => $status,
            'notes' => $notes,
            'changed_by' => $changedBy,
        ]);
    }

    private function parseCallback(string $callbackId): ?array
    {
        if (! preg_match('/^(dikerjakan|selesai|tolak)_(\d+)$/', $callbackId, $matches)) {
            return null;
        }

        return [
            'action' => $matches[1],
            'ticket_id' => (int) $matches[2],
        ];
    }

    private function extractSender(array $payload): ?string
    {
        return $payload['from']
            ?? $payload['from_jid']
            ?? $payload['sender']
            ?? $payload['phone']
            ?? null;
    }

    private function extractSenderCandidates(array $payload): array
    {
        $candidates = [];

        foreach ($payload['sender_candidates'] ?? [] as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                $candidates[] = $candidate;
            }
        }

        $sender = $this->extractSender($payload);

        if ($sender) {
            array_unshift($candidates, $sender);
        }

        return array_values(array_unique($candidates));
    }

    private function findTechnician(array $candidates)
    {
        foreach ($candidates as $candidate) {
            $technician = $this->registry->find($candidate);

            if ($technician) {
                return $technician;
            }
        }

        return null;
    }

    private function findTechnicianFromQuotedMessage(array $payload)
    {
        return $this->ticketFromQuotedMessage($payload)?->technician;
    }

    private function extractCallback(array $payload): ?string
    {
        return $payload['callback_id']
            ?? $payload['button_id']
            ?? $payload['selected_id']
            ?? $payload['id']
            ?? null;
    }

    private function extractMessageId(array $payload): ?string
    {
        $messageId = $payload['message_id']
            ?? $payload['raw']['key']['id']
            ?? $payload['raw']['messageContextInfo']['messageSecret']
            ?? null;

        return is_string($messageId) && trim($messageId) !== '' ? $messageId : null;
    }

    private function replyContext(array $payload): array
    {
        $fromJid = $payload['from_jid'] ?? null;

        if (is_string($fromJid) && str_contains($fromJid, '@')) {
            return ['target_jid' => trim($fromJid)];
        }

        return [];
    }

    private function isDuplicateCallback(WhatsAppLog $incomingLog, $technician, string $callbackId): bool
    {
        if ($incomingLog->wa_message_id) {
            return WhatsAppLog::where('id', '<>', $incomingLog->id)
                ->where('direction', 'incoming')
                ->where('wa_message_id', $incomingLog->wa_message_id)
                ->exists();
        }

        return WhatsAppLog::where('id', '<>', $incomingLog->id)
            ->where('direction', 'incoming')
            ->where('technician_id', $technician->id)
            ->where('callback_id', $callbackId)
            ->where('created_at', '>=', now()->subSeconds(5))
            ->exists();
    }

    private function resolveTextCallback(string $text, array $payload, $technician): ?string
    {
        if (! $technician) {
            return null;
        }

        $action = match (mb_strtolower(trim($text))) {
            'mulai kerjakan' => 'dikerjakan',
            'tandai selesai' => 'selesai',
            default => null,
        };

        if (! $action) {
            return null;
        }

        $ticket = $this->ticketFromQuotedMessage($payload);

        if (! $ticket) {
            $ticket = Ticket::where('technician_id', $technician->id)
                ->whereIn('status', ['assigned', 'in_progress'])
                ->latest('updated_at')
                ->first();
        }

        return $ticket ? $action.'_'.$ticket->id : null;
    }

    private function ticketFromQuotedMessage(array $payload): ?Ticket
    {
        $quotedMessageId = $payload['quoted_message_id'] ?? null;

        if (! $quotedMessageId) {
            return null;
        }

        $ticket = Ticket::with('technician')->where('wa_message_id', $quotedMessageId)->first();

        if ($ticket) {
            return $ticket;
        }

        $log = WhatsAppLog::with('ticket.technician')->where('wa_message_id', $quotedMessageId)->latest()->first();

        return $log?->ticket;
    }
}
