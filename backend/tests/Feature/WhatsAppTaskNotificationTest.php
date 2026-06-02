<?php

namespace Tests\Feature;

use App\Models\Building;
use App\Models\Category;
use App\Models\Room;
use App\Models\Technician;
use App\Models\Ticket;
use App\Models\WhatsAppDevice;
use App\Models\WhatsAppLog;
use App\Services\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppTaskNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_notification_sends_only_to_registered_technician(): void
    {
        config()->set('services.whatsapp_bridge.url', 'http://127.0.0.1:7474');
        config()->set('services.whatsapp_bridge.default_device_id', 1);

        $ticket = $this->createTicket();
        $requests = [];

        Http::fake(function ($request) use (&$requests) {
            $requests[] = $request->data();

            return Http::response([
                'status' => 'sent',
                'device_id' => 1,
                'message_id' => 'MSG-1',
            ]);
        });

        $sent = WhatsAppService::sendTaskNotification($ticket);

        $this->assertTrue($sent);
        $this->assertSame('6281234567890', $requests[0]['to']);
        $this->assertSame('dikerjakan_'.$ticket->id, $requests[0]['buttons'][0]['id']);
        $this->assertDatabaseHas('whats_app_logs', [
            'ticket_id' => $ticket->id,
            'target_number' => '6281234567890',
            'status' => 'sent',
            'message_type' => 'task_notification',
        ]);
    }

    public function test_task_notification_prefers_connected_whatsapp_device(): void
    {
        config()->set('services.whatsapp_bridge.url', 'http://127.0.0.1:7474');
        config()->set('services.whatsapp_bridge.default_device_id', 1);

        WhatsAppDevice::forceCreate([
            'id' => 7,
            'display_name' => 'Connected Device',
            'provider' => 'baileys',
            'status' => 'connected',
            'quality_rating' => 'good',
            'last_seen_at' => now(),
        ]);

        $ticket = $this->createTicket();
        $requests = [];

        Http::fake(function ($request) use (&$requests) {
            $requests[] = $request->data();

            return Http::response([
                'status' => 'sent',
                'device_id' => 7,
                'message_id' => 'MSG-7',
            ]);
        });

        $sent = WhatsAppService::sendTaskNotification($ticket);

        $this->assertTrue($sent);
        $this->assertSame(7, $requests[0]['device_id']);
        $this->assertDatabaseHas('whats_app_logs', [
            'ticket_id' => $ticket->id,
            'whatsapp_device_id' => 7,
            'status' => 'sent',
        ]);
    }

    public function test_task_notification_uses_last_inbound_jid_when_available(): void
    {
        config()->set('services.whatsapp_bridge.url', 'http://127.0.0.1:7474');
        config()->set('services.whatsapp_bridge.default_device_id', 1);

        $ticket = $this->createTicket();
        $ticket->load('technician');

        WhatsAppLog::create([
            'ticket_id' => $ticket->id,
            'technician_id' => $ticket->technician_id,
            'target_number' => '249963489533971',
            'message' => 'dikerjakan_'.$ticket->id,
            'direction' => 'incoming',
            'status' => 'received',
            'message_type' => 'interactive',
            'callback_id' => 'dikerjakan_'.$ticket->id,
            'payload' => [
                'from_jid' => '249963489533971@lid',
            ],
            'received_at' => now(),
        ]);

        $requests = [];

        Http::fake(function ($request) use (&$requests) {
            $requests[] = $request->data();

            return Http::response([
                'status' => 'sent',
                'device_id' => 1,
                'message_id' => 'MSG-LID',
            ]);
        });

        $sent = WhatsAppService::sendTaskNotification($ticket);

        $this->assertTrue($sent);
        $this->assertSame('249963489533971@lid', $requests[0]['to']);
    }

    public function test_text_to_non_technician_is_rejected_before_bridge_call(): void
    {
        Http::fake();

        $sent = WhatsAppService::sendText('6289999999999', 'Test');

        $this->assertFalse($sent);
        Http::assertNothingSent();
        $this->assertDatabaseHas('whats_app_logs', [
            'target_number' => '6289999999999',
            'status' => 'failed',
            'error_message' => 'RECIPIENT_NOT_TECHNICIAN',
        ]);
    }

    private function createTicket(): Ticket
    {
        $building = Building::create(['name' => 'Gedung D', 'code' => 'GD-D']);
        $room = Room::create(['building_id' => $building->id, 'room_number' => '382']);
        $category = Category::create(['name' => 'Kelistrikan']);
        $technician = Technician::create([
            'name' => 'Budi Santoso',
            'phone' => '081234567890',
            'status' => 'available',
        ]);

        return Ticket::create([
            'ticket_code' => 'TK-75777',
            'reporter_name' => 'Mahasiswa',
            'reporter_phone' => '081111111111',
            'room_id' => $room->id,
            'category_id' => $category->id,
            'description' => 'Lampu ruangan tidak menyala',
            'status' => 'assigned',
            'technician_id' => $technician->id,
        ]);
    }
}
