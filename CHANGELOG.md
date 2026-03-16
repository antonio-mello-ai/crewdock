# Changelog

All notable changes to CrewDock will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---


## [1.2.0] - 2026-03-16

### Added
- **MCP Client** — agents can use external tools via Model Context Protocol
- **MCP Server registry** — CRUD API for registering MCP servers (stdio + SSE)
- **Tool-enabled chat** — Claude tool_use loop with max 5 rounds
- **Whisper MCP** — audio transcription via OpenAI Whisper (included in repo)
- **Run Now button** — execute tasks immediately from the Kanban board
- **Chat history endpoint** — GET /chat/history/{session_id}
- **Logout button** — visible in sidebar footer for all auth modes
- **Markdown rendering** — react-markdown + typography in agent chat
- **Settings page** — real platform status, version, user profile, gateway info
- **Node.js in backend** — Dockerfile includes Node 20 for stdio MCP execution

### Changed
- Streaming endpoint uses tool-enabled chat when MCP servers are configured
- MCP stdio processes inherit parent environment variables (API keys etc)
- Chat loads previous session history on page open

### Fixed
- Logout button hidden when using static token auth

## [1.1.0] - 2026-03-15

### Added
- **Real LLM chat** — agents respond via Anthropic API with system prompts
- **Streaming responses** — tokens appear one by one via SSE
- **Knowledge-aware agents** — QMD knowledge base injected into agent context automatically
- **Persistent chat history** — Redis-backed with 24h TTL, in-memory fallback
- **Real cost tracking** — actual token usage recorded from API, estimated for streaming
- **Real task execution** — scheduler sends tasks to LLM, logs results, handles failures
- **Onboarding flow** — welcome screen with 3-step guide for new users
- **Auth guard** — redirects to login when unauthenticated
- **App shell** — conditional sidebar (hidden on login page)
- **System prompt editing** — editable field in agent create/edit forms
- **Templates with prompts** — template install includes system_prompt

### Changed
- Chat endpoint uses knowledge context from QMD before calling LLM
- Scheduler executes tasks via LLM instead of marking done immediately
- Recurring tasks reset to scheduled after completion
- Streaming chat estimates cost via character-based token approximation
- Screenshots updated with current design

### Fixed
- email-validator dependency for Pydantic EmailStr
- Chat error messages show actual API errors
- Agent type includes system_prompt field

## [1.0.0] - 2026-03-15

### Milestone
CrewDock v1.0.0 — first stable release of the open-source AI agent orchestration platform.

### Platform Summary
- **26 API endpoints** across 14 routers
- **10 database models** (Agent, Task, Activity, Cost, Skill, Approval, Webhook, Plugin, User, Workspace)
- **10 frontend pages** + login + agent chat + templates gallery
- **Design system** with branded theme, dark mode, responsive layout
- **Task scheduler** with APScheduler and cron support
- **Knowledge base** integration via QMD
- **Real-time events** via Redis SSE with in-memory fallback
- **Webhook dispatcher** with HMAC-SHA256 signatures
- **Gateway adapter** for OpenClaw with WebSocket support
- **Plugin system** with lifecycle management
- **JWT authentication** with setup flow and backwards compatibility
- **Multi-tenant foundation** with workspace model
- **10 agent templates** across 6 categories
- **CI/CD** via GitHub Actions
- **Docker Compose** deployment tested on clean install
- **Landing page** at crewdock.ai

## [0.9.0] - 2026-03-15

### Added
- **Workspace model** — data isolation foundation for multi-tenant
- **Agent ownership** — created_by field links agents to users
- **User profile endpoint** — GET /auth/me returns current user info
- **Logout support** — frontend clearAuth() for session cleanup

### Changed
- Agent model has optional created_by FK to users table
- Models registry includes Workspace and User

## [0.8.0] - 2026-03-15

### Added
- **User authentication** — email/password login with JWT tokens
- **Login page** — clean login UI with setup flow for first user
- **Initial setup** — first user becomes admin via /auth/setup endpoint
- **Auth check endpoint** — GET /auth/check to detect if setup is needed
- **User model** — email, hashed password, name, admin flag
- **JWT tokens** — 24h expiry, stored in localStorage
- **Backwards compatible auth** — accepts both JWT and static bearer tokens

### Changed
- API client now uses JWT from localStorage (priority) or build-time token (fallback)
- Security middleware accepts both JWT and static tokens

## [0.7.0] - 2026-03-15

### Added
- **Zod form validation** — client-side validation for agent and task forms
- **Error boundary** — global error catching with retry button
- **ApiError class** — structured error parsing from backend responses (status + detail)
- **Cron validation** — regex check for schedule field before submission

### Changed
- API client parses backend error detail messages (was generic status text)
- Forms show field-level error messages with red borders
- Delete returns handle 204 No Content properly

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

