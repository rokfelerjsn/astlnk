<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class WhatsAppDevice extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_devices';

    protected $fillable = [
        'display_name',
        'phone_number',
        'provider',
        'status',
        'quality_rating',
        'last_seen_at',
        'connected_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'connected_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function session(): HasOne
    {
        return $this->hasOne(WhatsAppSession::class, 'whatsapp_device_id');
    }
}
