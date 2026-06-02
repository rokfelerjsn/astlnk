<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WhatsAppDeviceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_and_connect_device(): void
    {
        config()->set('services.whatsapp_bridge.url', 'http://127.0.0.1:7474');
        config()->set('services.whatsapp_bridge.api_key', 'secret');

        Sanctum::actingAs(User::factory()->create());

        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/api/devices') && $request->method() === 'POST') {
                return Http::response([
                    'device' => [
                        'id' => 1,
                        'display_name' => 'Sales Jakarta',
                        'status' => 'disconnected',
                        'provider' => 'baileys',
                    ],
                ]);
            }

            if (str_ends_with($request->url(), '/api/devices/1/connect')) {
                return Http::response([
                    'device_id' => 1,
                    'status' => 'qr_pending',
                    'qr' => 'qr-value',
                    'expires_at' => now()->addMinute()->toISOString(),
                    'transport' => 'baileys',
                ]);
            }

            return Http::response(['devices' => []]);
        });

        $created = $this->postJson('/api/admin/whatsapp/devices', [
            'display_name' => 'Sales Jakarta',
        ]);

        $created->assertCreated()
            ->assertJsonPath('display_name', 'Sales Jakarta');

        $connected = $this->postJson('/api/admin/whatsapp/devices/1/connect');

        $connected->assertOk()
            ->assertJsonPath('status', 'qr_pending')
            ->assertJsonPath('qr', 'qr-value');
    }

    public function test_guest_cannot_access_device_api(): void
    {
        $this->getJson('/api/admin/whatsapp/devices')->assertUnauthorized();
    }
}
