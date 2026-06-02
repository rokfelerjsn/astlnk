<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsAppLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'technician_id',
        'target_number',
        'message',
        'direction',
        'status',
        'provider_response',
        'error_message',
        'whatsapp_device_id',
        'wa_message_id',
        'message_type',
        'callback_id',
        'payload',
        'sent_at',
        'received_at',
    ];

    protected $casts = [
        'provider_response' => 'array',
        'payload' => 'array',
        'sent_at' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    public function technician()
    {
        return $this->belongsTo(Technician::class);
    }

    public function device()
    {
        return $this->belongsTo(WhatsAppDevice::class, 'whatsapp_device_id');
    }
}
