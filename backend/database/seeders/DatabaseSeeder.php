<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\Category;
use App\Models\Room;
use App\Models\Technician;
use App\Models\Ticket;
use App\Models\TicketLog;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create Admin User
        User::create([
            'name' => 'Admin Sarpras',
            'email' => 'admin@asetlink.id',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        // Buildings
        $buildings = [
            ['name' => 'Gedung A - Teknik Informatika', 'code' => 'GD-A'],
            ['name' => 'Gedung B - Teknik Elektro', 'code' => 'GD-B'],
            ['name' => 'Gedung C - Teknik Mesin', 'code' => 'GD-C'],
            ['name' => 'Gedung D - Teknik Sipil', 'code' => 'GD-D'],
            ['name' => 'Gedung E - Fakultas Sains', 'code' => 'GD-E'],
        ];

        foreach ($buildings as $b) {
            Building::create($b);
        }

        // Rooms
        $rooms = [];
        foreach (Building::all() as $building) {
            for ($floor = 1; $floor <= 3; $floor++) {
                for ($room = 1; $room <= 4; $room++) {
                    $rooms[] = Room::create([
                        'building_id' => $building->id,
                        'room_number' => $building->code . '-' . $floor . '0' . $room,
                    ]);
                }
            }
        }

        // Categories
        $categories = [
            ['name' => 'AC / Pendingin', 'icon' => 'Snowflake'],
            ['name' => 'Proyektor', 'icon' => 'Monitor'],
            ['name' => 'Meja & Kursi', 'icon' => 'Armchair'],
            ['name' => 'Listrik & Stopkontak', 'icon' => 'Zap'],
            ['name' => 'Pintu & Jendela', 'icon' => 'DoorOpen'],
            ['name' => 'Papan Tulis', 'icon' => 'PenTool'],
            ['name' => 'Lampu', 'icon' => 'Lightbulb'],
            ['name' => 'Komputer/PC', 'icon' => 'Laptop'],
            ['name' => 'Lainnya', 'icon' => 'MoreHorizontal'],
        ];

        foreach ($categories as $cat) {
            Category::create($cat);
        }

        // Technicians
        $technicians = [
            ['name' => 'Budi Santoso', 'phone' => '081234567890', 'status' => 'available'],
            ['name' => 'Agus Prasetyo', 'phone' => '081234567891', 'status' => 'available'],
            ['name' => 'Dedi Hermawan', 'phone' => '081234567892', 'status' => 'busy'],
            ['name' => 'Eko Wijaya', 'phone' => '081234567893', 'status' => 'available'],
            ['name' => 'Fajar Rahman', 'phone' => '081234567894', 'status' => 'available'],
        ];

        foreach ($technicians as $tech) {
            Technician::create($tech);
        }

        // Sample Tickets
        $statuses = ['new', 'assigned', 'in_progress', 'done'];
        $descriptions = [
            'AC tidak dingin, sudah dicoba matikan dan nyalakan kembali tapi tetap tidak berfungsi.',
            'Proyektor tidak bisa menampilkan gambar, lampu indikator berkedip merah.',
            'Beberapa kursi patah dan tidak layak digunakan oleh mahasiswa.',
            'Stopkontak di dinding belakang mengeluarkan percikan api saat digunakan.',
            'Pintu kelas tidak bisa dikunci dari luar, engsel sudah longgar.',
            'Papan tulis retak dan sulit ditulis, perlu penggantian.',
            'Lampu di bagian depan kelas mati, sudah hampir 2 minggu.',
            'Monitor komputer di lab berkedip-kedip dan kadang mati sendiri.',
            'AC mengeluarkan bunyi berisik saat dinyalakan.',
            'Proyektor gambar blur, sudah dibersihkan lensa tapi tetap sama.',
        ];
        $names = ['Ahmad Rizki', 'Siti Nurhaliza', 'Budi Pratama', 'Diana Putri', 'Eko Saputra', 'Fitri Handayani', 'Galih Prasetyo', 'Hana Safira'];

        $allRooms = Room::all();
        $allCategories = Category::all();
        $allTechnicians = Technician::all();

        for ($i = 0; $i < 25; $i++) {
            $status = $statuses[array_rand($statuses)];
            $room = $allRooms->random();
            $category = $allCategories->random();
            $createdAt = now()->subDays(rand(1, 60))->subHours(rand(0, 23));

            $ticket = Ticket::create([
                'ticket_code' => Ticket::generateTicketCode(),
                'reporter_name' => $names[array_rand($names)],
                'reporter_phone' => '08' . rand(1000000000, 9999999999),
                'room_id' => $room->id,
                'category_id' => $category->id,
                'description' => $descriptions[array_rand($descriptions)],
                'status' => $status,
                'technician_id' => in_array($status, ['assigned', 'in_progress', 'done']) ? $allTechnicians->random()->id : null,
                'resolved_at' => $status === 'done' ? $createdAt->copy()->addDays(rand(1, 7)) : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            // Create log entries
            TicketLog::create([
                'ticket_id' => $ticket->id,
                'from_status' => null,
                'to_status' => 'new',
                'notes' => 'Laporan baru diterima.',
                'changed_by' => 'system',
                'created_at' => $createdAt,
            ]);

            if (in_array($status, ['assigned', 'in_progress', 'done'])) {
                TicketLog::create([
                    'ticket_id' => $ticket->id,
                    'from_status' => 'new',
                    'to_status' => 'assigned',
                    'notes' => 'Teknisi ditugaskan.',
                    'changed_by' => 'Admin Sarpras',
                    'created_at' => $createdAt->copy()->addHours(rand(1, 12)),
                ]);
            }

            if (in_array($status, ['in_progress', 'done'])) {
                TicketLog::create([
                    'ticket_id' => $ticket->id,
                    'from_status' => 'assigned',
                    'to_status' => 'in_progress',
                    'notes' => 'Perbaikan sedang dilakukan.',
                    'changed_by' => 'Admin Sarpras',
                    'created_at' => $createdAt->copy()->addDays(rand(1, 3)),
                ]);
            }

            if ($status === 'done') {
                TicketLog::create([
                    'ticket_id' => $ticket->id,
                    'from_status' => 'in_progress',
                    'to_status' => 'done',
                    'notes' => 'Perbaikan selesai.',
                    'changed_by' => 'Admin Sarpras',
                    'created_at' => $ticket->resolved_at,
                ]);
            }
        }
    }
}
