<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_device_id')->constrained('whatsapp_devices')->cascadeOnDelete();
            $table->text('qr_string')->nullable();
            $table->timestamp('qr_expires_at')->nullable();
            $table->text('last_disconnect_reason')->nullable();
            $table->timestamp('keepalive_at')->nullable();
            $table->string('session_path')->nullable();
            $table->text('session_blob_encrypted')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_sessions');
    }
};
