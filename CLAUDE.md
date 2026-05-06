# CLAUDE.md — CrewDock (AIOS Runtime)

> Regras globais: `~/.claude/CLAUDE.md`

## Proposito

Control plane web para gerenciar agentes AI. Substitui 6 terminais + Telegram por uma interface unificada com chat interativo, observabilidade e HITL.

## AIOS Operacional

- O runtime deve reforcar julgamento com guardrails, nao acelerar mudanca cega
- Toda evolucao que aumenta autonomia precisa preservar classificacao de risco, gates, rollback e observabilidade
- Feedback real e valioso em previews e experimentos reversiveis; producao e comportamento cross-workspace exigem contexto suficiente antes de mutar
- Docs direcionais do projeto nao carregam "Ultima atualizacao"; historico relevante fica no changelog e docs de acao

## Direcional Atual - Company Brain

Este repo e o projeto dono da evolucao AIOS / Company Brain. Antes de implementar features novas, ler:

- `docs/session-handoff-2026-05-05-aios-company-brain.md`
- `docs/company-brain-direction.md`
- `../../../corp/docs/action/aios-product-roadmap.md`
- `../../../corp/docs/action/aios-yc-thesis-five-week-build-plan-2026-05-05.md`
- `../../../corp/docs/estrategia/felhen-autoimprove-core.md`

Boundary obrigatorio:

- `aios-runtime` contem objetos horizontais de estrategia, evidencia, workflow, work item, guidance, agent context e AutoImprove.
- Juntos em Sala continua separado como vertical de escolas. Nao trazer `School`, `Student`, `Teacher`, `ActivityAdaptation`, tenant profile escolar ou schema de escola para o core deste repo.
- Aprendizado de verticais entra como `Artifact`, `Signal`, `WorkItem`, `WorkflowRun`, `GuidanceItem` ou `ImprovementProposal`, com promotion gates.
- O core nao deve acoplar a Jira, Linear ou GitHub diretamente. Primeiro modelar `WorkItem` canonico; plataformas externas entram por adapters.
- Toda nova ingestao precisa preservar provenance e fechar o loop: evidence -> interpretation -> linking -> drift/guidance -> action -> feedback -> learning.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend (daemon) | Hono + SQLite (better-sqlite3 + Drizzle ORM), Node.js 22 |
| Frontend | Next.js 15 + shadcn/ui + Tailwind 4 + TanStack Query + Recharts |
| Monorepo | Turborepo + npm workspaces |
| Deploy frontend | Cloudflare Pages (crewdock.ai, ai.felhen.ai) |
| Deploy daemon | CT165 systemd service (aios-daemon.service) |
| API tunnel | Cloudflare Tunnel (api.felhen.ai -> CT165:3101) |
| Auth | Cloudflare Access (ai.felhen.ai + api.felhen.ai, JWT validation no daemon) |

## Estrutura

```
packages/
  daemon/      — API server Hono, agent registry, job manager, session manager, terminal manager, schedules, briefing, workspaces
  web/         — Next.js frontend (output: export para CF Pages)
  shared/      — Types e constants compartilhados
  mcp-server/  — MCP server stdio que expoe a API do daemon para Claude Code
```

## MCP Server (Claude Code integration)

O daemon pode ser consumido via MCP server do Claude Code. Registrar uma vez:

```bash
claude mcp add aios -s user \
  --env AIOS_DAEMON_URL=https://api.felhen.ai \
  --env CF_ACCESS_CLIENT_ID=$CF_ACCESS_CLIENT_ID \
  --env CF_ACCESS_CLIENT_SECRET=$CF_ACCESS_CLIENT_SECRET \
  -- node <path>/packages/mcp-server/dist/index.js
```

`CF_ACCESS_CLIENT_ID` e `CF_ACCESS_CLIENT_SECRET` ficam em `~/.env` (service token do CF Access). Ler valores em CT165:
```bash
ssh proxmox "pct exec 165 -- grep CF_ACCESS /home/claude/aios-runtime/.env.prod"
```

Tools expostas: `get_briefing`, `list_workspaces`, `list_sessions`, `get_session_messages`, `list_schedules`, `run_schedule`, `list_jobs`, `get_job_logs`.

## Console vs Terminal

| Feature | Console (`/console`) | Terminal (`/terminal`) |
|---------|---------------------|----------------------|
| Modo | Chat (claude -p) | Shell interativo (PTY) |
| Permissoes | Configuravel: Read Only / Dangerously Accept Edits | Interativo (respeita settings.json) |
| Multiline | Shift+Enter | Shift+Enter ou Cmd+Enter |
| Stop | Botao Stop (SIGTERM) | Ctrl+C |
| Use case | Queries rapidas, monitoramento | Controle total, sessoes interativas |

## Schedule Manager (`/schedules`)

CRUD completo de systemd timers AIOS-owned (filtrados por `User=claude` ou `ExecStart` em `/home/claude/`). Suporta create/delete/run/enable/disable + log viewer inline via `journalctl`. Seguranca: validacao de nome (regex), comando (absolute path whitelist), OnCalendar (charset restrito), sem shell metacharacters.

## Notificacoes

Dois niveis:
1. **In-tab (Notification API)** — funciona com browser aberto, observa failed jobs + HITL via polling
2. **Web Push + PWA** — funciona com browser/app fechado, requires VAPID keys no `.env.prod`, iOS 16.4+ precisa "Add to Home Screen"

Quando Web Push ativo, detector in-tab desliga automaticamente para evitar duplicacao. Cloudflare Access tem bypass para `/sw.js`, `/manifest.json`, `/icons`.

## Daemon

Roda como usuario `claude` (UID 33) com sudo NOPASSWD no CT165. Service: `aios-daemon.service`. DB persistente em `/home/claude/.aios/aios.db` (config em `.env.prod`). Membro do grupo `systemd-journal` para ler logs proprios.

Env vars obrigatórias em `.env.prod` (além de DB_PATH, LOG_DIR, etc.):

| Variável | Descrição |
|----------|-----------|
| `CF_ACCESS_TEAM_DOMAIN` | Ex: `felhen.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | AUD tag do CF Access application — ler via CF dashboard ou API |
| `CF_ACCESS_SOFT_MODE` | `true` para logar rejeições sem bloquear (usar em rollout inicial) |
| `NODE_ENV` | `production` em CT165 (impede `AIOS_AUTH_DISABLED` de funcionar) |
| `AIOS_CORS_ORIGINS` | Origins permitidas pelo CORS (ex: `https://ai.felhen.ai,https://crewdock.ai`) |

Ver `docs/auth-rollout.md` para arquitetura auth, rollback e smoke test checklist.

## Comandos

```bash
npm run dev              # dev mode (daemon + web)
npx turbo build          # build todos os packages
npx tsx packages/daemon/src/index.ts   # rodar daemon local
```

## Deploy

```bash
# Daemon (CT165)
ssh proxmox "pct exec 165 -- bash -c 'cd /home/claude/aios-runtime && git pull && npx turbo build --filter=@aios/daemon --force'"
ssh proxmox "pct exec 165 -- systemctl restart aios-daemon"

# Frontend (CF Pages)
# IMPORTANT: NEXT_PUBLIC_VAPID_PUBLIC_KEY must match the VAPID_PUBLIC_KEY in
# CT165's /home/claude/aios-runtime/.env.prod. Without it, push subscribe fails
# silently ("VAPID public key not configured").
# NEXT_PUBLIC_VAPID_PUBLIC_KEY: ler de CT165 com:
# ssh proxmox "pct exec 165 -- grep VAPID_PUBLIC_KEY /home/claude/aios-runtime/.env.prod"
NEXT_PUBLIC_DAEMON_URL=https://api.felhen.ai \
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<valor de VAPID_PUBLIC_KEY em CT165/.env.prod> \
npx turbo build --filter=@aios/web --force
source ~/.env && CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN wrangler pages deploy packages/web/out --project-name crewdock --branch main --commit-dirty=true
```

## URLs

- https://ai.felhen.ai — app protegido (CF Access)
- https://crewdock.ai — app publico
- https://api.felhen.ai — daemon API (CF Tunnel -> CT165:3101)

## Workspaces

Auto-descobertos por scan de CLAUDE.md no filesystem. Configuraveis via Settings (workspaces.json). Cada workspace = um diretorio com CLAUDE.md onde o Claude roda com contexto local.

## Backlog

Ver `docs/backlog.md` para itens pendentes.
