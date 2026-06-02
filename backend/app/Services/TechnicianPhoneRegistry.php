<?php

namespace App\Services;

use App\Models\Technician;
use Illuminate\Support\Collection;

class TechnicianPhoneRegistry
{
    public function normalize(?string $number): ?string
    {
        return Technician::normalizePhone($number);
    }

    public function find(?string $number): ?Technician
    {
        return Technician::findByPhone($number);
    }

    public function isAllowed(?string $number): bool
    {
        return (bool) $this->find($number);
    }

    public function activeNumbers(): Collection
    {
        return Technician::query()
            ->where('whatsapp_enabled', true)
            ->whereNotNull('normalized_phone')
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'normalized_phone', 'status', 'last_whatsapp_seen_at']);
    }
}
