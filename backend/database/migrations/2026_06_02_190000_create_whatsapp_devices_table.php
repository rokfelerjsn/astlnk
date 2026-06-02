<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_devices', function (Blueprint $table) {
            $table->id();
            $table->string('display_name');
            $table->string('phone_number')->nullable();
            $table->string('provider')->default('baileys');
            $table->string('status')->default('disconnected');
            $table->string('quality_rating')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('connected_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_devices');
    }
};
