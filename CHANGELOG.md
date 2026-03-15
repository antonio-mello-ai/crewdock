# Changelog

All notable changes to CrewDock will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.2.0] - 2026-03-15

### Added
- **Agent chat interface** — send messages to agents via gateway adapter
- **Drag-and-drop Kanban** — move tasks between columns with state machine validation
- **Frontend CRUD** — create, edit, delete agents and tasks via dashboard
- **Dark mode** — system-aware theme switching with toggle
- **Mobile responsive** — hamburger menu, responsive grids
- **Knowledge search** — QMD integration via REST wrapper (177 docs, 801 embeddings)
- **Cost tracking page** — connected to API with Recharts bar chart
- **Activity feed** — real-time feed connected to API
- **Landing page** — crewdock.ai via Cloudflare Pages
- **Deploy scripts** — Docker Compose clean install tested on fresh VM
- **OpenClaw multi-agent** — 4 agents configured (Nexus, Bernard, Pulse, Atlas)
- **Screenshots** in README

### Fixed
- `datetime.utcnow` deprecated — migrated to `datetime.now(UTC)` with timezone-aware columns
- CORS origins configurable via env var (was hardcoded)
- `.env.example` inline comments breaking Docker parsing
- QMD graceful degradation when not configured (501 instead of 500)
- Alembic migration with correct TIMESTAMP WITH TIME ZONE columns

### Changed
- Project renamed from "AI Platform" → "Relaix" → **CrewDock**
- Task form: removed redundant "Recurring" checkbox, derived from schedule
- QMD client: REST wrapper instead of MCP protocol (decoupled, future-proof)
- Deploy: VM instead of CT (full network stack for Cloudflare Tunnel)
- Deploy: git-based updates instead of tar copy

---

## [0.1.0] - 2026-03-14

### Added
- Backend: FastAPI with 22 API endpoints, 8 SQLAlchemy models, Pydantic v2 schemas
- Frontend: Next.js with 9 pages (Dashboard, Agents, Tasks, Activity, Knowledge, Costs, Skills, Settings)
- Auth: Bearer token middleware
- Gateway adapter: abstract interface + OpenClaw stub
- Plugin system: base class, loader, lifecycle management
- Task state machine: validated transitions (scheduled → queued → in_progress → done/failed)
- Activity logging: automatic on all CRUD operations
- Cost tracker: per-model pricing calculation
- SSE events endpoint
- Approval and webhook models
- Docker Compose (prod + dev)
- Caddyfile reverse proxy
- Alembic async migrations
- README, CONTRIBUTING, MIT LICENSE
- 14 pytest tests, ruff + mypy strict passing
