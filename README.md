# AsetLink - Sistem Pelaporan & Pelacakan Aset Sarpras

AsetLink adalah platform manajemen pelaporan, pelacakan, dan perbaikan aset sarana prasarana (sarpras) yang terintegrasi dengan WhatsApp Notification & Webhook Gateway menggunakan layanan **Fonnte**. 

Projek ini terdiri dari dua bagian utama:
1. **Backend**: Laravel 11 (RESTful API & Webhook handler)
2. **Frontend**: Next.js (Dashboard Admin & Form Pelaporan Publik)

---

## 🛠️ Prasyarat (Prerequisites)

Pastikan perangkat Anda sudah terinstal tools berikut:
* **PHP >= 8.2**
* **Composer**
* **Node.js >= 18** & **npm**
* **MySQL** atau database engine sejenis
* Akun **[Fonnte](https://fonnte.com)** (untuk token API WhatsApp dan Webhook)
* **Ngrok** atau **Expose** (untuk melakukan tunneling local server agar webhook Fonnte dapat diakses oleh internet)

---

## 🚀 Setup Project

### 1. Setup Backend (Laravel)

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```

2. Instal dependensi PHP:
   ```bash
   composer install
   ```

3. Duplikat file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

4. Buka file `.env` dan konfigurasikan database serta token Fonnte Anda:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=asetlink
   DB_USERNAME=root
   DB_PASSWORD=your_mysql_password
   
   # Token dari dashboard Fonnte Anda
   FONNTE_TOKEN=your_fonnte_device_token
   ```

5. Generate application key:
   ```bash
   php artisan key:generate
   ```

6. Buat database baru bernama `asetlink` di MySQL Anda, lalu jalankan migrasi beserta seeders untuk mengisi data awal:
   ```bash
   php artisan migrate --seed
   ```
   *Seeder akan membuat akun admin default:*
   * **Email**: `admin@asetlink.id`
   * **Password**: `password`
   * Serta beberapa data ruangan, kategori, teknisi, dan tiket demo.

7. Jalankan server lokal Laravel:
   ```bash
   php artisan serve
   ```
   Secara default backend akan berjalan di `http://127.0.0.1:8000`.

---

### 2. Setup Frontend (Next.js)

1. Masuk ke direktori frontend:
   ```bash
   cd ../frontend
   ```

2. Instal dependensi Node.js:
   ```bash
   npm install
   ```

3. Jalankan development server:
   ```bash
   npm run dev
   ```
   Secara default frontend akan berjalan di `http://localhost:3000`.
   *(Jika Anda ingin mengubah URL endpoint API backend, Anda dapat menambahkan file `.env.local` di dalam direktori frontend dan mendefinisikan `NEXT_PUBLIC_API_URL=http://your-backend-url/api`)*

---

## 🔗 Setup Webhook & WhatsApp Gateway (Fonnte)

Layanan webhook digunakan agar teknisi dapat memperbarui status tiket secara langsung dengan membalas pesan WhatsApp dari Fonnte.

### Langkah 1: Expose Backend ke Internet (Tunneling)
Karena Fonnte mengirimkan data webhook dari cloud, localhost Anda tidak dapat diakses langsung oleh Fonnte. Gunakan tunneling seperti **Ngrok**:

1. Jalankan ngrok pada port backend Laravel (default: `8000`):
   ```bash
   ngrok http 8000
   ```
2. Salin URL Forwarding HTTPS yang dihasilkan oleh Ngrok, misalnya: `https://abcd-1234-xx.ngrok-free.app`.

### Langkah 2: Konfigurasi Webhook di Dashboard Fonnte
1. Masuk ke dashboard [Fonnte](https://fonnte.com).
2. Pilih menu **Device** / Perangkat Anda yang aktif.
3. Temukan pengaturan **Webhook** lalu masukkan URL webhook projek dengan format berikut:
   ```text
   https://[URL_NGROK_ANDA]/api/webhook/fonnte
   ```
   *Contoh:* `https://abcd-1234-xx.ngrok-free.app/api/webhook/fonnte`
4. Pilih opsi **Advanced** atau pastikan metode webhook adalah `POST` dan dapat menerima payload json/form-data.
5. Klik **Save / Update**.

---

## 📱 Cara Kerja & Pengujian Webhook WhatsApp

Teknisi dapat melakukan update tiket secara interaktif melalui chat WhatsApp. 

### Format Perintah WhatsApp yang Didukung:
Setiap perintah dikirimkan ke nomor WhatsApp Fonnte Anda dengan format berikut (case-insensitive):

1. **Memulai Pekerjaan (On Progress)**
   ```text
   ONPROGRESS {kode_tiket}
   ```
   *Contoh:* `ONPROGRESS TK-04383`
   *Efek:* Mengubah status tiket menjadi **In Progress** (Sedang Dikerjakan).

2. **Menyelesaikan Pekerjaan (Done)**
   ```text
   DONE {kode_tiket}
   ```
   *Contoh:* `DONE TK-04383`
   *Efek:* Mengubah status tiket menjadi **Done** (Selesai) dan mencatat waktu penyelesaian.

3. **Menolak Tugas (Reject)**
   ```text
   REJECT {kode_tiket}
   ```
   *Contoh:* `REJECT TK-04383`
   *Efek:* Mengembalikan status tiket menjadi **New** (Baru/Belum Ditugaskan) dan menghapus penugasan teknisi tersebut agar admin dapat menugaskan teknisi lain.

---

### 🧪 Langkah Simulasi/Pengujian Webhook:

1. **Ubah Nomor Handphone Teknisi:**
   Untuk mencoba secara nyata menggunakan WhatsApp Anda sendiri, silakan ubah salah satu nomor HP teknisi di database (tabel `technicians`) menjadi nomor WhatsApp Anda yang aktif.
   *(Gunakan format nomor sesuai yang dikirimkan Fonnte ke server, biasanya diawali `08...` atau `628...`)*
   
2. **Buat & Tugaskan Tiket:**
   * Buka Dashboard Admin di `http://localhost:3000/login` dan masuk menggunakan akun admin.
   * Buat laporan baru atau gunakan laporan yang sudah ada.
   * Tugaskan tiket tersebut ke nama Teknisi yang sudah Anda ubah nomor HP-nya tadi.

3. **Terima & Balas Pesan:**
   * Fonnte akan otomatis mengirimkan notifikasi ke WhatsApp Anda bahwa Anda telah ditugaskan sebuah tiket beserta detail tugas dan kodenya (misal: `TK-04383`).
   * Balas pesan tersebut dengan mengetik: `ONPROGRESS TK-04383`.
   * Cek dashboard admin, maka status tiket tersebut akan langsung ter-update menjadi **In Progress** secara *real-time*.
   * Lakukan hal yang sama dengan membalas `DONE TK-04383` untuk menyelesaikannya.
