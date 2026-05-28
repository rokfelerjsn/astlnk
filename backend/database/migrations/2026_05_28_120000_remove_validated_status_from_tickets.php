<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Update any 'validated' status tickets to 'new'
        DB::table('tickets')
            ->where('status', 'validated')
            ->update(['status' => 'new']);

        // 2. Update ticket logs
        DB::table('ticket_logs')
            ->where('from_status', 'validated')
            ->update(['from_status' => 'new']);

        DB::table('ticket_logs')
            ->where('to_status', 'validated')
            ->update(['to_status' => 'new']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No action needed for rollback as validated is obsolete
    }
};
