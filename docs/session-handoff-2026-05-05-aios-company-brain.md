# Session Handoff - AIOS Company Brain Implementation

Registro local: 2026-05-05 22:11 BRT.

Este handoff existe para a proxima sessao comecar implementacao sem reabrir a estrategia do zero.

## Estado do repo

- Repo: `/Users/antoniomello/felhencloud/projetos/felhen/aios-runtime`
- Branch: `main`
- Commit de referencia documental anterior a esta atualizacao: `6331b3d docs: add aios company brain implementation handoff`
- Estado remoto observado antes desta atualizacao: `main` local estava `ahead 2` de `origin/main`
- Mudancas Company Brain ate aqui sao documentais. Ainda nao existe implementacao de schema/API/UI Company Brain.

Antes de implementar, rode:

```bash
git status -sb
git log -1 --oneline
```

Nao assumir que `eca6ff7` ja foi pushado.

## Fontes de verdade

Ler nesta ordem:

1. `CLAUDE.md`
2. `docs/company-brain-direction.md`
3. `docs/backlog.md`
4. `../../../../corp/docs/action/aios-product-roadmap.md`
5. `../../../../corp/docs/action/aios-yc-thesis-five-week-build-plan-2026-05-05.md`
6. `../../../../corp/docs/estrategia/felhen-autoimprove-core.md`

Observacao: os docs estrategicos AIOS no repo `corp` foram consolidados no commit `41b14d2 docs: consolidate aios yc thesis roadmap`. Mesmo assim, verificar `git -C ../../../../corp status -sb` antes de assumir que nao houve mudanca posterior.

Atualizacao: em 2026-05-05 23h BRT, o `corp` foi lido novamente em `8dc6298 docs: add aios operating watchers`. Esse commit adiciona o **Watcher / Operating Loop Layer** como camada P0 entre Source e Artifact/Event. O proximo corte do `aios-runtime` deve seguir esse direcional antes de Drift/Guidance completo.

## Decisoes travadas

- O produto AIOS / Company Brain vive neste repo, `aios-runtime`.
- `corp/aios/` continua sendo dataset upstream de cultura, julgamento, qualidade, tom e governanca. Nao e o produto.
- Verticais como ERP, Juntos em Sala, PulsoOnline, saude mental/NR-1, RP e TravelCRM continuam rodando. Elas viram fontes de evidencia, signals, work items, drift e promotion candidates.
- Juntos em Sala segue separado como vertical de escolas. Nao trazer schema escolar para o core deste repo.
- O core deve falar objetos horizontais: `Source`, `Artifact`, `StrategicPriority`, `Decision`, `Signal`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `AlignmentFinding`, `GuidanceItem`, `AgentContext`, `ImprovementProposal`.
- Tickets sao `WorkItem` canonico. GitHub Issues e a primeira superficie humana para dogfood interno. Jira/Linear entram como adapters depois.
- O primeiro Workflow Blueprint e desenvolvimento ticket-to-production.
- O primeiro dogfood externo real e o refactor do ERP em `projetos/erp-desmanches`.
- QMD, embeddings, search e memory sao Context/Retrieval Layer. Nao sao o core operacional.
- O core operacional multi-area precisa modelar sources, artifacts/events, graph, goals/cadence, workflow orchestration, agent runtime, governance, context, writeback, observability/audit e UI.
- Metas e prazos precisam ser objetos operacionais, nao texto solto em roadmap. Prioridades, goals, milestones, work items, workflow runs e guidance devem carregar owner, due date/cadence e status.
- A Felhen deve operar pelo AIOS enquanto constroi o produto: projetos relevantes precisam registrar sources, work items, artifacts, workflow runs, gates, signals, guidance e improvement proposals.

## Estado atual da plataforma

O runtime atual ja tem:

- daemon Hono + SQLite/better-sqlite3 + Drizzle;
- frontend Next.js static export;
- console de agentes;
- terminal PTY;
- schedules/systemd timers;
- jobs/background runs;
- HITL;
- MCP server;
- Cloudflare Access auth;
- push notifications;
- cost tracking;
- workspaces auto-descobertos por `CLAUDE.md`.

Schema atual em `packages/daemon/src/db/schema.ts`:

- `agents`
- `jobs`
- `cost_entries`
- `schedules`
- `sessions`
- `session_messages`
- `push_subscriptions`
- `hitl_requests`

Rotas REST atuais em `packages/daemon/src/routes/`:

- `agents`
- `workspaces`
- `jobs`
- `sessions`
- `costs`
- `hitl`
- `health`
- `terminal`
- `schedules`
- `briefing`
- `push`

Paginas atuais em `packages/web/src/app/`:

- `/`
- `/agents`
- `/console`
- `/costs`
- `/inbox`
- `/jobs`
- `/schedules`
- `/settings`
- `/terminal`

MCP atual em `packages/mcp-server/src/index.ts` expoe ferramentas para briefing, workspaces, sessions, schedules e jobs. Ainda nao expoe Company Brain.

## Gap atual

Atualizacao em 2026-05-05 23h BRT: Slice 1 do Company Brain foundation foi implementado neste repo como primeira unidade versionada do kernel operacional. O runtime atual agora tem tipos, schema, API, UI e MCP minimos para o primeiro kernel operacional.

Agora existem:

- tabelas `cb_sources`, `cb_artifacts`, `cb_strategic_priorities`, `cb_goals`, `cb_milestones`, `cb_work_items`, `cb_workflow_blueprints`, `cb_workflow_runs`, `cb_workflow_steps` e `cb_artifact_links`;
- migration inline idempotente em `packages/daemon/src/db/client.ts`;
- seed idempotente do `development-blueprint-v0`;
- rota `/api/company-brain/*` com summary e criacao/listagem de sources, artifacts, priorities, goals, milestones, work items, workflow blueprints/runs e artifact links;
- UI `/company-brain` com Strategy Map, Evidence Inbox, Unlinked Work e Workflow Runs;
- MCP tools `get_company_brain_summary`, `create_company_brain_source`, `create_company_brain_artifact`, `create_company_brain_work_item` e `create_company_brain_workflow_run`.
- Watcher / Operating Loop Layer v0 com `Watcher`, `WatcherRun`, seed `watcher-github-issues-manual-v0`, summary/API/UI/MCP e run manual que cria artifact/work item interno com provenance.
- Closed Loop v0 com `Signal`, `AlignmentFinding` e `GuidanceItem`, incluindo feedback/update interno.
- `Decision`, `AgentContext` e `ImprovementProposal` v0.
- Importers/adapters read-only para local docs e GitHub Issues, ambos com provenance e sem writeback externo.

Ainda nao existem:

- conector Slack com envelope comum;
- source health dedicado com drill-down por fonte/freshness/volume.

Parciais que precisam evoluir:

- Strategy layer ainda nao tem tradeoffs completos; `Decision v0` ja existe.
- Operating Architecture Kernel tem campos multi-area, visibility, provenance, risk/gate/SLA, mas ainda nao tem camada de governance/writeback/audit completa.
- MCP cobre sources/artifacts/local docs importer/GitHub Issues sync adapter/decisions/signals/alignment findings/guidance/agent contexts/improvement proposals/work items/runs/watchers; writeback externo segue fora do core v0.

## Slice Watcher / Operating Loop Layer

Objetivo: transformar o Company Brain de base consultavel em loop operacional que observa fontes e workflows sem depender de uma sessao interativa aberta.

Fonte de produto: `corp/docs/action/aios-product-roadmap.md`, secao `Watcher / Operating Loop Layer`, e `corp/docs/action/aios-yc-thesis-five-week-build-plan-2026-05-05.md`, gaps/entregaveis de Watcher.

Status em 2026-05-06: implementado no corte v0. O watcher manual foi mantido e passou a alimentar o closed loop minimo via `Signal`, `AlignmentFinding` e `GuidanceItem`.

Implementar no menor corte util:

1. Tipos compartilhados `Watcher` e `WatcherRun` em `packages/shared/src/types.ts`. Implementado.
2. Tabelas `cb_watchers` e `cb_watcher_runs` em `packages/daemon/src/db/schema.ts` e migration inline idempotente em `packages/daemon/src/db/client.ts`. Implementado.
3. Campos minimos:
   - `Watcher`: `id`, `title`, `description`, `source_ids`, `trigger_type`, `schedule`, `event_filter`, `scope_query`, `owner`, `owner_type`, `target_workflow_blueprint_id`, `risk_class`, `action_policy`, `status`, `last_run_at`, `next_run_at`, `failure_policy`, `output_policy`, `visibility`.
   - `WatcherRun`: `id`, `watcher_id`, `started_at`, `finished_at`, `status`, `artifacts_created`, `signals_created`, `alignment_findings_created`, `work_items_created`, `guidance_created`, `error_summary`, `provenance`.
4. Rotas REST em `/api/company-brain/watchers` e `/api/company-brain/watcher-runs`. Implementado.
5. Expor status basico de watchers no `/api/company-brain/summary` e na UI `/company-brain`, preferencialmente como Source Health / Operating Loops. Implementado.
6. Criar watcher manual/simulado para PR/CI ou GitHub Issues. Implementado com seed `watcher-github-issues-manual-v0` e run manual por API/MCP/UI.
7. Garantir que o watcher consiga gerar ao menos `Artifact` e `WorkItem` com `provenance`, `risk_class` e `action_policy`. Implementado para artifact/work item no Watcher v0; expandido no Closed Loop v0 para signal/finding/guidance.
8. Nao implementar writeback externo automatico neste corte. Cumprido: run manual registra no AIOS; nao comenta/abre issue externa.

Aceite do Watcher v0:

- Build passa: `npx turbo build`.
- Schema e migrations continuam idempotentes.
- Existe pelo menos um `Watcher` cadastrado para PR/CI ou GitHub Issues: seed `watcher-github-issues-manual-v0` + dogfood `AIOS GitHub Issues manual watcher`.
- Existe pelo menos um `WatcherRun` manual/simulado com `status`, timestamps, contadores de outputs e provenance: validado via API local.
- Company Brain summary mostra watchers ativos, ultimo run e erro/freshness basico: `watcherCount=2`, `activeWatcherCount=2`, `watcherRunCount=1`, `watcherErrorCount=0` no dogfood.
- Um watcher gera artifact/work item real no envelope comum, com source/provenance/risk/action policy: validado com `crewdock#5`.
- Nenhum writeback externo acontece sem policy explicita.

Dogfood local Watcher v0 validado em DB temporario `/tmp/aios-runtime-watcher-dogfood.sqlite`, daemon em `127.0.0.1:43102`:

- Source real `AIOS Runtime GitHub Issues`: `IqwpxEBKsKAw`, repo `antonio-mello-ai/crewdock`.
- Watcher `AIOS GitHub Issues manual watcher`: `1IhRM9qC8sz0`.
- WatcherRun manual: `FNR3KFJW4om0`.
- Artifact criado: `QpbIBVz38wOo`, raw_ref `https://github.com/antonio-mello-ai/crewdock/issues/5`.
- WorkItem interno criado: `cB-i0XBGvuoq`.
- ArtifactLink: artifact -> work_item com relationship `created_from_watcher`.
- Source Health atualizado para `healthy`, `lastSyncAt=1778034446868`, `syncError=null`.
- Run provenance incluiu `createdFrom=watcher:1IhRM9qC8sz0:run`, `action_policy=create_work_items`, `risk_class=B`, `artifactId=QpbIBVz38wOo`.

## Slice Closed Loop v0

Objetivo: fechar o loop minimo dentro do Company Brain sem writeback externo automatico.

Status em 2026-05-06: implementado no menor corte util. O watcher manual existente agora consegue gerar a cadeia `WatcherRun -> Artifact -> Signal -> AlignmentFinding -> GuidanceItem`, mantendo WorkItem/WorkflowRun como links internos e preservando provenance, action policy, risk class, visibility e area.

Implementado:

1. Tipos compartilhados `Signal`, `AlignmentFinding`, `GuidanceItem` e requests correspondentes em `packages/shared/src/types.ts`.
2. Tabelas `cb_signals`, `cb_alignment_findings`, `cb_guidance_items` e coluna `alignment_findings_created` em `cb_watcher_runs`, com migration incremental idempotente.
3. Rotas REST:
   - `GET/POST /api/company-brain/signals`
   - `GET/POST /api/company-brain/alignment-findings`
   - `GET/POST /api/company-brain/guidance-items`
4. Watcher manual gera automaticamente:
   - `Artifact` watcher observation;
   - `Signal` v0 no envelope AutoImprove Core (`source`, `scope`, `entity_type`, `entity_id`, `timestamp`, `summary`, `raw_ref`, `severity`, `confidence`, `tags`);
   - `AlignmentFinding` classificado como `aligned`, `weak` ou `unknown` contra priority/goal v0;
   - `GuidanceItem` com `status` e `feedback_status`;
   - links em `artifact_links` e arrays de output no `WatcherRun`.
5. UI `/company-brain` mostra Signals, Alignment Findings, Guidance Queue e Operating Loops com contadores completos.
6. MCP expõe create/read via summary e ferramentas para signal/alignment/guidance, alem de `run_company_brain_watcher` com campos de priority/goal/severity/envelope.
7. Nenhum writeback externo automatico foi implementado.

Dogfood local Closed Loop v0 validado em DB temporario `/tmp/aios-runtime-loop-dogfood.sqlite`, daemon em `127.0.0.1:43103`:

- Source real `AIOS Runtime GitHub Issues`: `WVhuCXq0dh8H`, repo `antonio-mello-ai/crewdock`.
- Priority `AIOS closed loop minimum kernel`: `fxsko_x6_amN`.
- Goal `Close Watcher/Signal/Guidance loop v0`: `7lyDCAcUwPI7`.
- WorkItem real ligado a GitHub Issue `crewdock#5`: `NSKawlK3KQgg`.
- WorkflowRun no `development-blueprint-v0`: `cmCLD7uoHRri`.
- WatcherRun manual: `ipdvD_Ig1JcN`.
- Artifact criado: `3rzeoaH0ny8Y`, raw_ref `https://github.com/antonio-mello-ai/crewdock/issues/5`.
- Signal criado: `A09cnKqTQTgV`, envelope `source=qa`, `scope=core`, `entityType=job`, `severity=warn`.
- AlignmentFinding criado: `pLArniL1acc_`, classification `aligned`, com priority/goal/work item/signal/artifact linkados.
- GuidanceItem criado: `eiM1Plq0ONk8`, `status=open`, `feedbackStatus=pending`, audience `agent`.
- Run outputs: `artifacts=1`, `signals=1`, `findings=1`, `workItems=1`, `guidance=1`, `workflowRunsLinked=1`.
- Summary retornou `signalCount=1`, `alignmentFindingCount=1`, `guidanceItemCount=1`, `openGuidanceCount=1`, `unlinkedWorkItemCount=0`, `watcherErrorCount=0`.

Proximos cortes recomendados:

- Melhorar Drift/Alignment alem da heuristica v0, incluindo `drift` e `contradiction` a partir de regras de strategy/decision.
- Adicionar adapters reais.
- Depois disso, avaliar adapters/read-only reais e writeback gated, sem auto-writeback por default.

## Slice Guidance Feedback v0

Objetivo: permitir que a guidance gerada pelo closed loop receba resposta humana/agente sem writeback externo automatico.

Status em 2026-05-06: implementado.

Implementado:

1. Campos `feedback_note` e `feedback_at` em `cb_guidance_items`, com migration incremental idempotente.
2. Tipo `UpdateGuidanceItemRequest` em `packages/shared/src/types.ts`.
3. Endpoint `PUT /api/company-brain/guidance-items/:id` para atualizar `status`, `feedback_status`, `feedback_note`, `action`, `due_at`, `severity` e `audience`.
4. UI `/company-brain` com botoes na Guidance Queue para `Accept`, `Done` e `Ignore`.
5. MCP tool `update_company_brain_guidance_item`.
6. Nenhum writeback externo automatico.

Dogfood local Guidance Feedback v0 validado em DB temporario `/tmp/aios-runtime-guidance-feedback-dogfood.sqlite`, daemon em `127.0.0.1:43104`:

- Guidance gerada por watcher: `qkMKzA3y8Pk6`, inicial `status=open`, `feedbackStatus=pending`.
- Update via API: `status=accepted`, `feedbackStatus=accepted`, `feedbackNote="Dogfood accepted via Guidance feedback/update API."`.
- `feedbackAt` foi preenchido.
- Summary apos update: `guidanceItemCount=1`, `openGuidanceCount=0`, `signalCount=1`, `alignmentFindingCount=1`, `watcherErrorCount=0`.

Proximos cortes recomendados:

- Source Health hardening v0.
- Slack ingestao read-only v0.

## Slice Decision v0

Objetivo: adicionar `Decision` como objeto horizontal do Company Brain, registrando escolhas com racional e fonte rastreavel.

Status em 2026-05-06: implementado.

Implementado:

1. Tipo `Decision` e `CreateDecisionRequest` em `packages/shared/src/types.ts`.
2. Tabela `cb_decisions` com `title`, `summary`, `rationale`, `area`, `owner`, `owner_type`, `status`, `decided_at`, `source_artifact_ids`, `priority_ids`, `goal_ids`, `visibility`, `provenance`, timestamps e indices.
3. Rotas `GET/POST /api/company-brain/decisions`.
4. `summary` inclui `decisions`, `decisionCount` e `activeDecisionCount`.
5. Criacao de decision valida source artifacts/priorities/goals e cria `ArtifactLink` `source_for_decision`.
6. UI `/company-brain` tem formulario de Decision, metrica de Decisions, contagem no Strategy Map e painel Decisions.
7. MCP tool `create_company_brain_decision`.
8. Nenhum writeback externo automatico.

Dogfood local Decision v0 validado em DB temporario `/tmp/aios-runtime-decision-dogfood.sqlite`, daemon em `127.0.0.1:43105`:

- Source `AIOS runtime handoff docs`: `_ATp_xmuln_2`.
- Artifact `Guidance feedback handoff evidence`: `NyJiC8HImHt3`.
- Priority `AIOS operating safety and provenance`: `nDDpdVozNcuR`.
- Goal `Decision v0 captures rationale and source links`: `2VGkNywbqsei`.
- Decision `External writeback requires accepted guidance feedback`: `mLics6GXc_ZT`, `status=accepted`.
- Decision linkou `sourceArtifactIds=[NyJiC8HImHt3]`, `priorityIds=[nDDpdVozNcuR]`, `goalIds=[2VGkNywbqsei]`.
- ArtifactLink criado: `targetType=decision`, `relationship=source_for_decision`.
- Summary retornou `decisionCount=1`, `activeDecisionCount=1`.

Proximos cortes recomendados:

- `ImprovementProposal v0`.
- Source Health hardening v0.
- Slack ingestao read-only v0.

## Slice AgentContext v0

Objetivo: gerar contexto executavel para agentes a partir de conhecimento aprovado no Company Brain, sem iniciar execucao automaticamente.

Status em 2026-05-06: implementado.

Implementado:

1. Tipos `AgentContext`, `CreateAgentContextRequest` e `GenerateAgentContextRequest` em `packages/shared/src/types.ts`.
2. Tabela `cb_agent_contexts` com `target_agent`, `context_type`, `source_knowledge_ids`, source IDs por objeto, `content`, `content_format`, `status`, `validation_status`, `visibility`, `provenance` e timestamps.
3. Rotas:
   - `GET/POST /api/company-brain/agent-contexts`
   - `POST /api/company-brain/agent-contexts/generate`
4. Gerador deterministico de markdown com priorities, goals, decisions, guidance, work items, artifacts e constraints operacionais.
5. `summary` inclui `agentContexts`, `agentContextCount` e `readyAgentContextCount`.
6. UI `/company-brain` tem formulario de geracao, metrica de contexts e painel Agent Contexts.
7. MCP tools `create_company_brain_agent_context` e `generate_company_brain_agent_context`.
8. Nenhuma execucao de agente e nenhum writeback externo automatico.

Dogfood local AgentContext v0 validado em DB temporario `/tmp/aios-runtime-agent-context-dogfood.sqlite`, daemon em `127.0.0.1:43106`:

- AgentContext gerado: `wqm706bSsXME`.
- `targetAgent=full-stack-dev`, `contextType=briefing`, `status=ready`, `validationStatus=needs_review`.
- Source knowledge IDs tipados:
  - `artifact:gG4cFBpTv4WE`
  - `decision:kNwHhuO0u2CC`
  - `guidance:lPuruawM_RIH`
  - `priority:h4jTuWMTosTz`
  - `goal:4qfZkPD4_t4J`
- Conteudo gerado incluiu constraint de nao fazer writeback externo e a decision fonte.
- Summary retornou `agentContextCount=1`, `readyAgentContextCount=1`, `decisionCount=1`, `guidanceItemCount=1`.

Proximos cortes recomendados:

- Importer local docs/corp.
- Source Health hardening v0.
- Slack ingestao read-only v0.

## Slice ImprovementProposal v0

Objetivo: fechar o primeiro loop AutoImprove interno, transformando signals/guidance/context em propostas revisaveis sem auto-apply.

Status em 2026-05-06: implementado.

Implementado:

1. Tipos `ImprovementProposal`, `CreateImprovementProposalRequest` e `UpdateImprovementProposalRequest` em `packages/shared/src/types.ts`.
2. Tabela `cb_improvement_proposals` com `signal_ids`, `alignment_finding_ids`, `guidance_item_ids`, `agent_context_ids`, `source_artifact_ids`, `work_item_ids`, `priority_ids`, `goal_ids`, `hypothesis`, `change_class`, `patch_ref`, `validation_plan`, `impact_review`, `status`, `promotion_status`, visibility/provenance e timestamps.
3. Rotas:
   - `GET/POST /api/company-brain/improvement-proposals`
   - `PUT /api/company-brain/improvement-proposals/:id`
4. `summary` inclui `improvementProposals`, `improvementProposalCount` e `promotionCandidateCount`.
5. UI `/company-brain` tem formulario de Improvement Proposal, metrica de Proposals, painel e acoes internas `Candidate`/`Reject`.
6. MCP tools `create_improvement_proposal` e `review_improvement_proposal`.
7. Nenhum auto-apply e nenhum promote/writeback externo.

Dogfood local ImprovementProposal v0 validado em DB temporario `/tmp/aios-runtime-improvement-dogfood.sqlite`, daemon em `127.0.0.1:43107`:

- Signal real gerado por watcher: `92DBNa4QUPuS`.
- Guidance gerado por watcher: `K-vaZVKTdLXY`.
- AgentContext gerado: `7odXqQj2cfAi`.
- ImprovementProposal criado: `rQWfvX7aCJz5`, `status=proposed`, `promotionStatus=not_ready`, `changeClass=B`.
- Review interno via API: `status=validated`, `promotionStatus=candidate`, `impactReview="Dogfood validated proposal lifecycle without auto-apply or external promotion."`.
- Summary retornou `improvementProposalCount=1`, `promotionCandidateCount=1`, `signalCount=1`, `agentContextCount=1`, `watcherErrorCount=0`.

Proximos cortes recomendados:

- Source Health hardening v0.
- Slack ingestao read-only v0.

## Slice Local Docs Importer v0

Objetivo: ingerir markdown/text local no envelope comum do Company Brain, como base para extractors futuros de strategy/decision/signals.

Status em 2026-05-06: implementado.

Implementado:

1. Tipos `ImportLocalDocsRequest` e `ImportLocalDocsResponse` em `packages/shared/src/types.ts`.
2. Rota `POST /api/company-brain/importers/local-docs`.
3. Importer read-only restrito a raizes permitidas (`AIOS_LOCAL_DOC_IMPORT_ROOTS`, `config.projectsDir`, `process.cwd()` e raiz do workspace).
4. Suporte a `.md`, `.mdx` e `.txt`.
5. Cria ou reutiliza `Source` `local_doc`.
6. Cria `Artifact` com `raw_ref`, `content_ref`, hash de conteudo, summary simples, metadata de path/tamanho/mtime e provenance `createdFrom=importer:local_docs`.
7. Atualiza source health/freshness.
8. MCP tool `import_company_brain_local_docs`.
9. Nenhum writeback externo.

Dogfood local Local Docs Importer v0 validado em DB temporario `/tmp/aios-runtime-local-docs-dogfood.sqlite`, daemon em `127.0.0.1:43108`, com `AIOS_LOCAL_DOC_IMPORT_ROOTS=/Users/antoniomello/felhencloud`:

- Source criado: `sJlpyLSm0mNv`, `name=Corp AIOS roadmap docs`, `sourceType=local_doc`, `area=strategy`.
- Artifact `aios-product-roadmap`: `2j1DT7C79SkF`, hash prefix `71a1b204017c`, raw_ref `/Users/antoniomello/felhencloud/corp/docs/action/aios-product-roadmap.md`.
- Artifact `felhen-autoimprove-core`: `mMwjR1x8vZWf`, hash prefix `83c387230ee4`, raw_ref `/Users/antoniomello/felhencloud/corp/docs/estrategia/felhen-autoimprove-core.md`.
- Ambos com provenance `createdFrom=importer:local_docs`.
- Summary retornou `sourceCount=1`, `artifactCount=2`.

## Slice GitHub Issues Sync Adapter v0

Objetivo: substituir o watcher manual/simulado como unica entrada de issues por um adapter read-only real que normaliza GitHub Issues no envelope operacional do Company Brain, sem mutar GitHub.

Status em 2026-05-06: implementado.

Implementado:

1. Tipos `SyncGitHubIssuesRequest` e `SyncGitHubIssuesResponse` em `packages/shared/src/types.ts`.
2. Rota `POST /api/company-brain/adapters/github/issues/sync`.
3. Fetch real via GitHub REST API, com `GITHUB_TOKEN` opcional no daemon para repos privados/limites maiores.
4. Cria ou reutiliza `Source` `github_issue` por repo.
5. Cria `Artifact` por issue com `artifactType=github_issue`, `raw_ref`, `content_ref`, hash estavel, labels/datas em metadata e provenance `createdFrom=adapter:github_issues`.
6. Cria `WorkItem` canonico opcional por issue com `external_provider=github`, `external_id=<owner/repo>#<number>`, status canonico, labels, source/artifact link e provenance `createdFrom=adapter:github_issues:work_item`.
7. Dedupe por `raw_ref` de artifact e por `external_provider/external_id` de work item.
8. Atualiza source health/freshness.
9. UI `/company-brain` tem formulario manual `GitHub sync` para repo/state/limit/links.
10. MCP tool `sync_company_brain_github_issues`.
11. Nenhum writeback externo: nao abre issue, nao comenta, nao fecha, nao altera labels.

Dogfood local GitHub Issues Sync Adapter v0 validado em DB temporario `/tmp/aios-runtime-github-issues-dogfood.sqlite`, daemon em `127.0.0.1:43109`, usando `GITHUB_TOKEN="$(gh auth token)"` somente no ambiente do daemon:

- Repo sincronizado: `antonio-mello-ai/crewdock`, `state=all`, `limit=5`.
- Source criado: `0y03DE8QZdtn`, `name=CrewDock GitHub Issues read-only sync`, `sourceType=github_issue`, `healthStatus=healthy`.
- Issues vistas: `5`.
- Artifacts criados: `5`, incluindo `KGexPA-RtWkM` para `https://github.com/antonio-mello-ai/crewdock/issues/24`.
- WorkItems internos criados: `5`, incluindo `9ux9bJNK7CSE` com `externalId=antonio-mello-ai/crewdock#24`.
- ArtifactLinks criados: `5`, relationship `synced_from_github_issue`.
- Summary retornou `sourceCount=1`, `artifactCount=5`, `workItemCount=5`, `unlinkedWorkItemCount=5`, `watcherErrorCount=0`.
- Segunda sincronizacao do mesmo repo retornou `issuesSeen=5`, `artifactsCreated=0`, `workItemsCreated=0`, validando dedupe.

## Slice Adoption Dashboard v0

Objetivo: dar visibilidade operacional de quais frentes ja estao em closed loop e quais lacunas bloqueiam adocao real do AIOS.

Status em 2026-05-06: implementado.

Implementado:

1. Tipos `AdoptionStage`, `AdoptionGap`, `AdoptionProjectStatus` e `CompanyBrainAdoptionDashboard` em `packages/shared/src/types.ts`.
2. Builder derivado no daemon, sem schema novo, agrupando frentes por `Source`.
3. `GET /api/company-brain/adoption-dashboard`.
4. `/api/company-brain/summary` inclui `adoptionDashboard`.
5. UI `/company-brain` mostra Adoption Dashboard com stage, source health, evidence/work/signal counts e gaps principais.
6. MCP tool `get_company_brain_adoption_dashboard`.
7. Gaps v0: `source_unhealthy`, `source_without_artifacts`, `unlinked_work_item`, `pending_gate`, `sla_risk`, `missing_workflow`, `missing_signal` e `open_guidance`.
8. Nenhum writeback externo.

Dogfood local Adoption Dashboard v0 validado em DB temporario `/tmp/aios-runtime-adoption-dashboard-dogfood.sqlite`, daemon em `127.0.0.1:43110`:

- GitHub sync read-only: `issuesSeen=2`, `artifactsCreated=2`, `workItemsCreated=2`.
- Watcher manual rodou no mesmo source: run `0JqT82jf1BPv`, `signals=1`, `findings=1`, `guidance=1`.
- WorkflowRun criado: `jHKnNAZud2sY`, `gateStatus=pending`, `slaStatus=at_risk`.
- ImprovementProposal criado: `wTpZZxa9mvvX`, `promotionStatus=candidate`.
- Dashboard retornou `projectCount=1`, `closedLoopProjectCount=1`, `improvingProjectCount=1`.
- Dashboard retornou gaps: `unlinkedWorkItemCount=2`, `pendingGateCount=1`, `slaRiskCount=1`, `openGuidanceCount=1`.
- Projeto `Adoption dashboard GitHub sync` apareceu com `stage=improving`, `artifactCount=3`, `workItemCount=3`, `workflowRunCount=1`, `signalCount=1`, `improvementProposalCount=1`.

Proximos cortes recomendados:

- Source Health hardening v0.
- Slack ingestao read-only v0.

## Dogfood ERP

O refactor do ERP esta sendo usado como primeiro dogfood do fluxo AIOS ticket-to-production.

Estado observado no momento deste handoff:

- Repo: `/Users/antoniomello/felhencloud/projetos/erp-desmanches`
- Issue #18 `[ERP-REF-00] Triage de worktree e contrato de execucao`: fechada em 2026-05-06T01:02:25Z.
- Issue #19 `[ERP-REF-01] Baseline de runtime, testes e ambiente local`: fechada em 2026-05-06T01:26:15Z.
- Issue #20 `[ERP-REF-02] Arquitetura base e ownership modular`: fechada em 2026-05-06T01:33:54Z.
- Issue #33 `[ERP-REF-10] OperationalEvent v2 alinhado a CompanyUnit, role efetivo e contrato de eventos`: aberta em 2026-05-06T01:45:27Z e usada como WorkItem linkado no dogfood local.
- Issue #32 `[ERP-REF-09] Marketplace channels: contas, listings e identidades externas`: aberta em 2026-05-06T01:35:58Z e usada como WorkItem real sem priority/goal para validar visibilidade `unlinked`.
- Branch ERP atual observada: `codex/erp-ref-01-runtime-tests`.

Como usar no AIOS:

- GitHub Issues do ERP devem entrar como `WorkItem`.
- Comentarios, PRs, testes e docs do ERP devem entrar como `Artifact`.
- O fluxo ERP-REF deve virar primeiro `WorkflowBlueprint` / `WorkflowRun` real.
- Falhas de teste, bloqueios, security issues e residuals devem virar `Signal`.
- Aprendizados recorrentes devem virar `ImprovementProposal`, nao mudanca automatica de core.

Nao fazer o AIOS depender da implementacao do ERP. O ERP e fonte de dogfood, nao pre-requisito arquitetural do runtime.

Dogfood local validado em DB temporario `/tmp/aios-runtime-company-brain-dogfood.sqlite`, daemon em `127.0.0.1:43101`:

- Source real `ERP GitHub Issues`: `zeK1VXPOAvOq`.
- Priority `Company Brain dogfood: ERP development blueprint`: `xn0zSLoXNx2J`.
- Goal com due date/cadence/SLA: `rnXEfGuu4C_n`.
- Artifact de evidence para ERP issue #33: `lQUSXF8VgYyu`.
- WorkItem linkado a GitHub Issue `erp-desmanches#33`: `M51GCwU4mFg2`.
- WorkflowRun no `development-blueprint-v0`: `s4e6By4NONLR`.
- Steps materializados no run: `13`.
- WorkItem real sem priority/goal para validar `unlinked`: `ctVgz7efVXqm`, externo `erp-desmanches#32`.
- Summary retornou `unlinkedWorkItemCount=1` e `activeWorkflowRunCount=1`.

## Primeiro slice de implementacao recomendado

Objetivo: transformar o runtime de docs + control plane em primeira base consultavel de Company Brain, preservando o runtime atual.

### Slice 1 - Company Brain foundation

Status em 2026-05-05 23h BRT: implementado no corte operacional minimo. O que falta e hardening/adapters reais, nao recriar o slice do zero.

Implementar no menor corte util:

1. Tipos em `packages/shared/src/types.ts`. Implementado.
2. Schema incremental em `packages/daemon/src/db/schema.ts` e `packages/daemon/src/db/client.ts`. Implementado.
3. Rotas basicas em `packages/daemon/src/routes/`. Implementado em `company-brain.ts`.
4. UI minima em `packages/web/src/app/`. Implementado em `/company-brain`.
5. MCP tools minimas em `packages/mcp-server/src/index.ts`. Implementado para summary/source/artifact/work item/workflow run.

Objetos minimos do primeiro corte:

- `Source`
- `Artifact`
- `StrategicPriority`
- `Goal`
- `Milestone`
- `WorkItem`
- `WorkflowBlueprint`
- `WorkflowRun`
- `WorkflowStep` ou gate equivalente
- `ArtifactLink`

Objetos fora do Slice 1 original / pendencias posteriores:

- `Metric`
- `Cadence`
- `Decision` (implementado no Decision v0; extractors reais ficam pendentes)
- `Signal` (implementado no Closed Loop v0; hardening e extractors reais ficam pendentes)
- `AlignmentFinding` (implementado no Closed Loop v0; drift/contradiction mais ricos ficam pendentes)
- `GuidanceItem` (implementado no Closed Loop v0; feedback/update implementado no Guidance Feedback v0)
- `AgentContext` (implementado no AgentContext v0; export/uso por agentes reais fica pendente)
- `ImprovementProposal` (implementado no ImprovementProposal v0; promote/writeback real fica pendente)

Se o diff crescer, deixar extractors/importers reais para cortes posteriores.

### Aceite do Slice 1

- Build passa: `npx turbo build`.
- Runtime atual nao quebra no build.
- Schema e migrations sao idempotentes pelo `CREATE TABLE IF NOT EXISTS` + `INSERT OR IGNORE` do blueprint.
- Pelo menos uma prioridade estrategica pode ser criada/listada: validado via API local.
- Pelo menos uma meta/prazo/cadencia pode ser ligada a uma prioridade ou work item: validado via API local.
- Pelo menos uma fonte pode ser criada/listada: validado via API local.
- Pelo menos um artifact pode ser criado/listado com source/raw_ref/hash/visibility/provenance: validado via API local.
- Pelo menos um `WorkItem` pode apontar para uma GitHub Issue externa: validado com `erp-desmanches#33`.
- O Development Blueprint v0 existe como dado inicial/seed: `development-blueprint-v0`.
- Pelo menos um `WorkflowRun` pode apontar para issue ERP real: validado com issue #33.
- O sistema consegue apontar work item sem prioridade/meta como `unlinked`: validado com issue #32.
- UI mostra Strategy Map, Evidence Inbox, Unlinked Work e Workflow Runs em `/company-brain`.
- MCP consegue listar/criar summary, sources, artifacts, decisions, signals, alignment findings, guidance, agent contexts, improvement proposals, work items, workflow runs e watchers.

## Cuidados tecnicos

- O SQLite atual usa `MIGRATIONS_SQL` inline em `packages/daemon/src/db/client.ts` e migracoes incrementais manuais. Antes de adicionar tabelas, seguir esse padrao ou criar uma evolucao explicita, idempotente e testada.
- Nao remover ou renomear tabelas existentes.
- Preservar Cloudflare Access e loopback behavior.
- Preservar `AIOS_AUTH_DISABLED` somente para dev.
- Nao criar schema escolar ou ERP-specific no core.
- Nao acoplar o core a GitHub. Core fala `WorkItem`; GitHub e adapter/surface.
- Nao criar conector que so ingere dado sem provenance e sem caminho para linking/guidance.
- Nao tratar QMD/retrieval como fonte unica de verdade operacional.
- Nao deixar metas e prazos apenas em markdown quando eles impactam workflow/guidance.

## Prompt sugerido para proxima sessao

```text
Estamos em /Users/antoniomello/felhencloud/projetos/felhen/aios-runtime.

Continue do estado atual sem replanejar do zero. Leia primeiro:
- CLAUDE.md
- docs/session-handoff-2026-05-05-aios-company-brain.md
- docs/company-brain-direction.md
- docs/backlog.md
- ../../../../corp/docs/action/aios-product-roadmap.md

Objetivo da sessao: implementar o proximo slice do Company Brain apos Adoption Dashboard v0, focado em `Source Health hardening v0`, sem recriar o kernel, watchers ou adapters ja entregues.

Antes de editar, confirme git status, commit atual, schema atual, rotas atuais e leia o `corp` atual. Depois implemente um corte pequeno e validavel:
- expor source health dedicado com freshness, volume de artifacts/work items/signals, ultimo sync, ultimo erro e status agregado;
- destacar sources sem artifacts, sources stale/error/unknown e sources sem caminho para work item ou workflow;
- reaproveitar `adoptionDashboard` quando fizer sentido, evitando schema novo sem necessidade;
- manter writeback externo bloqueado sem HITL/action_policy explicita.

Nao mover logica de verticais para o core. ERP e Juntos em Sala entram como fontes/dogfood/adapters, nao como schema do runtime.

Validar com build/testes relevantes e documentar qualquer residual em docs/backlog.md ou nova nota de handoff.
```
