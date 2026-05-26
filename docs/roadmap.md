# CrewDock — Roadmap

**Atualizado**: 15 Mar 2026 | **Versão atual**: v1.1.0

### Release History

| Versão | Marco | Data |
|--------|-------|------|
| v0.1.0 | Fundação — backend, frontend, deploy | 14/Mar |
| v0.2.0 | CRUD, chat stub, dark mode, public repo | 15/Mar |
| v0.3.0 | Design system, UI polish | 15/Mar |
| v0.4.0 | Agent templates, toasts | 15/Mar |
| v0.5.0 | Task scheduler, Redis SSE, webhooks | 15/Mar |
| v0.6.0 | Gateway adapter, CI/CD | 15/Mar |
| v0.7.0 | Form validation, error handling | 15/Mar |
| v0.8.0 | JWT auth, login page | 15/Mar |
| v0.9.0 | Multi-tenant foundation | 15/Mar |
| v1.0.0 | Stable release | 15/Mar |
| **v1.1.0** | **Real AI agents, knowledge context, streaming** | **15/Mar** |

---

## Concluído

### v1.1.0 — Real AI Agents
- [x] LLM chat via Anthropic API with system prompts
- [x] Streaming responses (SSE token-by-token)
- [x] Knowledge-aware agents (QMD context injection)
- [x] Persistent chat history (Redis + in-memory fallback)
- [x] Real cost tracking (actual token usage)
- [x] Real task execution (scheduler sends to LLM)
- [x] Onboarding flow for new users
- [x] Auth guard with redirect to login

### v1.0.0 — Platform
- [x] JWT authentication with setup flow
- [x] Multi-tenant foundation (workspace model, agent ownership)
- [x] 10 agent templates across 6 categories
- [x] Design system with branded theme
- [x] CI/CD via GitHub Actions
- [x] Clean install tested on fresh VM

### Earlier (v0.1.0 — v0.9.0)
- [x] 29 API endpoints across 15 routers
- [x] 11 database models with Alembic migrations
- [x] 11+ frontend pages with CRUD
- [x] Drag-and-drop Kanban board
- [x] Task scheduler (APScheduler)
- [x] Redis SSE with fallback
- [x] Webhook dispatcher (HMAC-signed)
- [x] Plugin system with lifecycle
- [x] Gateway-agnostic adapter
- [x] Docker Compose deployment
- [x] Landing page at crewdock.ai

---

## Next Up

### v1.2.0 — Tools & Actions
- [ ] MCP tool integration (Gmail, Calendar, Notion)
- [ ] Web search tool for agents
- [ ] File read/write capabilities
- [ ] Agent-to-agent communication

### v1.3.0 — Polish & Scale
- [ ] Collapsible sidebar
- [ ] User profile page with settings
- [ ] More agent templates (15+)
- [ ] Integration tests with real DB
- [ ] Demo video for README and crewdock.ai

### v2.0.0 — CrewDock Cloud
- [ ] Hosted version (sign up → dashboard in 30 seconds)
- [ ] Stripe billing integration
- [ ] Full multi-tenant data isolation
- [ ] Custom domains per workspace

---

## Strategic Direction

**Model**: Open source + product (GitLab, Supabase, n8n model)
- **CrewDock OSS** — core platform, self-hosted, free
- **CrewDock Cloud** — hosted version, $29-99/month
- **Enterprise** — SSO, audit logs, SLA

**Benchmark**: [docs/benchmark-sintra.md](benchmark-sintra.md)

---

## References

- **Known Issues**: [docs/known-issues.md](known-issues.md)
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md)
- **Contributing**: [CONTRIBUTING.md](../CONTRIBUTING.md)
