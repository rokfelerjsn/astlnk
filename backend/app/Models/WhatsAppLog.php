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
    ];

    protected $casts = [
        'provider_response' => 'array',
    ];

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    public function technician()
    {
        return $this->belongsTo(Technician::class);
    }
}
