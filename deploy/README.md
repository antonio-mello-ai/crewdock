# Deploy — AI Platform

## Prerequisites

- Proxmox host accessible via `ssh proxmox`
- Debian 12 template available on Proxmox
- Cloudflare account with felhen.ai domain

## Steps

### 1. Create CT on Proxmox host

```bash
ssh proxmox
bash /path/to/01-create-vm.sh
```

Creates CT 160 (`relaix`) with 4 cores, 8GB RAM, 50GB SSD.

### 2. Setup CT environment

```bash
pct enter 160
# or: ssh relaix (after Tailscale)
bash /path/to/02-setup.sh
```

Installs Docker, Tailscale, creates `/opt/relaix/`.

### 3. Deploy application

```bash
cd /opt/relaix
# Copy project files or git clone
cp .env.example .env
# Edit .env with real values (DB password, auth token, etc.)
bash deploy/03-deploy.sh
```

Builds images, starts containers, runs migrations.

### 4. Configure Cloudflare Tunnel

```bash
bash deploy/04-cloudflare-tunnel.sh
```

Exposes `ai.felhen.ai` → Caddy → Backend/Frontend.

## Architecture

```
ai.felhen.ai (Cloudflare Tunnel)
  → Caddy (:80)
    → /api/*  → Backend (:8001)
    → /*      → Frontend (:3000)
```

## Maintenance

```bash
# Update
cd /opt/relaix && git pull && docker compose build && docker compose up -d

# Logs
docker compose logs -f backend

# Migrations
docker compose exec backend alembic upgrade head

# Restart
docker compose restart
```
