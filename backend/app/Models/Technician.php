<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Technician extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'normalized_phone',
        'status',
        'whatsapp_enabled',
        'last_whatsapp_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'whatsapp_enabled' => 'boolean',
            'last_whatsapp_seen_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Technician $technician) {
            if ($technician->isDirty('phone') || ! $technician->normalized_phone) {
                $technician->normalized_phone = self::normalizePhone($technician->phone);
            }
        });
    }

    public static function normalizePhone(?string $number): ?string
    {
        if (! $number) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $number);

        if (! $digits) {
            return null;
        }

        if (str_starts_with($digits, '0')) {
            return '62'.substr($digits, 1);
        }

        if (str_starts_with($digits, '8')) {
            return '62'.$digits;
        }

        return $digits;
    }

    public static function findByPhone(?string $number): ?self
    {
        $normalized = self::normalizePhone($number);

        if (! $normalized) {
            return null;
        }

        return self::where('normalized_phone', $normalized)
            ->where('whatsapp_enabled', true)
            ->first();
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }
}
