# Deploy — CrewDock

## Prerequisites

- Linux server (VM or bare metal) with Docker installed
- Domain configured (e.g. via Cloudflare Tunnel)

## Steps

### 1. Setup server

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone the repo
git clone https://github.com/antonio-mello-ai/crewdock.git /opt/crewdock
cd /opt/crewdock
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with real values:
# - DB_PASSWORD
# - LOCAL_AUTH_TOKEN (min 50 chars)
# - ANTHROPIC_API_KEY
```

### 3. Deploy

```bash
docker compose up -d
docker compose exec backend alembic upgrade head
```

### 4. Configure domain (optional)

Set up a Cloudflare Tunnel or nginx reverse proxy pointing to port 80.

## Architecture

```
your-domain.com (Cloudflare Tunnel / Nginx)
  → Caddy (:80)
    → /api/*  → Backend (:8001)
    → /*      → Frontend (:3000)
```

## Maintenance

```bash
# Update
cd /opt/crewdock && git pull && docker compose build && docker compose up -d

# Logs
docker compose logs -f backend

# Migrations
docker compose exec backend alembic upgrade head

# Restart
docker compose restart
```
