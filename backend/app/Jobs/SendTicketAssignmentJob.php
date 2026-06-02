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

    public Ticket $ticket;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(Ticket $ticket)
    {
        $this->ticket = $ticket;
    }

    public function handle(): void
    {
        $this->ticket->loadMissing(['room.building', 'category', 'technician']);

        if (! WhatsAppService::sendTaskNotification($this->ticket)) {
            throw new \RuntimeException('Gagal mengirim notifikasi WhatsApp custom ke teknisi.');
        }
    }
}
