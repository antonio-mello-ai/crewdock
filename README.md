# CrewDock

Open-source platform for orchestrating, monitoring, and managing multiple autonomous AI agents. Web dashboard + API for agent/task management, with integrated knowledge base, cost tracking, and extensible plugin system.

## Features

- **Multi-agent management** — Register, monitor, and control AI agents with real-time status
- **Task orchestration** — Kanban board with scheduling, recurring tasks, and state machine validation
- **Knowledge base** — Integrated search across markdown documents (QMD)
- **Cost tracking** — Token usage and cost monitoring per agent with budget controls
- **Activity feed** — Real-time activity stream with Server-Sent Events
- **Approval workflows** — Human-in-the-loop approval for agent actions
- **Plugin system** — Extensible architecture with lifecycle management
- **Webhook notifications** — Event-driven integrations
- **Dark mode** — System-aware theme switching
- **Mobile responsive** — Full mobile support with collapsible navigation

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2 |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Gateway | WebSocket RPC (gateway-agnostic adapter layer) |
| Auth | Bearer token (local mode) |
| Deploy | Docker Compose |

## Quick Start

### Docker Compose (recommended)

```bash
# Clone
git clone https://github.com/antonio-mello-ai/crewdock.git
cd crewdock

# Configure (generate secrets automatically)
cp .env.example .env
sed -i "s/changeme_password/$(openssl rand -hex 24)/" .env
sed -i "s/changeme_token/$(openssl rand -hex 32)/" .env

# Start
docker compose up -d

# Create database tables
docker compose exec backend alembic upgrade head

# Open the dashboard
open http://localhost:3001
```

### Development

```bash
# Start infrastructure only
docker compose -f compose.dev.yml up -d

# Backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## API

The backend exposes a RESTful API at `/api/v1/`:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET/POST /agents` | Agent management |
| `GET/POST /tasks` | Task orchestration |
| `GET /activity` | Activity feed |
| `GET /costs` | Cost tracking |
| `POST /knowledge/search` | Knowledge base search |
| `GET /events` | Server-Sent Events stream |
| `GET/POST /skills` | Skill registry |
| `GET/POST /approvals` | Approval workflows |
| `GET/POST /webhooks` | Webhook management |
| `GET/POST /plugins` | Plugin management |

Full OpenAPI spec available at `/openapi.json`.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Caddy (reverse proxy)          │
├──────────────────┬──────────────────────────┤
│  Frontend        │   Backend (FastAPI)      │
│  Next.js :3001   │   :8001                  │
├──────────────────┴──────────────────────────┤
│              PostgreSQL + Redis             │
├─────────────────────────────────────────────┤
│         Gateway Adapter Layer               │
│    (abstract interface, pluggable)          │
├─────────────────────────────────────────────┤
│            Plugin System                    │
│    (lifecycle, routers, config)             │
└─────────────────────────────────────────────┘
```

The gateway adapter layer is intentionally abstract — it supports any agent runtime through a pluggable interface. The first implementation targets OpenClaw, but the architecture allows swapping or adding runtimes without modifying the core.

## Project Structure

```
crewdock/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, auth, database
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # Business logic + gateway
│   │   └── plugins/   # Plugin system
│   ├── alembic/       # Database migrations
│   └── tests/
├── frontend/          # Next.js application
│   └── src/
│       ├── app/       # Pages (App Router)
│       ├── components/# UI components
│       ├── hooks/     # React hooks
│       └── lib/       # API client, utilities
├── deploy/            # Deployment scripts
├── compose.yml        # Production Docker Compose
├── compose.dev.yml    # Development (Postgres + Redis only)
└── Caddyfile          # Reverse proxy config
```

## License

[MIT](LICENSE)
