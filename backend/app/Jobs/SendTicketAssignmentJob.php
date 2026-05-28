<?php

namespace App\Jobs;

use App\Models\Ticket;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendTicketAssignmentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $ticket;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(Ticket $ticket)
    {
        $this->ticket = $ticket;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Pastikan relasi sudah ter-load
        $this->ticket->loadMissing(['room.building', 'category', 'technician']);

        $technician = $this->ticket->technician;

        if (!$technician || !$technician->phone) {
            return;
        }

        $appUrl = config('app.url');

        // Menyusun pesan sesuai template baru
        $message = "🛑 *Pemberitahuan Tugas Baru*\n\n";
        $message .= "Halo *{$technician->name}*,\n";
        $message .= "Anda telah ditugaskan untuk tiket baru dengan detail sebagai berikut:\n\n";
        
        $message .= "🎫 *Kode Tiket*: {$this->ticket->ticket_code}\n";
        $message .= "👤 *Pelapor*: {$this->ticket->reporter_name}\n";
        $message .= "🏢 *Lokasi*: {$this->ticket->room->room_number} ({$this->ticket->room->building->name})\n";
        $message .= "🏷 *Kategori*: {$this->ticket->category->name}\n";
        $message .= "📝 *Deskripsi*: {$this->ticket->description}\n\n\n";
        
        $message .= "✅Update status via WhatsApp:\n";
        $message .= "- ONPROGRESS {$this->ticket->ticket_code}\n";
        $message .= "- DONE {$this->ticket->ticket_code}\n";
        $message .= "- REJECT {$this->ticket->ticket_code}";

        // Tambahkan lampiran gambar jika pelapor melampirkan foto
        $fileUrl = null;
        if ($this->ticket->photo_path) {
            $fileUrl = asset('storage/' . $this->ticket->photo_path);
        }

        $success = WhatsAppService::send($technician->phone, $message, $this->ticket->id, $technician->id, $fileUrl);

        if (!$success) {
            // Jika gagal, job ini akan throw exception dan di-retry otomatis
            throw new \Exception("Gagal mengirim WhatsApp ke teknisi.");
        }
    }
}
