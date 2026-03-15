# CrewDock — Roadmap

**Atualizado**: 15 Mar 2026 | **Versão atual**: v0.1.0

---

## Concluído (v0.1.0)

- [x] Backend: 22 API endpoints, 8 models, 14 testes, mypy strict
- [x] Frontend: 9 páginas, CRUD agents/tasks, dark mode, mobile responsive
- [x] Deploy: Docker Compose, Cloudflare Tunnel, clean install testado
- [x] Knowledge: QMD integrado com REST wrapper (177 docs, 801 embeddings)
- [x] OpenClaw: 4 agentes configurados com IDENTITY.md
- [x] Open source: repo público, MIT license, README com screenshots
- [x] Landing page: crewdock.ai via Cloudflare Pages

---

## P0 — Demo-Ready (próximas 2 semanas)

O que falta para um demo convincente e lançamento público.

- [ ] **Agent chat interface** — conversar com um agente pelo dashboard via gateway. É o "wow moment" que transforma um CRUD em uma plataforma de AI agents
- [ ] **Demo video** — 3 minutos mostrando: criar agente, criar task, chat com agente, ver atividade
- [ ] **Drag-and-drop no Kanban** — mover tasks entre colunas (@dnd-kit já instalado)

## P1 — Diferenciação vs Sintra (próximo mês)

Features que constroem o diferencial competitivo.

- [ ] **Agent templates** — gallery de agentes pré-configurados ("SEO Specialist", "Content Writer", "Dev Assistant") instaláveis com 1 click
- [ ] **Skills com conteúdo real** — pelo menos 3 skills funcionais (web search, email draft, SEO audit)
- [ ] **Integrações via MCP** — Gmail, Calendar, Notion como MCP tools acessíveis pelos agentes
- [ ] **Shared context** — agentes compartilham knowledge base (diferencial principal vs Sintra)
- [ ] **OpenClaw WebSocket adapter** — conexão real ao gateway para status live dos agentes

## P2 — Produção (mês 2)

Robustez para uso real diário.

- [ ] **Task scheduler** — APScheduler executando crons de verdade (morning briefing, infra health)
- [ ] **Redis pub/sub no SSE** — substituir event bus in-memory por Redis para persistência
- [ ] **Webhook dispatcher** — worker RQ que envia webhooks nos eventos
- [ ] **CI/CD** — GitHub Actions (ruff, mypy, pytest, npm build, lint)
- [ ] **Testes de integração** — pytest com DB real (test database)
- [ ] **Approval workflow no frontend** — aprovar/rejeitar pelo dashboard
- [ ] **Skills e Settings pages** — conectar à API (ainda usam placeholder)

## P3 — Produto (mês 3)

Transição de open source para open source + produto.

- [ ] **CrewDock Cloud** — versão hosted (sign up → dashboard em 30 segundos)
- [ ] **Auth real** — login com email/password ou OAuth (substituir bearer token)
- [ ] **Multi-tenant** — cada usuário tem agentes isolados
- [ ] **Billing** — Stripe integration para planos pagos
- [ ] **Orval** — gerar API client tipado do OpenAPI spec

## P4 — Expansão

- [ ] **HA Voice** — Wake Word → STT (Whisper) → agent → TTS (Piper)
- [ ] **Built-in plugins** — Home Assistant, Telegram digest
- [ ] **Mobile app** — React Native ou PWA
- [ ] **Marketplace** — community plugins e agent templates

---

## Estratégia de Lançamento

1. README com screenshots (feito)
2. LinkedIn post — perfil de executivo que constrói
3. Show HN — quando tiver demo video + agent chat
4. Awesome lists PRs — awesome-ai-agents, awesome-llm-tools
5. Product Hunt — quando v0.2 com templates e skills
6. Dev.to article — "I built an open-source alternative to Sintra.ai"

---

## Referências

- **Benchmark**: [docs/benchmark-sintra.md](benchmark-sintra.md) — análise completa do Sintra.ai
- **Known Issues**: [docs/known-issues.md](known-issues.md)
