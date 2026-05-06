# CrewDock — Backlog

## Direcional P0 - Company Brain / YC Thesis

Fonte de produto: `../../../../corp/docs/action/aios-product-roadmap.md`.
Boundary local: `docs/company-brain-direction.md`.

Status Slice 1 em 2026-05-05 23h BRT: primeiro kernel operacional implementado em codigo para strategy + goal/cadence + evidence + work item + workflow run + gates + provenance. O corte cobre `Source`, `Artifact`, `StrategicPriority`, `Goal`, `Milestone`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `WorkflowStep` e `ArtifactLink`; `Decision`, `AgentContext` e `ImprovementProposal` continuam para Slice 2+.

Status Watcher v0 em 2026-05-06: camada inicial implementada para transformar schedules/jobs em watchers ligados ao Company Brain, monitorando fontes e workflows sem depender de sessao interativa aberta. O corte cobre `Watcher`, `WatcherRun`, summary/API/UI/MCP e run manual que gera outputs internos com provenance/action policy.

Status Closed Loop v0 em 2026-05-06: implementado o loop minimo `WatcherRun -> Artifact -> Signal -> AlignmentFinding -> GuidanceItem`, com `Signal` no envelope do AutoImprove Core, classificacao contra priority/goal, guidance com status/feedback e exibicao em API/UI/MCP. Sem writeback externo automatico.

Status Guidance Feedback v0 em 2026-05-06: `GuidanceItem` agora pode ser atualizado via API/UI/MCP com `status`, `feedback_status`, `feedback_note` e `feedback_at`, mantendo o loop interno sem writeback externo.

Status Decision v0 em 2026-05-06: `Decision` implementado como objeto horizontal do Company Brain com racional, owner, artifacts fonte, priorities/goals, status, visibility e provenance.

Status AgentContext v0 em 2026-05-06: `AgentContext` implementado como contexto executavel gerado a partir de conhecimento aprovado, com target agent, source knowledge IDs, markdown content, status, validation status e provenance.

Status ImprovementProposal v0 em 2026-05-06: `ImprovementProposal` implementado para o loop AutoImprove interno, com signals, hypothesis, change class, patch ref, validation plan, impact review e promotion status, sem auto-apply.

Status Local Docs Importer v0 em 2026-05-06: importer read-only para markdown/text local implementado via API/MCP, gerando `Source` + `Artifact` com hash, raw_ref, metadata e provenance.

- [x] **Company Brain schema v0** — adicionar objetos horizontais no daemon: `Source`, `Artifact`, `StrategicPriority`, `Decision`, `Signal`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `AlignmentFinding`, `GuidanceItem`, `AgentContext` e `ImprovementProposal`
- [x] **Source registry + raw artifact store** — guardar artifacts com `source`, `raw_ref`, author, timestamp, hash, visibility e provenance
- [x] **Watcher / Operating Loop Layer v0** — adicionar `Watcher` e `WatcherRun` no schema/tipos/API, com `source_ids`, `trigger_type`, `schedule`, `scope_query`, `target_workflow_blueprint_id`, `risk_class`, `action_policy`, `status`, `last_run_at`, `next_run_at`, `failure_policy` e `output_policy`
- [x] **Watcher status em Source Health / Summary** — expor status basico de watchers, ultimas execucoes, erro, artifacts/signals/work items gerados e freshness em `/api/company-brain/summary` ou tela de Source Health
- [x] **Watcher manual/simulado v0** — criar watcher manual para PR/CI ou GitHub Issues que consiga registrar uma execucao sem webhook real
- [x] **Watcher output com provenance e policy** — garantir que uma execucao de watcher consiga gerar `Artifact`, `Signal` ou `WorkItem` com provenance, `action_policy`, `risk_class` e trilha auditavel antes de qualquer writeback. Implementado para `Artifact`, `Signal`, `WorkItem`, `AlignmentFinding` e `GuidanceItem`.
- [ ] **Strategy layer** — cadastrar prioridades, tradeoffs, owners, criterios de sucesso e status. Parcial: priorities/owners/status/success criteria e decisions implementados; tradeoffs ficam pendentes.
- [x] **Decision v0** — registrar escolhas com racional, owner, status, source artifacts, priorities/goals, visibility e provenance
- [ ] **Operating Architecture Kernel** — modelar camadas multi-area: source, artifact/event, graph, goal/cadence, workflow orchestration, agent runtime, governance, context/retrieval, writeback, audit e UI. Parcial: campos multi-area e gates/SLA/provenance existem no kernel Slice 1.
- [x] **Goal/Cadence Layer** — criar metas, milestones, metricas, due dates, review cadence e SLA status para priorities, work items, workflow runs e guidance
- [x] **Evidence Inbox v0** — tela/API para revisar artifacts, ligar a prioridades e marcar pendencias
- [x] **Strategy Map v0** — tela/API para visualizar prioridades, evidencias, decisoes, work items e gaps
- [ ] **AIOS Adoption Dashboard v0** — mostrar quais projetos/frentes estao em closed loop, quais work items estao sem prioridade/meta e quais gates estao pendentes
- [x] **Work Management Layer v0** — criar `WorkItem` canonico com `external_provider`, `external_id`, `external_url`, status canonico, owner, labels e links
- [x] **GitHub Issues ou WorkItem nativo espelhavel** — primeira superficie humana para o Development Blueprint interno; Jira/Linear entram depois como adapters
- [x] **Workflow Blueprint Engine** — modelar etapas, gates, owners, artifacts esperados, rollback e escalation por area
- [x] **Development Blueprint v0** — `ticket -> triagem -> plano -> execucao -> revisao -> plano de testes -> testes -> QA visual -> security QA -> deploy gate -> deploy + monitoramento -> fechamento -> documentacao oficial`
- [x] **Workflow Run Tracker** — executar um run real, registrar current step, gate status, evidencia, owner e failures
- [x] **Drift/Alignment v0** — classificar artifacts e work items como aligned, weak, drift, contradiction ou unknown contra prioridades
- [x] **Guidance Engine v0** — gerar proxima acao para humano/agente/sistema com status e feedback
- [x] **Guidance feedback/update v0** — aceitar, concluir ou ignorar `GuidanceItem` via API/UI/MCP com nota e timestamp de feedback
- [x] **Agent Context Generator v0** — transformar conhecimento aprovado em specs, prompts, playbooks, constraints ou briefing executavel para agentes
- [x] **AutoImprove UI/API v0** — normalizar signal -> hypothesis -> patch/proposal -> validation -> impact review -> promotion. Implementado como proposal/review interno sem auto-apply/promote externo.
- [x] **Connector manual/local docs v0** — ingerir `corp/aios/`, `corp/docs/action/`, `corp/docs/estrategia/` e artifacts locais com o mesmo envelope dos conectores futuros
- [ ] **Slack ingestao v0** — implementar read-only para canais/threads selecionados ou importer manual com envelope final equivalente
- [x] **MCP tools Company Brain** — expor create/read de artifacts, decisions, agent contexts, improvement proposals, work items, workflow runs, guidance e signals para agentes. Implementado para summary/source/artifact/decision/signal/alignment finding/guidance/agent context/improvement proposal/work item/workflow run/watcher.
- [ ] **Source health** — mostrar ultima ingestao, erros, volume e freshness por fonte
- [ ] **Boundary Juntos em Sala** — manter self-improving de escolas fora do core; promover aprendizados apenas como artifacts/signals/proposals com gates
- [ ] **Demo Felhen v0.1** — demonstrar estrategia -> evidencia -> drift/guidance -> workflow run -> learning usando dogfood interno

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
- [x] **PWA + Web Push** — PWA instalavel (manifest, SW, icones 192/512/maskable), Web Push com VAPID + lib `web-push`, tabela `push_subscriptions` com UNIQUE(endpoint) + upsert, triggers em job failure e `POST /api/hitl`, cleanup auto de subs 404/410. Detector in-tab desligado quando push ativo (evita duplicação). Cloudflare Access bypass para `/sw.js`, `/manifest.json`, `/icons`. iOS 16.4+ suportado via "Add to Home Screen"
- [x] **Auth em endpoints do daemon** — `ai.felhen.ai` (frontend) e `api.felhen.ai` (daemon) sob a mesma CF Access application, mesmo apex = cookie apex-scoped compartilhado sem CORS cross-origin. Daemon valida JWT via `jose.createRemoteJWKSet` (RS256, iss, aud, clockTolerance 30s). Três policies: email allow (browser) + service token allow (MCP server) + bypass separado para `/api/health`. Loopback bypass distingue cloudflared de debug real via headers `CF-*`. SOFT_MODE desligado após validação. Ver `docs/auth-rollout.md`
- [x] **Docker Compose** — `Dockerfile` multi-stage (builder + runtime non-root aios user), `docker-compose.yml` com volumes para DB/logs/projetos/.claude. Build validado + container rodou health endpoint OK
- [x] **Open source prep** — `README.md` com quickstart Docker e dev, `LICENSE` MIT, `CONTRIBUTING.md` com estilo de commit e setup de dev

## Validacao pendente (requer interacao humana)

- [ ] **PWA install + push no iPhone** — testar Safari → "Add to Home Screen", abrir app instalado, aceitar push permission, disparar `POST /api/push/test` e verificar chegada com app fechado (iOS 16.4+ obrigatorio)
- [ ] **PWA install no desktop (Mac Chrome)** — install prompt + notificacao persistente com tab fechada

## Criterio de Sucesso

Antonio usar ai.felhen.ai diariamente por 30 dias consecutivos.
Se sim → continuar evoluindo. Se nao → arquivar.
