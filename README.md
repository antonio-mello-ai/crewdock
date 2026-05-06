# CrewDock (AIOS Runtime)

> Control plane web para orquestrar agentes AI. Uma única interface para chat interativo, terminal embutido, observabilidade, schedules e HITL — substitui vários terminais abertos e bots do Telegram.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

## O que é

CrewDock é um runtime para rodar Claude Code (ou outros agentes AI) de forma gerenciada, com:

- **Console** — chat interativo com Claude em qualquer workspace (diretório com `CLAUDE.md`), com modo de permissão configurável (Read Only / Dangerously Accept Edits) e stop em tempo real
- **Terminal** — xterm.js + node-pty, shell completo no browser, ideal para sessões interativas do Claude que respeitam `settings.json`
- **Schedules** — gerenciamento visual de systemd timers do AIOS (Run / Enable / Disable)
- **Overview** — briefing estruturado por seções (Needs attention / In progress / Resolved) e cards por workspace
- **Jobs** — histórico de agentes executados por cron com log viewer
- **MCP Server** — expõe a API do daemon via MCP stdio para Claude Code conectar programaticamente

## Princípio Operacional

O runtime existe para aumentar autonomia com guardrails. Em especial: classificacao de risco, rollback, observabilidade e preservacao de invariantes importam mais do que velocidade bruta de execucao.

## Direcional Company Brain

Este repo e o projeto dono da evolucao AIOS / Company Brain. O CrewDock atual continua sendo o control plane de agentes; a proxima camada e transformar esse runtime em sistema de execucao estrategica com ingestao de evidencias, Strategy Map, Evidence Inbox, Drift Inbox, Guidance, Workflow Blueprints, Work Items e AutoImprove UI/API.

A fonte unica de features fica em [`corp/docs/action/aios-product-roadmap.md`](../../../corp/docs/action/aios-product-roadmap.md). O boundary local e o primeiro slice de implementacao estao em [`docs/company-brain-direction.md`](docs/company-brain-direction.md).

Juntos em Sala e o self-improving de escolas continuam separados como vertical/adapters. Aprendizados daquele produto entram aqui como signals, artifacts, work items ou improvement proposals, nao como codigo escolar dentro do core horizontal.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend (daemon) | Hono + SQLite (better-sqlite3 + Drizzle ORM), Node.js 22 |
| Frontend | Next.js 15 + shadcn/ui + Tailwind 4 + TanStack Query |
| Terminal | xterm.js + node-pty |
| Monorepo | Turborepo + npm workspaces |
| MCP | @modelcontextprotocol/sdk TypeScript |

## Quickstart

### Opção 1 — Docker Compose (recomendado)

```bash
git clone https://github.com/antonio-mello-ai/crewdock.git
cd crewdock

# Configure o diretório de workspaces (onde estão seus CLAUDE.md)
export AIOS_PROJECTS_DIR=/path/to/your/projects

docker compose up -d
```

Acesse o daemon em `http://localhost:3101`. Rode o frontend separadamente com `npm run dev --workspace=@aios/web`.

### Opção 2 — Desenvolvimento local

```bash
git clone https://github.com/antonio-mello-ai/crewdock.git
cd crewdock
npm install
npm run dev
```

Daemon roda em `:3101`, frontend em `:3000`.

## Estrutura

```
packages/
  daemon/      — API Hono, session manager, terminal PTY, schedules, briefing
  web/         — Next.js frontend (static export)
  shared/      — Types e constants compartilhados
  mcp-server/  — MCP server stdio para Claude Code
```

## MCP Server

Registre o MCP do AIOS no Claude Code para controlar a runtime via chat:

```bash
claude mcp add aios -s user \
  --env AIOS_DAEMON_URL=https://your-daemon.example.com \
  --env CF_ACCESS_CLIENT_ID=<service-token-client-id> \
  --env CF_ACCESS_CLIENT_SECRET=<service-token-client-secret> \
  -- node /path/to/crewdock/packages/mcp-server/dist/index.js
```

`CF_ACCESS_CLIENT_ID` e `CF_ACCESS_CLIENT_SECRET` são o service token do Cloudflare Access criado para o daemon. Necessário apenas quando o daemon está atrás de CF Access (deploy em produção).

Tools disponíveis: `get_briefing`, `list_workspaces`, `list_sessions`, `get_session_messages`, `list_schedules`, `run_schedule`, `list_jobs`, `get_job_logs`.

## Configuração

Variáveis de ambiente (via `.env.prod`):

| Variável | Descrição | Default |
|----------|-----------|---------|
| `AIOS_DB_PATH` | Caminho do SQLite | `./aios.db` |
| `AIOS_LOG_DIR` | Diretório de logs | `./logs` |
| `AIOS_PROJECTS_DIR` | Raiz onde procurar `CLAUDE.md` para workspaces | `./projects` |
| `PORT` | Porta do daemon | `3101` |
| `HOST` | Bind do daemon | `0.0.0.0` |
| `CF_ACCESS_TEAM_DOMAIN` | Team domain do CF Access (ex: `org.cloudflareaccess.com`) | — |
| `CF_ACCESS_AUD` | AUD tag do CF Access application | — |
| `CF_ACCESS_SOFT_MODE` | `true` loga rejeições sem bloquear (rollout inicial) | `false` |
| `AIOS_CORS_ORIGINS` | Origins permitidas pelo CORS | — |

## Deploy em produção

Exemplo real em produção (CT165 + Cloudflare):

- **Daemon**: LXC container com systemd service (`aios-daemon.service`)
- **Frontend**: Cloudflare Pages (export estático)
- **API tunnel**: Cloudflare Tunnel (`api.example.ai` → CT165:3101)
- **Auth**: Cloudflare Access (OAuth por email)

## Contribuindo

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

MIT. Ver [LICENSE](LICENSE).
