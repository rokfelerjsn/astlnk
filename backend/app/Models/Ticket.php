<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_code',
        'reporter_name',
        'reporter_phone',
        'room_id',
        'category_id',
        'description',
        'photo_path',
        'status',
        'technician_id',
        'resolved_at',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(Technician::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(TicketLog::class);
    }

    /**
     * Generate a unique ticket code (TK-XXXXX format)
     */
    public static function generateTicketCode(): string
    {
        do {
            $code = 'TK-' . str_pad(random_int(0, 99999), 5, '0', STR_PAD_LEFT);
        } while (self::where('ticket_code', $code)->exists());

        return $code;
    }
}
