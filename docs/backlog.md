# CrewDock — Backlog

## Critico (seguranca)

- [x] **Remover `--dangerously-skip-permissions` das sessoes web** — implementado: sessoes usam `--permission-mode` configuravel (plan/acceptEdits/bypassPermissions). Default: `plan` (read-only)
- [x] **Terminal embutido (xterm.js)** — implementado: pagina `/terminal` com xterm.js + node-pty. Shell completo no workspace, com tabs multiplas

## Infra (impacta funcionalidade)

- [x] **MCP servers no CT165** — instalados `qmd` (4 tools) e `felhen_memory` (7 tools) no user `claude`. Index qmd copiado do Mac (619 docs). Symlink `/Users/antoniomello/felhencloud` -> `/mnt/felhencloud` para paths baterem. Validado via Console (7+4 tools visiveis)

## Funcional (impacta uso diario)

- [x] **Schedule Manager** — CRUD completo: list/run/enable/disable + create (form com calendar presets) + delete (com safety check AIOS-owned) + view logs (journalctl expandivel por row). Timers filtrados por `User=claude` ou `ExecStart` em `/home/claude/`. Endpoints REST em `/api/schedules`. User `claude` adicionado ao grupo `systemd-journal` para leitura de logs
- [x] **Morning briefing inteligente** — endpoint `GET /api/briefing?hours=N` retorna secoes estruturadas (Needs attention / In progress / Resolved / Recent conversations). Frontend renderiza `BriefingPanel` com icones e links. Deterministico, refresh a cada 30s
- [x] **Fix: DB path em producao** — daemon usava `/tmp/aios-dev.db` (volatil) por falta de `.env.prod`. Criado `.env.prod` com paths persistentes em `/home/claude/.aios/` e `.env.prod.example` no repo
- [x] **Persistencia de contexto entre mensagens** — corrigido: usa `--resume <claude_session_id>` em vez de `--continue`. Captura session_id do evento `init` do stream-json, persiste em `sessions.claude_session_id`. Sessoes no mesmo workspace nao colidem. Validado E2E

## Qualidade / Polish

- [x] **Favicon** — SVG com logo "A" do AIOS
- [x] **Persistir permissionMode no DB** — coluna `permission_mode` adicionada ao schema, migration-safe
- [x] **Overview adaptar para Workspaces** — pagina refatorada: WorkspaceCard agrupado por `group`, Morning Briefing combina sessions + jobs, Recent Sessions primeiro e Recent Jobs (background) como secao separada. Deep-link `/console?workspace=X&session=Y`
- [x] **Log viewer em Job Detail** — endpoint `GET /api/jobs/:id/logs` le logPath do disco, frontend carrega via `useJobLogs` para jobs completados
- [x] **Cost tracking real** — validado: `total_cost_usd` do stream-json result event e capturado corretamente, inclui cache_creation/cache_read tokens no calculo (por isso $0.07/msg mesmo com 3 input_tokens). Sum das mensagens bate exato com session total. Sob plano Max, Antonio paga $0, mas o valor reflete equivalente pay-per-use para comparar consumo entre workspaces

## Futuro

- [x] **MCP Server** — package `@aios/mcp-server` com 8 tools (get_briefing, list_workspaces, list_sessions, get_session_messages, list_schedules, run_schedule, list_jobs, get_job_logs). Registrado via `claude mcp add aios -s user -- node dist/index.js`. Validado E2E (tools/list e tools/call)
- [x] **Browser notifications (Notification API)** — hook `useAppNotifications` no AppShell observa failed jobs + pending HITL via polling, dispara notificações nativas, atualiza `document.title` com badge. Toggle de permissão em Settings. Skip seed phase no primeiro load. Click na notificação abre a rota relevante
- [ ] **Web Push (futuro)** — para notificar com browser fechado (precisa service worker + VAPID + PWA)
- [x] **Docker Compose** — `Dockerfile` multi-stage (builder + runtime non-root aios user), `docker-compose.yml` com volumes para DB/logs/projetos/.claude. Build validado + container rodou health endpoint OK
- [x] **Open source prep** — `README.md` com quickstart Docker e dev, `LICENSE` MIT, `CONTRIBUTING.md` com estilo de commit e setup de dev

## Criterio de Sucesso

Antonio usar ai.felhen.ai diariamente por 30 dias consecutivos.
Se sim → continuar evoluindo. Se nao → arquivar.
