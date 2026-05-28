<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\Technician;
use App\Models\Ticket;
use App\Models\TicketLog;
use App\Models\WebhookLog;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FonnteWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $payload = $request->all();

        // 1. Simpan raw payload
        $webhookLog = WebhookLog::create([
            'payload' => $payload,
        ]);

        try {
            // Fonnte webhook payload format: sender (phone), message, text dll.
            $sender = $request->input('sender');
            $message = $request->input('message') ?? $request->input('text'); // Fonnte sometimes uses 'text' or 'message'

            if (!$sender || !$message) {
                return response()->json(['status' => 'ignored', 'reason' => 'No sender or message']);
            }

            // Normalisasi pesan: hapus spasi berlebih, jadikan uppercase untuk command
            $messageText = trim($message);
            $parts = explode(' ', $messageText);
            
            if (count($parts) < 2) {
                $this->sendInvalidCommandReply($sender);
                return response()->json(['status' => 'invalid_format']);
            }

            $command = strtoupper(trim($parts[0]));
            $ticketCode = strtoupper(trim($parts[1]));

            $validCommands = ['ONPROGRESS', 'DONE', 'REJECT'];

            if (!in_array($command, $validCommands)) {
                $this->sendInvalidCommandReply($sender);
                return response()->json(['status' => 'invalid_command']);
            }

            // 2. Cari tiket
            $ticket = Ticket::where('ticket_code', $ticketCode)->first();
            if (!$ticket) {
                $this->sendInvalidCommandReply($sender);
                return response()->json(['status' => 'ticket_not_found']);
            }

            // 3. Cari teknisi berdasarkan nomor (Format nomor kadang +62, 62, atau 08. Normalisasi bisa diperlukan)
            // Fonnte biasanya mengirim sender seperti '628xxxx' atau '08xxxx'. 
            // Untuk sederhana, kita cocokkan string.
            $technician = Technician::where('phone', $sender)->first();
            
            // Jika tidak ketemu langsung, coba normalisasi dasar (hapus awalan)
            if (!$technician) {
                // Misalnya sender = 628123... kita coba cari 08123... dll
                // Untuk sekarang kita asumsikan database dan Fonnte formatnya cukup konsisten, atau gunakan LIKE
                $technician = Technician::where('phone', 'like', '%' . substr($sender, -8))->first();
            }

            if (!$technician || $ticket->technician_id !== $technician->id) {
                WhatsAppService::send($sender, "⚠️ Anda tidak memiliki wewenang untuk memperbarui tiket ini.");
                return response()->json(['status' => 'unauthorized']);
            }

            // 4. Mapping command ke status
            $newStatus = '';
            $notes = '';
            switch ($command) {
                case 'ONPROGRESS':
                    $newStatus = 'in_progress';
                    $notes = 'Status diubah ke in_progress oleh teknisi via WhatsApp.';
                    break;
                case 'DONE':
                    $newStatus = 'done';
                    $notes = 'Status diubah ke selesai oleh teknisi via WhatsApp.';
                    break;
                case 'REJECT':
                    // Jika REJECT, kita kembalikan ke 'new' dan hapus technician_id
                    $newStatus = 'new';
                    $notes = 'Penugasan ditolak oleh teknisi via WhatsApp.';
                    break;
            }

            $oldStatus = $ticket->status;
            
            if ($command === 'REJECT') {
                $ticket->technician_id = null;
                $ticket->status = $newStatus;
            } else {
                $ticket->status = $newStatus;
                if ($newStatus === 'done') {
                    $ticket->resolved_at = now();
                }
            }
            
            $ticket->save();

            TicketLog::create([
                'ticket_id' => $ticket->id,
                'from_status' => $oldStatus,
                'to_status' => $newStatus,
                'notes' => $notes,
                'changed_by' => $technician->name,
            ]);

            $webhookLog->update([
                'processed' => true,
                'processed_at' => now(),
            ]);

            // 5. Kirim balasan berhasil (Template 2)
            $replyMessage = "✅ *STATUS TIKET DIPERBARUI*\n";
            $replyMessage .= str_repeat("━", 25) . "\n\n";
            $replyMessage .= "Kode Tiket : {$ticketCode}\n";
            $replyMessage .= "Status Baru: " . strtoupper($newStatus) . " ✅\n\n";
            
            if ($command === 'REJECT') {
                $replyMessage .= "Tugas telah ditolak. Admin akan menugaskan teknisi lain.";
            } else {
                $replyMessage .= "Terima kasih telah melakukan update tugas.";
            }

            WhatsAppService::send($sender, $replyMessage, $ticket->id, $technician->id);

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('Webhook processing error: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Internal server error'], 500);
        }
    }

    private function sendInvalidCommandReply(string $sender)
    {
        $message = "⚠️ *FORMAT PESAN TIDAK DIKENALI*\n";
        $message .= str_repeat("━", 25) . "\n\n";
        $message .= "Gunakan format berikut:\n\n";
        $message .= "- ONPROGRESS {kode_tiket}\n";
        $message .= "- DONE {kode_tiket}\n";
        $message .= "- REJECT {kode_tiket}\n\n";
        $message .= "Contoh: DONE TK-04383";

        WhatsAppService::send($sender, $message);
    }
}
