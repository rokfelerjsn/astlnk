# Deploy AsetLink di Ubuntu dengan Docker

Gunakan Nginx reverse proxy jika server punya IP publik dan port 80 atau 443 bisa dibuka.

Gunakan Cloudflare Tunnel jika server tidak punya IP publik, berada di balik NAT, atau port publik tidak bisa dibuka.

Konfigurasi bawaan repo ini memakai Nginx reverse proxy.

## Persiapan server

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

## Persiapan environment

```bash
cp .env.production.example .env.production
```

Isi nilai berikut sebelum menjalankan deploy:

- `APP_KEY`
- `APP_URL`
- `FRONTEND_URL`
- `SESSION_DOMAIN`
- `SANCTUM_STATEFUL_DOMAINS`
- `DB_PASSWORD`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `WHATSAPP_BRIDGE_API_KEY`
- `WHATSAPP_WEBHOOK_SECRET`
- `LARAVEL_BRIDGE_KEY`

Generate `APP_KEY`:

```bash
docker compose --env-file .env.production run --rm backend php artisan key:generate --show
```

## Menjalankan aplikasi

```bash
docker compose --env-file .env.production up -d --build
```

## Membuat data awal

Jalankan hanya jika database masih kosong dan Pak ingin memakai data contoh.

```bash
docker compose --env-file .env.production exec backend php artisan db:seed --force
```

## Cek status

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f nginx frontend backend backend-worker whatsapp-bridge
```

## Update dari GitHub

```bash
git pull
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec backend php artisan optimize
```

## Domain DuckDNS

Untuk domain Pak, gunakan:

```env
APP_URL=http://asetlink.duckdns.org
FRONTEND_URL=http://asetlink.duckdns.org
SESSION_DOMAIN=asetlink.duckdns.org
SANCTUM_STATEFUL_DOMAINS=asetlink.duckdns.org
```

## HTTPS

Konfigurasi ini baru HTTP. Untuk HTTPS, pasang Certbot di depan Nginx atau ganti reverse proxy menjadi Caddy.
