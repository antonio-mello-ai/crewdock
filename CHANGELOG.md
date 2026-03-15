# Changelog

All notable changes to CrewDock will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---


## [0.6.0] - 2026-03-15

### Added
- **OpenClaw WebSocket adapter** — real WebSocket connection to gateway (with stub fallback)
- **Gateway status API** — GET /gateway/status for connection monitoring
- **CI/CD pipeline** — GitHub Actions for backend (ruff, mypy, pytest) and frontend (lint, build)
- **websockets dependency** — for gateway communication

### Changed
- OpenClaw adapter attempts real WebSocket connection on startup
- Gateway adapter reports connected/disconnected status
- Adapter falls back gracefully to stub when gateway unreachable

## [0.5.0] - 2026-03-15

### Added
- **Task scheduler** — APScheduler loads recurring tasks from DB, executes via cron expressions
- **Scheduler API** — GET /scheduler/jobs, POST /scheduler/reload
- **Redis SSE** — pub/sub on crewdock:events channel with 15s heartbeat
- **In-memory SSE fallback** — graceful degradation when Redis unavailable
- **Webhook dispatcher** — HMAC-SHA256 signed payloads to all matching webhooks
- **APScheduler dependency** — pinned to v3.x (stable async support)

### Changed
- SSE events endpoint now uses Redis pub/sub (was in-memory only)
- Scheduler integrated into FastAPI lifespan (startup/shutdown)

## [0.4.0] - 2026-03-15

### Added
- **Agent templates gallery** — 10 pre-configured agents across 6 categories (Marketing, Analytics, Operations, Engineering, Sales, HR) with one-click install
- **System prompt field** — agents store personality/instructions for gateway integration
- **Toast notifications** — visual feedback on all CRUD operations (create, update, delete, install)
- **Template category filters** — filter templates by category
- **Skill badges** — each template shows its capabilities

## [0.3.0] - 2026-03-15

### Added
- **Design system overhaul** — branded cyan/maritime color palette, not generic gray
- **Agent chat interface** — send messages to agents directly from dashboard
- **Drag-and-drop Kanban** — move tasks between columns with state machine validation
- **Shared UI components** — PageHeader, StatCard, EmptyState, SectionLabel
- **Lucide icons** across all pages and navigation
- **Agent color system** — unique colored avatars per agent
- **Section labels** — uppercase tracking headers for visual hierarchy

### Changed
- Dark mode now uses navy-tinted backgrounds (not pure black)
- Light mode backgrounds have subtle blue tint (not pure white)
- Primary color changed to dock-blue cyan
- Card radius tightened to 0.5rem (more professional)
- Global smooth transitions (150ms) on all interactive elements
- Settings page redesigned with gateway status and plugin cards
- Skills page redesigned with skill icons and agent labels
- All pages use consistent PageHeader pattern
- Removed all inline duplicated components

### Fixed
- Removed unused imports across pages
- Consistent status dot colors using shared utility

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

