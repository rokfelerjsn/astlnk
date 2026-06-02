# AsetLink - Sistem Pelaporan & Pelacakan Aset Sarpras

AsetLink adalah platform manajemen pelaporan, pelacakan, dan perbaikan aset sarana prasarana yang terintegrasi dengan WhatsApp Custom Bridge. Sistem ini memakai backend Laravel, frontend Next.js, dan bridge WhatsApp Custom untuk koneksi multi-device, QR pairing, notifikasi teknisi, serta callback button.

## Struktur Project

- `backend`: Laravel REST API, dashboard API, webhook WhatsApp, dan source of truth data tiket.
- `frontend`: Next.js untuk dashboard admin dan form laporan publik.
- `whatsapp-bridge`: Node.js bridge berbasis Baileys untuk koneksi WhatsApp multi-device.

## Prasyarat

- PHP 8.2 atau lebih baru
- Composer
- Node.js 18 atau lebih baru
- npm
- MySQL atau SQLite
- Akun WhatsApp aktif untuk dihubungkan melalui Linked Devices

## Setup Backend

Masuk ke folder backend:

```bash
cd backend
```

Instal dependensi PHP:

```bash
composer install
```

Buat file `.env` dari contoh:

```bash
cp .env.example .env
```

Atur database dan konfigurasi bridge di `.env`:

```env
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=asetlink
DB_USERNAME=root
DB_PASSWORD=your_mysql_password

WHATSAPP_BRIDGE_URL=http://127.0.0.1:7474
WHATSAPP_BRIDGE_API_KEY=your_internal_bridge_key
WHATSAPP_DEFAULT_DEVICE_ID=1
WHATSAPP_WEBHOOK_SECRET=your_internal_bridge_key
```

Generate application key:

```bash
php artisan key:generate
```

Jalankan migrasi dan seeder:

```bash
php artisan migrate --seed
```

Akun admin default:

- Email: `admin@asetlink.id`
- Password: `password`

Jalankan backend:

```bash
php artisan serve
```

Backend berjalan di `http://127.0.0.1:8000`.

## Setup Frontend

Masuk ke folder frontend:

```bash
cd ../frontend
```

Instal dependensi:

```bash
npm install
```

Jalankan frontend:

```bash
npm run dev
```

Frontend berjalan di `http://localhost:3000`.

Jika perlu mengubah endpoint backend, buat `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

## Setup WhatsApp Custom Bridge

Masuk ke folder bridge:

```bash
cd ../whatsapp-bridge
```

Instal dependensi:

```bash
npm install
```

Buat file `.env` dari contoh:

```bash
cp .env.example .env
```

Atur konfigurasi bridge:

```env
WHATSAPP_BRIDGE_HOST=127.0.0.1
WHATSAPP_BRIDGE_PORT=7474
WHATSAPP_BRIDGE_API_KEY=your_internal_bridge_key
WHATSAPP_DEFAULT_DEVICE_ID=1
LARAVEL_API_URL=http://127.0.0.1:8000/api
LARAVEL_BRIDGE_KEY=your_internal_bridge_key
```

Jalankan bridge:

```bash
npm start
```

Bridge berjalan di `http://127.0.0.1:7474`.


## Menghubungkan Device WhatsApp

1. Jalankan backend, frontend, dan bridge.
2. Buka `http://localhost:3000/dashboard/devices`.
3. Klik `Tambah Device` jika belum ada device.
4. Klik `Connect`.
5. Scan QR dari WhatsApp melalui menu Linked Devices.
6. Status device akan berubah menjadi `Connected`.

## Alur Kerja Notifikasi Tiket

1. Admin membuat atau memilih tiket di dashboard.
2. Admin menugaskan tiket ke teknisi yang ada di menu `Dashboard > Teknisi`.
3. Backend memvalidasi nomor teknisi dari tabel `technicians`.
4. Backend mengirim payload tugas ke WhatsApp Custom Bridge.
5. Bridge mengirim pesan WhatsApp ke teknisi berisi detail tiket, foto lampiran bila ada, dan tombol:
   - `Mulai Kerjakan`
   - `Tandai Selesai`
6. Saat teknisi menekan tombol, bridge meneruskan callback ke endpoint Laravel:
   - `POST /api/webhook/whatsapp-custom`
7. Laravel memvalidasi teknisi, tiket, dan callback, lalu memperbarui status tiket.

## Aturan Nomor Teknisi

- Bridge dan backend hanya memproses pesan dari nomor teknisi yang terdaftar.
- Nomor teknisi dikelola di `http://localhost:3000/dashboard/technicians`.
- Outbound notification hanya dikirim ke teknisi yang aktif dan `whatsapp_enabled`.
- Callback dari nomor yang bukan teknisi akan diabaikan.

## Endpoint Utama

Backend:

- `POST /api/webhook/whatsapp-custom`
- `GET /api/internal/whatsapp/technician-numbers`
- `GET /api/admin/whatsapp/devices`
- `POST /api/admin/whatsapp/devices`
- `POST /api/admin/whatsapp/devices/{device}/connect`
- `POST /api/admin/whatsapp/devices/{device}/disconnect`
- `POST /api/admin/whatsapp/devices/{device}/restart`
- `DELETE /api/admin/whatsapp/devices/{device}`

Bridge:

- `GET /api/devices`
- `POST /api/devices`
- `POST /api/devices/{device}/connect`
- `POST /api/devices/{device}/disconnect`
- `POST /api/devices/{device}/restart`
- `POST /api/messages/task-notification`
- `POST /api/messages/text`
- `POST /api/messages/completion-prompt`
- `GET /api/technician-numbers`

## Menjalankan Test

Backend:

```bash
cd backend
php artisan test
```

Bridge:

```bash
cd whatsapp-bridge
npm test
```

## Catatan Operasional

- Jangan menjalankan dua bridge dengan session WhatsApp yang sama.
- Jika device sering bermasalah, disconnect device dari dashboard, hapus device, lalu scan QR ulang.
- Session bridge tersimpan di `whatsapp-bridge/storage/sessions`.
- `whatsapp-bridge/storage` tidak boleh dibagikan ke environment lain jika memakai nomor WhatsApp yang sama.
