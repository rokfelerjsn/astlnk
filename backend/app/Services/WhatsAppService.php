<?php

namespace App\Services;

use App\Models\WhatsAppLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    /**
     * Send a WhatsApp message using Fonnte API and log the request.
     *
     * @param string $target The phone number to send to
     * @param string $message The message content
     * @param int|null $ticketId Optional ticket ID for relationship
     * @param int|null $technicianId Optional technician ID for relationship
     * @param string|null $fileUrl Optional public URL to a file/image to attach
     * @return bool True if successfully sent, false otherwise
     */
    public static function send(string $target, string $message, ?int $ticketId = null, ?int $technicianId = null, ?string $fileUrl = null): bool
    {
        $fonnteToken = config('services.fonnte.token');

        if (!$fonnteToken) {
            Log::error('Fonnte token is missing in configuration.');
            return false;
        }

        $log = WhatsAppLog::create([
            'ticket_id' => $ticketId,
            'technician_id' => $technicianId,
            'target_number' => $target,
            'message' => $message,
            'direction' => 'outgoing',
            'status' => 'pending',
        ]);

        try {
            $payload = [
                'target' => $target,
                'message' => $message,
                'delay' => '1',
            ];

            // Tambahkan parameter URL media jika ada
            if ($fileUrl) {
                $payload['url'] = $fileUrl;
            }

            $response = Http::withHeaders([
                'Authorization' => $fonnteToken,
            ])->post('https://api.fonnte.com/send', $payload);

            $responseData = $response->json();

            if ($response->successful() && isset($responseData['status']) && $responseData['status'] === true) {
                $log->update([
                    'status' => 'sent',
                    'provider_response' => $responseData,
                ]);
                return true;
            }

            $log->update([
                'status' => 'failed',
                'provider_response' => $responseData,
                'error_message' => $responseData['reason'] ?? 'Unknown API error',
            ]);
            return false;

        } catch (\Exception $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            Log::error('Fonnte API Error: ' . $e->getMessage());
            return false;
        }
    }
}
