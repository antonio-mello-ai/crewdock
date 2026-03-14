# GEMINI.md — AI Agent Management Platform

## Propósito

Plataforma open-source para orquestrar, monitorar e gerenciar múltiplos agentes de AI autônomos. Dashboard web + API para gestão de agentes/tasks, com knowledge base integrado, cost tracking, e plugin system extensível.

**Plano completo**: `docs/plan-v1.md`

## Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2
- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **API Client**: Orval (auto-gerado do OpenAPI spec do FastAPI)
- **Database**: PostgreSQL 16 + Redis 7
- **Gateway**: WebSocket RPC (compatível OpenClaw)
- **Auth**: Bearer token (local mode)
- **Deploy**: Docker Compose na GCP VM (e2-standard-4)

## Estrutura do Projeto

```
ai_assistant/
├── backend/                # FastAPI application
│   ├── app/
│   │   ├── core/           # Config, security, database
│   │   ├── models/         # SQLAlchemy models
│   │   ├── api/            # FastAPI routers (v1)
│   │   ├── services/       # Business logic
│   │   │   └── gateway/    # Gateway adapter layer (agnostic)
│   │   └── plugins/        # Plugin system
│   ├── alembic/            # DB migrations
│   ├── tests/
│   └── pyproject.toml
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/            # Pages (App Router)
│   │   ├── components/     # UI components (atoms/molecules/organisms)
│   │   ├── lib/            # API client (Orval), utils
│   │   └── hooks/          # React hooks
│   ├── package.json
│   └── tsconfig.json
├── compose.yml             # Docker Compose (prod)
├── compose.dev.yml         # Docker Compose (dev overrides)
├── Caddyfile               # Reverse proxy config
├── .env.example            # Template de variáveis
└── docs/                   # Documentação
    ├── plan-v1.md          # Plano de implementação
    ├── architecture/       # ADRs e diagramas
    └── agents/             # Documentação dos agentes
```

## Princípios de Engenharia

1. **Robustez e escalabilidade** — nunca quick-fixes. Resolver causa raiz.
2. **Melhores práticas de mercado** — padrão profissional. Não MVP descartável.
3. **Zero débito técnico** — cada mudança elimina debt, nunca cria mais.
4. **Manter padrão da plataforma** — consistência com arquitetura e convenções.
5. **Uma fonte de verdade** — sem lógica duplicada. QMD no home server, não cópia.
6. **Resiliência por design** — cada componente falha gracefully, isolado.

## Convenções de Código

### Backend (Python)
- **Formatter/Linter**: ruff (format + lint)
- **Type checking**: mypy (strict mode)
- **Testes**: pytest + pytest-asyncio
- **Imports**: absolutos (`from app.models.agent import Agent`)
- **Models**: SQLAlchemy 2.0 style (mapped_column)
- **Schemas**: Pydantic v2 (model_validator, field_validator)
- **Naming**: snake_case funções/variáveis, PascalCase classes
- **Async**: todas as rotas e services são async

### Frontend (TypeScript)
- **Linter**: ESLint + Prettier
- **Testes**: Vitest (unit) + Playwright (E2E)
- **Components**: shadcn/ui como base, composição sobre herança
- **State**: TanStack Query para server state, zustand para client state
- **API**: Orval-generated hooks (nunca fetch manual)
- **Naming**: camelCase funções/variáveis, PascalCase componentes

### Git
- **Branches**: `main` (prod), `develop` (integration), `feat/*`, `fix/*`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **PRs**: squash merge para main

## Comandos

```bash
# Backend
cd backend
pip install -e ".[dev]"         # Install com dev deps
ruff check .                     # Lint
ruff format .                    # Format
mypy .                           # Type check
pytest                           # Testes
alembic upgrade head             # Migrations
uvicorn app.main:app --reload    # Dev server

# Frontend
cd frontend
npm install                      # Install
npm run dev                      # Dev server
npm run build                    # Build
npm run lint                     # Lint
npm run test                     # Testes
npx orval                        # Regenerar API client

# Docker
docker compose up -d             # Subir tudo
docker compose logs -f backend   # Logs
docker compose down              # Parar
```

## Variáveis de Ambiente

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ai_platform
DB_USER=
DB_PASSWORD=

# Redis
REDIS_URL=redis://redis:6379/0

# Auth
AUTH_MODE=local
LOCAL_AUTH_TOKEN=         # min 50 chars

# Gateway
GATEWAY_URL=ws://localhost:18789
GATEWAY_AUTH_TOKEN=

# QMD (via Tailscale)
QMD_BASE_URL=http://nextcloud:8787

# Costs
ANTHROPIC_PRICING_OPUS_INPUT=15.0    # per 1M tokens
ANTHROPIC_PRICING_OPUS_OUTPUT=75.0
ANTHROPIC_PRICING_SONNET_INPUT=3.0
ANTHROPIC_PRICING_SONNET_OUTPUT=15.0
```

## Deploy (GCP VM)

- VM: `openclaw-gateway` (e2-standard-4, 4 vCPU, 16GB RAM)
- Acesso: `ssh openclaw-gateway`
- Dashboard: `ai.felhen.ai` via Cloudflare Tunnel
- Grafana: `grafana.felhen.ai` (já configurado)
- API: interno via Tailscale (não expor publicamente)

## Decisões Arquiteturais

1. **Gateway-agnostic**: adapter layer abstrato, OpenClaw como primeira implementação
2. **Plugin system**: extensível sem modificar core
3. **QMD no home server**: uma fonte de verdade, acesso via Tailscale
4. **Build first, publish later**: repo privado até MVP funcional
5. **Portas 8001/3001**: evitar conflito com Grafana (:3000) e MC (:8000)

Detalhes completos: `docs/plan-v1.md` seções 3 e 8.

## Fase Atual

**Fase 1 — Fundação** (ver `docs/plan-v1.md` seção 6.1)

## Sincronização entre LLMs

Este arquivo é mantido sincronizado com `CLAUDE.md` e `AGENTS.md`.
Ao atualizar qualquer um, replicar nos outros dois.
