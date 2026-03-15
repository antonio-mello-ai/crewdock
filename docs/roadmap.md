# CrewDock — Roadmap

**Última atualização**: 15 Mar 2026

## Status Atual (v0.1.0)

Backend com 22 endpoints, frontend com 9 páginas read-only, deploy em VM no home server, QMD integrado, OpenClaw 4 agentes configurados. Dashboard acessível em your-domain.com.

---

## Prioridade 1 — Frontend de Escrita

O frontend é 100% read-only. Precisa de formulários CRUD para ser utilizável.

- [ ] **Criar/editar agentes** — modal/form com nome, modelo, descrição, avatar
- [ ] **Criar/editar tasks** — form com título, descrição, agent, schedule, recurring
- [ ] **Drag-and-drop no Kanban** — mover tasks entre colunas (@dnd-kit já instalado)
- [ ] **Aprovar/rejeitar approvals** — botões de ação no feed
- [ ] **Criar/editar webhooks** — form com URL, eventos, secret
- [ ] **Configurar settings** — editar gateway URL, auth, enable/disable plugins
- [ ] **Criar/editar skills** — form com nome, agent, config
- [ ] **Deletar** — confirmação em todas as entidades

## Prioridade 2 — Conectar Peças Existentes

- [ ] **OpenClaw WebSocket adapter** — RPC client real para status live dos agentes (online/offline/busy)
- [ ] **Skills e Settings pages** — conectar à API (ainda usam placeholder)
- [ ] **Orval** — gerar API client tipado do OpenAPI spec (configurado, não executado)

## Prioridade 3 — Funcionalidade Nova

- [ ] **Task scheduler** — APScheduler para crons dos agentes (morning briefing, infra health, etc)
- [ ] **Redis pub/sub no SSE** — substituir event bus in-memory por Redis
- [ ] **Webhook dispatcher** — worker RQ que envia webhooks nos eventos
- [ ] **Agent chat** — interface para enviar mensagens a um agente e ver resposta (via gateway)

## Prioridade 4 — Polish e Produção

- [ ] **Testes de integração** — pytest com DB real (test database)
- [ ] **CI/CD** — GitHub Actions (ruff, mypy, pytest, npm build, npm lint)
- [ ] **Theming** — CSS variables customizáveis além do dark mode
- [ ] **Screenshots** — capturar para README
- [ ] **Sync QMD automático** — cron rsync Nextcloud → VM 160
- [ ] **Domínio** — registrar crewdock.ai

## Prioridade 5 — Fase 5 do Plano Original

- [ ] **HA Voice** — Wake Word → STT (Whisper) → Atlas agent → TTS (Piper)
- [ ] **Built-in plugins** — Home Assistant, Telegram digest
- [ ] **Skills reais** — morning-briefing, infra-health, content-radar
- [ ] **Abrir repo público** — quando tiver README com screenshots e getting started funcional

---

## Decisões Pendentes

- **QMD vs alternativas** — QMD funciona para docs, mas memória de agentes pode precisar de outra solução (Mem0, Zep). Campo em evolução rápida.
- **Quando abrir o repo** — após Prioridade 1 (frontend funcional) + screenshots
