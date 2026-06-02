<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->string('wa_message_id')->nullable()->after('archived_at');
            $table->timestamp('wa_sent_at')->nullable()->after('wa_message_id');
            $table->foreignId('wa_device_id')->nullable()->after('wa_sent_at')->constrained('whatsapp_devices')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('wa_device_id');
            $table->dropColumn(['wa_message_id', 'wa_sent_at']);
        });
    }
};
