# CrewDock — Backlog

## Critico (seguranca)

- [x] **Remover `--dangerously-skip-permissions` das sessoes web** — implementado: sessoes usam `--permission-mode` configuravel (plan/acceptEdits/bypassPermissions). Default: `plan` (read-only)
- [x] **Terminal embutido (xterm.js)** — implementado: pagina `/terminal` com xterm.js + node-pty. Shell completo no workspace, com tabs multiplas

## Infra (impacta funcionalidade)

- [x] **MCP servers no CT165** — instalados `qmd` (4 tools) e `felhen_memory` (7 tools) no user `claude`. Index qmd copiado do Mac (619 docs). Symlink `/Users/antoniomello/felhencloud` -> `/mnt/felhencloud` para paths baterem. Validado via Console (7+4 tools visiveis)

## Funcional (impacta uso diario)

- [ ] **Schedule Manager** — pagina placeholder hoje. Implementar: ler systemd timers do CT165, visualizar crons, enable/disable, trigger manual
- [ ] **Morning briefing inteligente** — atualmente e lista simples de jobs recentes. Evoluir para exec summary formatado: o que mudou, o que precisa atencao, o que foi resolvido
- [x] **Persistencia de contexto entre mensagens** — corrigido: usa `--resume <claude_session_id>` em vez de `--continue`. Captura session_id do evento `init` do stream-json, persiste em `sessions.claude_session_id`. Sessoes no mesmo workspace nao colidem. Validado E2E

## Qualidade / Polish

- [x] **Favicon** — SVG com logo "A" do AIOS
- [x] **Persistir permissionMode no DB** — coluna `permission_mode` adicionada ao schema, migration-safe
- [x] **Overview adaptar para Workspaces** — pagina refatorada: WorkspaceCard agrupado por `group`, Morning Briefing combina sessions + jobs, Recent Sessions primeiro e Recent Jobs (background) como secao separada. Deep-link `/console?workspace=X&session=Y`
- [x] **Log viewer em Job Detail** — endpoint `GET /api/jobs/:id/logs` le logPath do disco, frontend carrega via `useJobLogs` para jobs completados
- [ ] **Cost tracking real** — validar se Claude CLI via OAuth (plano Max) reporta tokens/custo da mesma forma que API

## Futuro

- [ ] **MCP Server** — expor daemon como MCP server (stdio) para Claude Code/App conectar programaticamente
- [ ] **Push notifications** — substituir Telegram por web push para HITL e alertas
- [ ] **Docker Compose** — para rodar fora do CT165
- [ ] **Open source prep** — README com onboarding, LICENSE MIT, CONTRIBUTING.md

## Criterio de Sucesso

Antonio usar ai.felhen.ai diariamente por 30 dias consecutivos.
Se sim → continuar evoluindo. Se nao → arquivar.
