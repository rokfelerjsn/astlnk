<?php

namespace Tests\Feature;

use App\Models\Building;
use App\Models\Category;
use App\Models\Room;
use App\Models\Technician;
use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppWebhookCallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_dikerjakan_callback_updates_ticket_to_in_progress(): void
    {
        config()->set('services.whatsapp_bridge.api_key', 'secret');

        $ticket = $this->createTicket();

        Http::fake([
            '*' => Http::response(['status' => 'sent']),
        ]);

        $response = $this->withHeader('X-Bridge-Key', 'secret')
            ->postJson('/api/webhook/whatsapp-custom', [
                'from' => '6281234567890',
                'callback_id' => 'dikerjakan_'.$ticket->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('ticket_status', 'in_progress');

        $this->assertDatabaseHas('tickets', [
            'id' => $ticket->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_selesai_callback_is_idempotent(): void
    {
        config()->set('services.whatsapp_bridge.api_key', 'secret');

        $ticket = $this->createTicket(['status' => 'done', 'resolved_at' => now()]);

        Http::fake([
            '*' => Http::response(['status' => 'sent']),
        ]);

        $response = $this->withHeader('X-Bridge-Key', 'secret')
            ->postJson('/api/webhook/whatsapp-custom', [
                'from' => '6281234567890',
                'callback_id' => 'selesai_'.$ticket->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'idempotent_done');
    }

    public function test_text_button_fallback_uses_quoted_message_id(): void
    {
        config()->set('services.whatsapp_bridge.api_key', 'secret');

        $ticket = $this->createTicket(['wa_message_id' => 'MSG-ASSIGN-1']);

        Http::fake([
            '*' => Http::response(['status' => 'sent']),
        ]);

        $response = $this->withHeader('X-Bridge-Key', 'secret')
            ->postJson('/api/webhook/whatsapp-custom', [
                'from' => '1234567890',
                'sender_candidates' => ['1234567890', '6281234567890'],
                'text' => 'Mulai Kerjakan',
                'quoted_message_id' => 'MSG-ASSIGN-1',
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('ticket_status', 'in_progress');

        $this->assertDatabaseHas('tickets', [
            'id' => $ticket->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_text_button_fallback_can_infer_technician_from_quoted_message(): void
    {
        config()->set('services.whatsapp_bridge.api_key', 'secret');

        $ticket = $this->createTicket(['wa_message_id' => 'MSG-LID-1']);

        Http::fake([
            '*' => Http::response(['status' => 'sent']),
        ]);

        $response = $this->withHeader('X-Bridge-Key', 'secret')
            ->postJson('/api/webhook/whatsapp-custom', [
                'from' => '999999999',
                'sender_candidates' => ['999999999'],
                'text' => 'Mulai Kerjakan',
                'quoted_message_id' => 'MSG-LID-1',
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('ticket_status', 'in_progress');

        $this->assertDatabaseHas('whats_app_logs', [
            'ticket_id' => $ticket->id,
            'technician_id' => $ticket->technician_id,
            'direction' => 'incoming',
            'callback_id' => 'dikerjakan_'.$ticket->id,
        ]);
    }

    public function test_callback_replies_to_original_whatsapp_jid(): void
    {
        config()->set('services.whatsapp_bridge.api_key', 'secret');
        config()->set('services.whatsapp_bridge.url', 'http://127.0.0.1:7474');

        $ticket = $this->createTicket();
        $requests = [];

        Http::fake(function ($request) use (&$requests) {
            $requests[] = $request->data();

            return Http::response([
                'status' => 'sent',
                'device_id' => 1,
                'message_id' => 'MSG-REPLY',
            ]);
        });

        $response = $this->withHeader('X-Bridge-Key', 'secret')
            ->postJson('/api/webhook/whatsapp-custom', [
                'from' => '165146274091011',
                'from_jid' => '165146274091011@lid',
                'sender_candidates' => ['165146274091011', '6281234567890'],
                'callback_id' => 'dikerjakan_'.$ticket->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('ticket_status', 'in_progress');

        $this->assertCount(2, $requests);
        $this->assertSame('165146274091011@lid', $requests[0]['to']);
        $this->assertSame('165146274091011@lid', $requests[1]['to']);
    }

    public function test_non_technician_number_is_ignored(): void
    {
        config()->set('services.whatsapp_bridge.api_key', 'secret');

        $ticket = $this->createTicket();

        $response = $this->withHeader('X-Bridge-Key', 'secret')
            ->postJson('/api/webhook/whatsapp-custom', [
                'from' => '6289999999999',
                'callback_id' => 'dikerjakan_'.$ticket->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'ignored_non_technician');

        $this->assertDatabaseHas('tickets', [
            'id' => $ticket->id,
            'status' => 'assigned',
        ]);
    }

    private function createTicket(array $overrides = []): Ticket
    {
        $building = Building::create(['name' => 'Gedung D', 'code' => 'GD-D']);
        $room = Room::create(['building_id' => $building->id, 'room_number' => '382']);
        $category = Category::create(['name' => 'Kelistrikan']);
        $technician = Technician::create([
            'name' => 'Budi Santoso',
            'phone' => '081234567890',
            'status' => 'available',
        ]);

        return Ticket::create(array_merge([
            'ticket_code' => 'TK-75777',
            'reporter_name' => 'Mahasiswa',
            'reporter_phone' => '081111111111',
            'room_id' => $room->id,
            'category_id' => $category->id,
            'description' => 'Lampu ruangan tidak menyala',
            'status' => 'assigned',
            'technician_id' => $technician->id,
        ], $overrides));
    }
}
