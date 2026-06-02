<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('technicians', function (Blueprint $table) {
            $table->string('normalized_phone')->nullable()->after('phone');
            $table->boolean('whatsapp_enabled')->default(true)->after('status');
            $table->timestamp('last_whatsapp_seen_at')->nullable()->after('whatsapp_enabled');
        });

        $seen = [];

        DB::table('technicians')
            ->orderBy('id')
            ->get(['id', 'phone'])
            ->each(function ($technician) use (&$seen) {
                $normalized = $this->normalizePhone($technician->phone);

                if (! $normalized || isset($seen[$normalized])) {
                    return;
                }

                $seen[$normalized] = true;

                DB::table('technicians')
                    ->where('id', $technician->id)
                    ->update(['normalized_phone' => $normalized]);
            });

        Schema::table('technicians', function (Blueprint $table) {
            $table->unique('normalized_phone', 'technicians_normalized_phone_unique');
        });
    }

    public function down(): void
    {
        Schema::table('technicians', function (Blueprint $table) {
            $table->dropUnique('technicians_normalized_phone_unique');
            $table->dropColumn(['normalized_phone', 'whatsapp_enabled', 'last_whatsapp_seen_at']);
        });
    }

    private function normalizePhone(?string $number): ?string
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
};
