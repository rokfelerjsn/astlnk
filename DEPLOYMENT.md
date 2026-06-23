# Deploy AsetLink di Ubuntu dengan Docker

Konfigurasi production memakai Caddy untuk HTTPS otomatis di depan Nginx internal.

## Persiapan server

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

Pastikan port berikut terbuka di firewall/provider VPS:

```text
80/tcp
443/tcp
```

## Environment

```bash
cp .env.production.example .env.production
```

Isi secret production:

- `APP_KEY`
- `DB_PASSWORD`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `WHATSAPP_BRIDGE_API_KEY`
- `WHATSAPP_WEBHOOK_SECRET`
- `LARAVEL_BRIDGE_KEY`

Untuk domain DuckDNS:

```env
APP_DOMAIN=asetlink.duckdns.org
APP_URL=https://asetlink.duckdns.org
FRONTEND_URL=https://asetlink.duckdns.org
SESSION_DOMAIN=asetlink.duckdns.org
SANCTUM_STATEFUL_DOMAINS=asetlink.duckdns.org
```

## Deploy

```bash
docker compose --env-file .env.production up -d --build
```

## Data awal

```bash
docker compose --env-file .env.production exec backend php artisan db:seed --force
```

## Cek status

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f caddy nginx frontend backend backend-worker whatsapp-bridge
```

## Update

```bash
git pull
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec backend php artisan optimize
```
