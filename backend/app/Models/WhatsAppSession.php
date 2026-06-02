<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppSession extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_sessions';

    protected $fillable = [
        'whatsapp_device_id',
        'qr_string',
        'qr_expires_at',
        'last_disconnect_reason',
        'keepalive_at',
        'session_path',
        'session_blob_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'qr_expires_at' => 'datetime',
            'keepalive_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(WhatsAppDevice::class, 'whatsapp_device_id');
    }
}
