# CLAUDE.md — CrewDock (AIOS Runtime)

> Regras globais: `~/.claude/CLAUDE.md`

## Proposito

Control plane web para gerenciar agentes AI. Substitui 6 terminais + Telegram por uma interface unificada com chat interativo, observabilidade e HITL.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend (daemon) | Hono + SQLite (better-sqlite3 + Drizzle ORM), Node.js 22 |
| Frontend | Next.js 15 + shadcn/ui + Tailwind 4 + TanStack Query + Recharts |
| Monorepo | Turborepo + npm workspaces |
| Deploy frontend | Cloudflare Pages (crewdock.ai, ai.felhen.ai) |
| Deploy daemon | CT165 systemd service (aios-daemon.service) |
| API tunnel | Cloudflare Tunnel (api.crewdock.ai -> CT165:3101) |
| Auth | Cloudflare Access (ai.felhen.ai, OAuth email) |

## Estrutura

```
packages/
  daemon/    — API server Hono, agent registry, job manager, session manager, workspaces
  web/       — Next.js frontend (output: export para CF Pages)
  shared/    — Types e constants compartilhados
```

## Comandos

```bash
npm run dev              # dev mode (daemon + web)
npx turbo build          # build todos os packages
npx tsx packages/daemon/src/index.ts   # rodar daemon local
```

## Deploy

```bash
# Daemon (CT165)
ssh claude-monitor "cd /home/claude/aios-runtime && git pull && npx turbo build --filter=@aios/daemon --force"
ssh proxmox "pct exec 165 -- systemctl restart aios-daemon"

# Frontend (CF Pages)
NEXT_PUBLIC_DAEMON_URL=https://api.crewdock.ai npx turbo build --filter=@aios/web --force
source ~/.env && CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN wrangler pages deploy packages/web/out --project-name crewdock --branch main --commit-dirty=true
```

## URLs

- https://ai.felhen.ai — app protegido (CF Access)
- https://crewdock.ai — app publico
- https://api.crewdock.ai — daemon API (CF Tunnel -> CT165:3101)

## Workspaces

Auto-descobertos por scan de CLAUDE.md no filesystem. Configuraveis via Settings (workspaces.json). Cada workspace = um diretorio com CLAUDE.md onde o Claude roda com contexto local.

## Backlog

Ver `docs/backlog.md` para itens pendentes.
