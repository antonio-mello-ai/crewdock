# CrewDock — Backlog

## Critico (seguranca)

- [x] **Remover `--dangerously-skip-permissions` das sessoes web** — implementado: sessoes usam `--permission-mode` configuravel (plan/acceptEdits/bypassPermissions). Default: `plan` (read-only)
- [x] **Terminal embutido (xterm.js)** — implementado: pagina `/terminal` com xterm.js + node-pty. Shell completo no workspace, com tabs multiplas

## Infra (impacta funcionalidade)

- [ ] **MCP servers no CT165** — Claude no Console/Terminal nao tem MCP servers configurados (`~/.claude.json` do user `claude` sem `mcpServers`). Para agentes como `agente-badhu` que usam SSH direto nao e bloqueante (SSH funciona via LAN 192.168.20.x). Mas para agentes que dependem de MCPs (QMD, Airflow, ClickHouse), e necessario configurar. Prioridade: media

## Funcional (impacta uso diario)

- [ ] **Schedule Manager** — pagina placeholder hoje. Implementar: ler systemd timers do CT165, visualizar crons, enable/disable, trigger manual
- [ ] **Morning briefing inteligente** — atualmente e lista simples de jobs recentes. Evoluir para exec summary formatado: o que mudou, o que precisa atencao, o que foi resolvido
- [ ] **Persistencia de contexto entre mensagens** — sessoes usam `--continue` mas cada mensagem spawna processo novo. Validar se contexto persiste em conversas longas

## Qualidade / Polish

- [x] **Favicon** — SVG com logo "A" do AIOS
- [x] **Persistir permissionMode no DB** — coluna `permission_mode` adicionada ao schema, migration-safe
- [ ] **Overview adaptar para Workspaces** — pagina ainda referencia agentes/frentes do registry antigo, precisa alinhar com modelo de workspaces
- [ ] **Log viewer em Job Detail** — mostra vazio para jobs completados, precisa carregar conteudo do arquivo de log
- [ ] **Cost tracking real** — validar se Claude CLI via OAuth (plano Max) reporta tokens/custo da mesma forma que API

## Futuro

- [ ] **MCP Server** — expor daemon como MCP server (stdio) para Claude Code/App conectar programaticamente
- [ ] **Push notifications** — substituir Telegram por web push para HITL e alertas
- [ ] **Docker Compose** — para rodar fora do CT165
- [ ] **Open source prep** — README com onboarding, LICENSE MIT, CONTRIBUTING.md

## Criterio de Sucesso

Antonio usar ai.felhen.ai diariamente por 30 dias consecutivos.
Se sim → continuar evoluindo. Se nao → arquivar.
