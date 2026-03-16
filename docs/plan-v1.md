# Plano de Implementação: AI Agent Management Platform

**Versão**: 1.0
**Data**: 2026-03-14
**Autor**: Antonio Mello + Claude
**Status**: Aprovado para execução

---

## 1. Visão do Projeto

Plataforma open-source para orquestrar, monitorar e gerenciar múltiplos agentes de AI autônomos. Dashboard web com gestão de agentes/tasks, comunicação via Telegram e HA Voice, modelo híbrido local (RTX 5090) + Claude API, integração com Home Assistant.

**Diferencial vs Mission Control (OpenClaw):**
- Arquitetura extensível com plugin system
- Gateway-agnostic (OpenClaw, Claude Code, custom runtimes)
- Knowledge base integrado nativamente (QMD)
- Cost tracking e budgeting por agente
- Theming e design system customizável
- Modular via feature flags
- Governança open-source community-friendly

**Referência arquitetural**: Mission Control (MIT, github.com/abhi1693/openclaw-mission-control) — mesmo stack (FastAPI + Next.js + Postgres + Redis), patterns validados, mas reconstruído com extensibilidade como princípio.

**Nome do projeto**: TBD (working name: "ai-assistant"). Definir antes de abrir repo público.

---

## 2. Stack Técnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 | Mesmo stack do MC — patterns validados, forte tipagem |
| **Frontend** | Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui | Mesmo stack do MC — componentes maduros |
| **API Client** | Orval (auto-gerado do OpenAPI spec) | Contrato frontend/backend fortemente tipado |
| **Database** | PostgreSQL 16 | Relacional, robusto, extensível (JSONB para plugin data) |
| **Cache/Queue** | Redis 7 | Cache, rate limiting, job queue (RQ ou Celery) |
| **Gateway Protocol** | WebSocket RPC (compatível OpenClaw) | Comunicação real-time com agent runtime |
| **Auth** | Bearer token (local mode) + OIDC opcional (futuro) | Simples para self-hosted, extensível |
| **Containerização** | Docker Compose | Deploy reproduzível |
| **Monitoramento** | Prometheus + Grafana (já rodando na GCP) | Infra existente |

---

## 3. Arquitetura

### 3.1 Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                    your-domain.com                         │
│               (Caddy reverse proxy)                     │
├─────────────┬───────────────┬───────────────────────────┤
│  Frontend   │   Backend     │    Grafana                │
│  Next.js    │   FastAPI     │    (embed)                │
│  :3001      │   :8001       │    :3000                  │
├─────────────┴───────────────┴───────────────────────────┤
│                    PostgreSQL + Redis                    │
├─────────────────────────────────────────────────────────┤
│              OpenClaw Gateway (:18789 WS)               │
│         ┌──────┬──────┬──────┬──────┐                   │
│         │Nexus │Bernard│Pulse │Atlas │                   │
│         └──────┴──────┴──────┴──────┘                   │
├─────────────────────────────────────────────────────────┤
│           Tailscale → Home Server                       │
│         ┌──────────┬───────────────┐                    │
│         │   QMD    │  Home Asst.   │                    │
│         │  :8787   │  (VM 130)     │                    │
│         └──────────┴───────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Módulos do Backend

```
backend/
├── app/
│   ├── core/               # Config, security, database, events
│   │   ├── config.py       # Pydantic Settings (env vars)
│   │   ├── database.py     # SQLAlchemy engine + session
│   │   ├── security.py     # Auth middleware
│   │   └── events.py       # App lifecycle (startup/shutdown)
│   ├── models/             # SQLAlchemy models
│   │   ├── agent.py        # Agent definition (name, model, status, config)
│   │   ├── task.py         # Task (title, status, schedule, agent_id)
│   │   ├── activity.py     # Activity log (agent_id, action, payload)
│   │   ├── approval.py     # Approval workflow
│   │   ├── cost.py         # Token usage, cost per agent/task
│   │   ├── skill.py        # Skill registry
│   │   └── plugin.py       # Plugin metadata
│   ├── api/                # FastAPI routers
│   │   ├── agents.py       # CRUD agentes + status via gateway
│   │   ├── tasks.py        # CRUD tasks + scheduling
│   │   ├── activity.py     # Activity feed
│   │   ├── approvals.py    # Approval workflow
│   │   ├── costs.py        # Cost tracking + budgets
│   │   ├── knowledge.py    # Proxy para QMD (via Tailscale)
│   │   ├── gateway.py      # Gateway management
│   │   ├── skills.py       # Skill registry
│   │   ├── metrics.py      # Prometheus metrics
│   │   ├── webhooks.py     # Webhook management
│   │   └── health.py       # Health check
│   ├── services/           # Business logic
│   │   ├── gateway/        # Gateway adapter layer (agnostic)
│   │   │   ├── base.py     # Abstract gateway interface
│   │   │   ├── openclaw.py # OpenClaw WebSocket RPC implementation
│   │   │   └── registry.py # Gateway registry (multi-gateway support)
│   │   ├── scheduler.py    # Cron/recurring task scheduler
│   │   ├── cost_tracker.py # Token counting + cost calculation
│   │   ├── qmd_client.py   # HTTP client para QMD no home server
│   │   └── notifier.py     # Notification dispatcher (webhook, SSE)
│   ├── plugins/            # Plugin system
│   │   ├── base.py         # Plugin interface + lifecycle
│   │   ├── loader.py       # Plugin discovery + loading
│   │   └── builtin/        # Built-in plugins
│   │       ├── home_assistant.py
│   │       └── telegram_digest.py
│   └── main.py             # FastAPI app factory
├── alembic/                # DB migrations
├── tests/
├── pyproject.toml
└── Dockerfile
```

### 3.3 Gateway Adapter Layer (diferencial)

```python
# services/gateway/base.py — Interface abstrata
class GatewayAdapter(ABC):
    async def connect(self) -> None: ...
    async def disconnect(self) -> None: ...
    async def list_agents(self) -> list[AgentInfo]: ...
    async def send_message(self, agent_id: str, message: str, session_id: str | None) -> AsyncIterator[str]: ...
    async def get_agent_status(self, agent_id: str) -> AgentStatus: ...
    async def list_sessions(self, agent_id: str) -> list[SessionInfo]: ...
    async def install_skill(self, agent_id: str, skill: str) -> None: ...
    # ... etc

# services/gateway/openclaw.py — Implementação OpenClaw
class OpenClawGateway(GatewayAdapter):
    """WebSocket RPC client compatível com OpenClaw Gateway."""
    # Implementa todos os métodos via WebSocket RPC
    # Baseado em gateway_rpc.py do Mission Control (MIT)
```

Isso permite no futuro adicionar adapters para outros runtimes sem mudar o resto do sistema.

### 3.4 Plugin System

```python
# plugins/base.py
class Plugin(ABC):
    name: str
    version: str

    async def on_load(self, app: FastAPI) -> None:
        """Registrar routers, event handlers, etc."""

    async def on_unload(self) -> None:
        """Cleanup."""

    def get_routers(self) -> list[APIRouter]:
        """Routers adicionais para registrar no app."""
        return []

    def get_frontend_manifest(self) -> dict | None:
        """Manifesto para o frontend renderizar UI do plugin."""
        return None
```

Plugins são descobertos via entry points (pyproject.toml) ou pasta `plugins/`.

### 3.5 Páginas do Frontend

```
frontend/src/app/
├── (dashboard)/
│   └── page.tsx            # Overview: agents cards, tasks ativas, métricas do dia
├── agents/
│   ├── page.tsx            # Grid de agentes com status, modelo, avatar
│   └── [id]/page.tsx       # Detalhe do agente: sessões, history, config
├── tasks/
│   ├── page.tsx            # Kanban (Scheduled/Queue/In Progress/Done)
│   └── templates/page.tsx  # Task templates e recurring
├── activity/
│   └── page.tsx            # Feed unificado de atividade
├── knowledge/
│   └── page.tsx            # Busca QMD, visualização de docs
├── costs/
│   └── page.tsx            # Token usage, custo por agente, budget alerts
├── skills/
│   └── page.tsx            # Skills por agente
├── settings/
│   └── page.tsx            # Config do sistema, gateway, plugins
└── layout.tsx              # Shell com sidebar navigation
```

---

## 4. Agentes (OpenClaw)

### 4.1 Configuração dos 4 Agentes

| Agente | Papel | Modelo | Descrição |
|--------|-------|--------|-----------|
| **Nexus** | Admin/Orchestrator | claude-opus-4-6 | Infra, meta-tasks, coordenação entre agentes |
| **Bernard** | Developer | claude-opus-4-6 | PRs, code review, project check-ins |
| **Pulse** | Content/Strategist | claude-sonnet-4-6 | LinkedIn, market news, content radar |
| **Atlas** | Assistant/Knowledge | claude-sonnet-4-6 | Briefings, intake, calendário, HA Voice, Telegram default |

### 4.2 Workspace Structure

```
~/.openclaw/
├── openclaw.json              # Config principal (multi-agent)
├── workspaces/
│   ├── nexus/
│   │   ├── SOUL.md            # Identidade e personalidade
│   │   ├── AGENTS.md          # Instruções operacionais
│   │   ├── HEARTBEAT.md       # Check-ins proativos
│   │   ├── MEMORY.md          # Memória curada
│   │   ├── TOOLS.md           # Notas sobre ferramentas
│   │   ├── USER.md            # Contexto do usuário
│   │   ├── skills/            # Skills do agente
│   │   └── memory/            # Logs diários
│   ├── bernard/
│   │   └── (mesma estrutura)
│   ├── pulse/
│   │   └── (mesma estrutura)
│   ├── atlas/
│   │   └── (mesma estrutura)
│   └── shared/                # Brain folder compartilhado
│       ├── projects-status.md
│       └── decisions-log.md
└── agents/
    ├── nexus/agent/
    ├── bernard/agent/
    ├── pulse/agent/
    └── atlas/agent/
```

### 4.3 Skills (progressivas)

**Fase 1 (MVP):**
- `morning-briefing` (Atlas) — calendário, emails pendentes, tasks do dia
- `infra-health` (Nexus) — SSH nas VMs via Tailscale, status dos serviços
- `company-context` (Atlas) — busca QMD para perguntas sobre contexto

**Fase 2:**
- `content-radar` (Pulse) — web search por notícias AI/tech
- `daily-synthesis` (Atlas) — consolida o que aconteceu no dia
- `project-checkin` (Bernard) — git log, PRs abertos, issues
- `code-activity` (Bernard) — analisa commits, identifica padrões

**Fase 3:**
- `linkedin-ideas` (Pulse) — captura e desenvolve ideias de post
- `intake-processing` (Atlas) — processa inputs novos
- `budget-check` (Nexus) — custos GCP, APIs, infra

### 4.4 Crons

| Task | Agente | Schedule | Fase |
|------|--------|----------|------|
| Morning Briefing | Atlas | `0 7 * * *` | 1 |
| Infra Health Check | Nexus | `0 6 * * *` | 1 |
| Content Radar Scan | Pulse | `0 6 * * *` | 2 |
| Daily Code Activity | Bernard | `0 3 * * *` | 2 |
| Project Check-in | Bernard | `0 10 * * *` | 2 |
| Daily Synthesis | Atlas | `0 19 * * *` | 2 |
| Content Development | Pulse | `0 8 * * 1-5` | 3 |
| Weekly Rollup | Pulse | `0 16 * * 5` | 3 |
| Budget Check | Nexus | `0 12 * * 5` | 3 |
| Cleanup Temp Repos | Bernard | `0 10 * * 5/2w` | 3 |
| Intake Processing | Atlas | `0 9,14,19 * * *` | 3 |

---

## 5. Infraestrutura

### 5.1 GCP VM — Sizing

**Decisão**: Scale up para **e2-standard-4** (4 vCPU, 16 GB RAM, 50 GB disco).

Estimativa de uso:

| Serviço | RAM | CPU |
|---------|-----|-----|
| OpenClaw Gateway | ~500 MB | baixo |
| PostgreSQL 16 | ~512 MB - 1 GB | baixo |
| Redis 7 | ~128 MB | mínimo |
| Backend (FastAPI + workers) | ~256 MB | médio |
| Frontend (Next.js) | ~256 MB | baixo |
| Prometheus | ~512 MB | baixo |
| Grafana | ~128 MB | baixo |
| Caddy | ~32 MB | mínimo |
| Cloudflared | ~64 MB | mínimo |
| Tailscale | ~128 MB | mínimo |
| **Total estimado** | **~2.5 - 3 GB** | |
| **Margem disponível** | **~13 GB** | |

Margem confortável para spikes de agentes e crescimento.

### 5.2 QMD — Knowledge Base

QMD runs alongside CrewDock, indexing markdown documents:
- Address: `http://localhost:8787` (co-located with backend)
- **Single source of truth**: docs synced to server, QMD indexes locally
- Zero duplication

### 5.3 Rede e Acesso

| Serviço | Porta | Acesso |
|---------|-------|--------|
| Dashboard Frontend | 3001 | `your-domain.com` via Cloudflare Tunnel |
| Backend API | 8001 | Interno + Tailscale (não expor publicamente) |
| OpenClaw Gateway | 18789 (WS) | Interno + Tailscale |
| PostgreSQL | 5432 | Interno apenas |
| Redis | 6379 | Interno apenas |
| Grafana | 3000 | `grafana.your-domain.com` (já configurado) |
| QMD (home server) | 8787 | Tailscale apenas |

### 5.4 Deploy

```yaml
# compose.yml (GCP VM)
services:
  postgres:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: ai_platform
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports: ["5432:5432"]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    restart: unless-stopped

  backend:
    build: ./backend
    ports: ["8001:8001"]
    env_file: .env
    depends_on: [postgres, redis]
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports: ["3001:3000"]
    env_file: .env
    depends_on: [backend]
    restart: unless-stopped

  worker:
    build: ./backend
    command: rq worker
    env_file: .env
    depends_on: [postgres, redis]
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile"]
    restart: unless-stopped

volumes:
  pgdata:
```

---

## 6. Fases de Implementação

### Fase 1 — Fundação (Semanas 1-2)

**Objetivo**: Backend funcional + Frontend minimal + 1 agente operacional

**1.1 Setup do projeto**
- [ ] Inicializar repo git local
- [ ] Setup backend: FastAPI + SQLAlchemy + Alembic + Pydantic
- [ ] Setup frontend: Next.js + TypeScript + Tailwind + shadcn/ui
- [ ] Setup Docker Compose (postgres, redis, backend, frontend)
- [ ] CI local: pytest, ruff, mypy, vitest

**1.2 Backend core**
- [ ] Models: Agent, Task, Activity, Cost
- [ ] Config via Pydantic Settings (env vars)
- [ ] Auth middleware (bearer token, simple)
- [ ] Database migrations (Alembic)
- [ ] Health check endpoint

**1.3 Gateway adapter**
- [ ] Abstract gateway interface (`GatewayAdapter`)
- [ ] OpenClaw implementation (WebSocket RPC client)
- [ ] Agent list, status, send message

**1.4 API v1 — Core routers**
- [ ] `GET/POST /api/v1/agents` — CRUD + status via gateway
- [ ] `GET/POST /api/v1/tasks` — CRUD + status transitions
- [ ] `GET /api/v1/activity` — Activity feed
- [ ] `GET /api/v1/health` — Health check
- [ ] OpenAPI spec exportável

**1.5 Frontend — Shell + Dashboard**
- [ ] Layout com sidebar navigation
- [ ] Dashboard page: agent cards, task summary
- [ ] Agents page: grid com status real-time
- [ ] Orval setup para API client auto-gerado

**1.6 Deploy inicial**
- [ ] Scale up GCP VM para e2-standard-4
- [ ] Docker Compose up com todos os serviços
- [ ] Cloudflare Tunnel para `your-domain.com`
- [ ] Validar: dashboard acessível, agentes visíveis

**1.7 Multi-agent OpenClaw**
- [ ] Criar `openclaw.json` com 4 agentes
- [ ] Criar workspaces com SOUL.md para cada agente
- [ ] Configurar bindings (Telegram → Atlas)
- [ ] Validar: agentes respondendo via dashboard e Telegram

### Fase 2 — Tasks e Knowledge (Semanas 3-4)

**Objetivo**: Task scheduling, knowledge base, cost tracking

**2.1 Task scheduling**
- [ ] Modelo de Task expandido: schedule (cron expr), recurring, template
- [ ] Scheduler service (APScheduler ou cron nativo)
- [ ] API: task templates, recurring tasks
- [ ] Frontend: Kanban board (Scheduled/Queue/In Progress/Done)
- [ ] Frontend: Task templates page

**2.2 Knowledge module**
- [ ] QMD client service (HTTP para home server via Tailscale)
- [ ] API router `/api/v1/knowledge` (search, get, deep_search)
- [ ] Frontend: Knowledge page com busca + visualização
- [ ] Instalar QMD no home server (CT 162 ou nova CT)
- [ ] Configurar QMD MCP HTTP server (:8787)

**2.3 Cost tracking**
- [ ] Model: CostEntry (agent_id, task_id, tokens_in, tokens_out, cost_usd)
- [ ] Cost tracker service (parseia usage data do gateway)
- [ ] API router `/api/v1/costs` (por agente, por período, totais)
- [ ] Frontend: Costs page com gráficos (Recharts)
- [ ] Budget alert via webhook

**2.4 Activity e SSE**
- [ ] Activity logging em todas as operações
- [ ] SSE endpoint para real-time updates no frontend
- [ ] Frontend: Activity feed page

### Fase 3 — Skills e Automação (Semanas 5-6)

**Objetivo**: Skills funcionais, crons rodando, agentes autônomos

**3.1 Skills Fase 1**
- [ ] `morning-briefing` skill (Atlas)
- [ ] `infra-health` skill (Nexus)
- [ ] `company-context` skill (Atlas) — usa QMD
- [ ] Frontend: Skills page por agente

**3.2 Crons**
- [ ] Configurar crons no openclaw.json (morning-briefing, infra-health)
- [ ] Validar: execução automática + resultado no dashboard + Telegram
- [ ] Monitoramento de crons no Grafana

**3.3 Approvals**
- [ ] Model: Approval (task_id, agent_id, status, payload)
- [ ] API router `/api/v1/approvals`
- [ ] Frontend: Approval workflow UI
- [ ] Integração com Telegram (approve/reject via bot)

**3.4 Webhooks**
- [ ] Model: Webhook (url, events, secret)
- [ ] Webhook dispatcher (via Redis queue + worker)
- [ ] API router `/api/v1/webhooks`

### Fase 4 — Plugin System e Extensibilidade (Semanas 7-8)

**Objetivo**: Arquitetura de plugins funcional, primeiros plugins built-in

**4.1 Plugin system**
- [ ] Plugin interface + lifecycle (load/unload)
- [ ] Plugin discovery (entry points + pasta plugins/)
- [ ] Plugin config via JSONB no PostgreSQL
- [ ] API: plugin list, enable/disable, config
- [ ] Frontend: Plugin management na Settings page

**4.2 Built-in plugins**
- [ ] Home Assistant plugin (status, controle via REST API)
- [ ] Telegram digest plugin (resumo diário consolidado)

**4.3 Skills Fase 2**
- [ ] `content-radar` (Pulse)
- [ ] `daily-synthesis` (Atlas)
- [ ] `project-checkin` (Bernard)
- [ ] `code-activity` (Bernard)

**4.4 Crons Fase 2**
- [ ] Configurar todos os crons da Fase 2 na tabela 4.4
- [ ] Monitoramento + alertas

### Fase 5 — HA Voice e Polish (Semanas 9-10)

**Objetivo**: Integração voice, theming, preparação para open source

**5.1 HA Voice**
- [ ] Instalar OpenClaw HA Add-on (VM 130) ou custom component
- [ ] Configurar: Wake Word → STT (Whisper) → OpenClaw API (Atlas) → TTS (Piper)
- [ ] Validar fluxo end-to-end

**5.2 Theming**
- [ ] CSS variables para cores/fonts
- [ ] Dark mode
- [ ] Tailwind config customizável

**5.3 Skills Fase 3**
- [ ] `linkedin-ideas` (Pulse)
- [ ] `intake-processing` (Atlas)
- [ ] `budget-check` (Nexus)

**5.4 Preparação open source**
- [ ] README.md profissional
- [ ] CONTRIBUTING.md
- [ ] LICENSE (MIT)
- [ ] Docs: Getting Started, Architecture, Plugin Development
- [ ] GitHub repo público
- [ ] Definir nome final do projeto

---

## 7. Verificação Final (Definition of Done)

- [ ] Dashboard acessível em `your-domain.com` com auth local
- [ ] 4 agentes visíveis no dashboard com status correto
- [ ] Tasks kanban funcionando (criar, mover, completar)
- [ ] Morning briefing executando às 7h via cron → Telegram
- [ ] Busca QMD funcionando na página /knowledge
- [ ] Cost tracking mostrando uso por agente
- [ ] Grafana embedded na página /costs (ou via link)
- [ ] HA Voice respondendo via Atlas agent
- [ ] Plugin system funcional com pelo menos 2 plugins
- [ ] Repo público com README, CONTRIBUTING, docs

---

## 8. Decisões Arquiteturais (ADRs)

### ADR-001: Construir do zero vs forkar MC
**Decisão**: Construir do zero usando MC como referência arquitetural.
**Razão**: MC não tem plugin system, não aceita PRs, e forkar cria débito técnico. Construir do zero permite arquitetura extensível desde o dia 1.

### ADR-002: Gateway-agnostic adapter
**Decisão**: Abstract gateway interface com implementação OpenClaw como primeira.
**Razão**: Não acoplar ao OpenClaw permite evoluir para outros runtimes. OpenClaw é jovem (6 semanas) — prudente manter opções.

### ADR-003: QMD no home server via Tailscale
**Decisão**: QMD roda junto do Nextcloud no home server, acessível via Tailscale.
**Razão**: Uma fonte de verdade — docs ficam no Nextcloud, QMD indexa localmente, zero cópia/rsync.

### ADR-004: Build first, publish later
**Decisão**: Repo privado até MVP funcional, depois abrir como open source.
**Razão**: Evitar pressão de manter open source antes de ter algo sólido.

### ADR-005: e2-standard-4 na GCP
**Decisão**: Scale up para 4 vCPU, 16GB RAM, 50GB disco.
**Razão**: VM atual (7.8GB RAM) insuficiente para o stack completo. 16GB dá margem confortável.

### ADR-006: Portas separadas do MC
**Decisão**: Backend :8001, Frontend :3001 (MC usa :8000 e :3000).
**Razão**: Grafana já usa :3000 na GCP. Evitar conflito caso MC coexista temporariamente.

---

## 9. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Escopo grande para solopreneur | Projeto nunca termina | Fases incrementais, cada fase é usável sozinha |
| OpenClaw muda API rapidamente | Gateway adapter quebra | Adapter isolado, testes de integração |
| Custo de API Claude alto | Budget estoura | Cost tracking desde Fase 2, budget alerts |
| Home server offline | QMD indisponível | Graceful degradation — dashboard funciona sem knowledge |
| GCP VM cai | Tudo offline | Docker restart policies, monitoring via Prometheus |

---

## CHANGELOG

| Data | Mudança |
|------|---------|
| 2026-03-14 | v1.0 — Plano inicial criado |
