<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whats_app_logs', function (Blueprint $table) {
            $table->foreignId('whatsapp_device_id')->nullable()->after('technician_id')->constrained('whatsapp_devices')->nullOnDelete();
            $table->string('wa_message_id')->nullable()->after('target_number');
            $table->string('message_type')->nullable()->after('message');
            $table->string('callback_id')->nullable()->after('message_type');
            $table->json('payload')->nullable()->after('provider_response');
            $table->timestamp('sent_at')->nullable()->after('payload');
            $table->timestamp('received_at')->nullable()->after('sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('whats_app_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('whatsapp_device_id');
            $table->dropColumn([
                'wa_message_id',
                'message_type',
                'callback_id',
                'payload',
                'sent_at',
                'received_at',
            ]);
        });
    }
};
