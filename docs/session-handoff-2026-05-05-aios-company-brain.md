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

- conector Slack API real com token/workspace selecionado;
- writeback externo real com policy/HITL e auditoria completa.

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

- Demo Felhen v0.1.
- Slack API adapter real quando houver token/workspace definidos.

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
- Demo Felhen v0.1.
- Slack API adapter real quando houver token/workspace definidos.

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
- Demo Felhen v0.1.
- Slack API adapter real quando houver token/workspace definidos.

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

- Demo Felhen v0.1.
- Slack API adapter real quando houver token/workspace definidos.

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

## Slice Source Health v0

Objetivo: separar saude/freshness de fontes da visao de adocao, dando drill-down operacional por source sem criar schema novo.

Status em 2026-05-06: implementado.

Implementado:

1. Tipos `SourceFreshnessStatus`, `SourceHealthIssueKind`, `SourceHealthSnapshot` e `CompanyBrainSourceHealthReport` em `packages/shared/src/types.ts`.
2. Builder derivado no daemon, sem schema novo.
3. `GET /api/company-brain/source-health`.
4. `/api/company-brain/summary` inclui `sourceHealthReport`.
5. UI `/company-brain` mostra Source Health dedicado com health/freshness, ultimo sync, sync error, artifacts/work/signals/watchers e issue kinds.
6. MCP tool `get_company_brain_source_health`.
7. Issue kinds v0: `sync_error`, `stale`, `never_synced`, `unknown_health`, `no_artifacts`, `no_work_items` e `no_signals`.
8. Nenhum writeback externo.

Dogfood local Source Health v0 validado em DB temporario `/tmp/aios-runtime-source-health-dogfood.sqlite`, daemon em `127.0.0.1:43111`:

- Source sincronizado via GitHub adapter: `zy6YwkURdUV_`, `issuesSeen=1`.
- Source propositalmente vazio: `_kOs9YO8cy_p`.
- Watcher linkado ao source sincronizado: `R23Jv66QDaA-`.
- WatcherRun: `rVuQ3IyGcmSb`.
- Report retornou `sourceCount=2`, `healthyCount=1`, `neverSyncedCount=1`, `sourceWithoutArtifactsCount=1`, `sourceWithoutWorkItemsCount=1`, `sourceWithoutSignalsCount=1`.
- Source `Source Health GitHub sync`: `freshnessStatus=fresh`, `healthStatus=healthy`, `artifactCount=2`, `workItemCount=2`, `signalCount=1`, `watcherCount=1`, `watcherRunCount=1`, `openGuidanceCount=1`, `issueKinds=[]`.
- Source `Uninstrumented source health dogfood`: `freshnessStatus=never_synced`, `healthStatus=unknown`, `artifactCount=0`, `workItemCount=0`, `signalCount=0`, `issueKinds=[never_synced,no_artifacts,no_work_items,no_signals]`.

## Slice Slack Ingestao v0

Objetivo: permitir que conversas/decisoes do Slack entrem como evidencia operacional no Company Brain sem depender de token real nem mutar Slack.

Status em 2026-05-06: implementado como importer manual/read-only.

Implementado:

1. Tipos `SlackMessageImportItem`, `ImportSlackMessagesRequest` e `ImportSlackMessagesResponse` em `packages/shared/src/types.ts`.
2. Rota `POST /api/company-brain/importers/slack-messages`.
3. Cria ou reutiliza `Source` `slack` por `workspaceName`/`sourceName`.
4. Cria `Artifact` `slack_message` com `raw_ref`, `content_ref`, hash, channel/user/ts/thread/permalink em metadata e provenance `createdFrom=importer:slack_messages`.
5. Dedupe por `raw_ref`.
6. Atualiza source health/freshness.
7. UI `/company-brain` tem formulario manual `Slack import`.
8. MCP tool `import_company_brain_slack_messages`.
9. Nenhum writeback externo: nao posta, nao responde, nao altera mensagens/canais.

Dogfood local Slack Ingestao v0 validado em DB temporario `/tmp/aios-runtime-slack-import-dogfood.sqlite`, daemon em `127.0.0.1:43112`:

- Source criado/reutilizado: `Jct2OciGwvfJ`, `sourceType=slack`, `healthStatus=healthy`.
- Artifact criado: `aOPTDIzZ8K08`, `artifactType=slack_message`, raw_ref `https://felhen.slack.com/archives/C123/p1778070000000000`.
- Provenance: `createdFrom=importer:slack_messages`, notes `read_only=true; mode=manual`.
- Metadata incluiu `workspaceName=felhen`, `channelId=C123`, `channelName=aios-ops`, `user=antonio`, `ts=1778070000.000000`, `threadTs=1778070000.000000`.
- Segunda importacao com o mesmo body reutilizou a mesma Source e retornou `artifactsCreated=0`.
- Summary retornou `sourceCount=1`, `artifactCount=1`, `sourceTypes=[slack]`.
- Source Health retornou `freshnessStatus=fresh`, `artifactCount=1`, `issueKinds=[no_work_items,no_signals]`.

## Slice Demo Felhen v0.1

Objetivo: criar uma demo interna e reproduzivel que atravesse o loop operacional completo do AIOS sem depender de sistemas externos.

Status em 2026-05-06: implementado.

Implementado:

1. Tipos `RunFelhenDemoRequest` e `RunFelhenDemoResponse` em `packages/shared/src/types.ts`.
2. Rota `POST /api/company-brain/demo/felhen-v0-1`.
3. Runner cria ou reutiliza `Source`, `StrategicPriority`, `Goal`, `Artifact`, `WorkItem`, `WorkflowRun`, `Signal`, `AlignmentFinding`, `GuidanceItem` e `ImprovementProposal`.
4. Runner retorna `adoptionDashboard` e `sourceHealthReport` ja recalculados.
5. UI `/company-brain` tem botao `Run demo` no Adoption Dashboard.
6. MCP tool `run_felhen_demo_v0_1`.
7. Nenhum writeback externo.

Dogfood local Demo Felhen v0.1 validado em DB temporario `/tmp/aios-runtime-felhen-demo-dogfood.sqlite`, daemon em `127.0.0.1:43113`:

- Source: `qdshqDZCkjjM`.
- Priority: `orHMRfMAgktR`.
- Goal: `MZ--Ifjv9uJS`.
- Artifact: `mIiXJt8OmRVA`.
- WorkItem: `EG0L6CV0QXgY`.
- WorkflowRun: `Ej_ashwY9aBW`.
- Signal: `2r0NMJAF4ccu`.
- AlignmentFinding: `7qzqYJjgm7Lm`.
- GuidanceItem: `kHnyBHAD0wqz`.
- ImprovementProposal: `h8RlB5M81_13`.
- Adoption Dashboard retornou `projectCount=1`, `closedLoopProjectCount=1`, `improvingProjectCount=1`, `pendingGateCount=1`, `openGuidanceCount=1`.
- Source Health retornou `sourceCount=1`, `healthyCount=1`, sem stale/error/never synced e sem sources sem artifact/work/signal.
- Segunda execucao reutilizou source, work item, signal e improvement proposal (`sameSource=true`, `sameWorkItem=true`, `sameSignal=true`, `sameProposal=true`).

Proximos cortes recomendados:

- Decision/Signal extractor v0 sobre artifacts reais.
- Hardening de Slack threads/mentions se o dogfood pedir leitura mais profunda.

## Slice Slack API Adapter v0

Objetivo: transformar a ingestao Slack de importer manual para adapter real read-only usando o bot Felhen, sem writeback externo automatico.

Implementado em 2026-05-06:

1. Tipos `SyncSlackChannelRequest` e `SyncSlackChannelResponse` em `packages/shared/src/types.ts`.
2. Rota `POST /api/company-brain/adapters/slack/channel/sync`.
3. Leitura real via `SLACK_BOT_TOKEN` com `auth.test`, `conversations.list`/`conversations.info`, `conversations.history` e permalink quando disponivel.
4. Source `slack` reutilizavel por `slack://workspace/channel`, com metadata `adapter=slack_channel`, `readOnly=true` e `actionPolicy=observe_only`.
5. Artifact `slack_message` com raw_ref/permalink, hash, Slack metadata, provenance `createdFrom=adapter:slack_channel`, `humanReviewStatus=pending` e nota `read_only=true; action_policy=observe_only`.
6. Dedupe por `rawRef`.
7. UI `/company-brain` tem formulario `Slack sync` para canal/limit.
8. MCP tool `sync_company_brain_slack_channel`.

Dogfood local validado em DB temporario `/tmp/aios-runtime-slack-channel-sync-dogfood.sqlite`, daemon em `127.0.0.1:43114`:

- Workspace: `Felhen` (`T09QRU28V1Q`).
- Canal: `#aios-runtime` (`C0B1ZM0JULA`), bot membro.
- Source criado/reutilizado: `-DJOUy_HH5l1`, `sourceType=slack`, `healthStatus=healthy`.
- Primeira sync: `messagesSeen=5`, `artifactsCreated=5`.
- Segunda sync: `messagesSeen=5`, `artifactsCreated=0` por dedupe.
- Artifacts criados com `createdFrom=adapter:slack_channel`, `actionPolicy=observe_only`, `readOnly=true`.
- Summary retornou `sourceCount=1`, `artifactCount=5`, `slackSourceCount=1`, `slackArtifactCount=5`.
- Source Health retornou freshness `fresh`; residuos esperados nesta fase: `no_work_items` e `no_signals`.

Boundary: o Slack App tem escopos amplos para evitar bloqueio operacional, mas o runtime continua sem writeback automatico. Escrita externa deve entrar em corte separado com `action_policy`, HITL/gates e aceite explicito.

## Slice Slack Threads/Incremental Sync v0

Objetivo: evoluir o Slack adapter real de leitura recente para sincronizacao incremental e thread-aware, ainda read-only e sem postar/mutar Slack.

Implementado em 2026-05-06:

1. `SyncSlackChannelRequest` aceita `incremental`, `includeThreads` e `threadLimit`.
2. Sync incremental usa `Source.lastSyncAt` para montar `oldest` quando o request nao fornece cursor manual.
3. `includeThreads=true` busca replies via `conversations.replies` para roots vistos no historico e roots ja conhecidos nos artifacts do source.
4. Replies viram artifacts `slack_message` com `isThreadReply`, `parentTs`, `threadTs`, `replyCount`, `latestReply`, permalink, provenance e `actionPolicy=observe_only`.
5. Source metadata registra `incremental`, `includeThreads`, `threadLimit`, `oldestUsed`, `latestTs`, `lastMessagesSeen`, `lastRepliesSeen` e `syncedAt`.
6. Resposta API/MCP expõe `threadsSeen`, `repliesSeen`, `oldestUsed`, `latestTs`, `incremental` e `includeThreads`.
7. UI `/company-brain` adiciona controles `Incremental`, `Include threads` e `Thread limit` no formulario Slack sync.
8. Nenhum writeback externo automatico foi implementado.

Dogfood real validado em DB temporario `/tmp/aios-runtime-slack-incremental-dogfood.sqlite`, daemon em `127.0.0.1:43121`, canal `#aios-runtime`:

- Primeira sync: `artifactsCreated=5`, `messagesSeen=5`, `threadsSeen=0`, `repliesSeen=0`, `includeThreads=true`, `incremental=true`, `latestTs=1778072936.876349`.
- Source: `d4jbDItryxdm`, `healthStatus=healthy`, metadata `actionPolicy=observe_only`.
- Segunda sync incremental com mesmo source: `artifactsCreated=0`, `messagesSeen=0`, `oldestUsed=1778077098.338`, `latestTs` preservado.

Proximo corte recomendado: GitHub PR/CI watcher real, depois GitHub notifications watcher e somente depois writeback controlado com `action_policy`, `risk_class`, HITL e audit trail.

## Slice GitHub PR/CI Watcher v0

Objetivo: criar watcher real/read-only para PRs e CI, conectando GitHub pull requests/check-runs ao Company Brain sem writeback no GitHub.

Implementado em 2026-05-06:

1. Seed `watcher-github-pr-ci-v0` em `packages/daemon/src/db/client.ts`, com `actionPolicy=observe_only`, `riskClass=B`, `targetWorkflowBlueprintId=development-blueprint-v0` e `outputPolicy=pr_ci_artifacts_and_gap_signals`.
2. Tipos `SyncGitHubPrCiRequest` e `SyncGitHubPrCiResponse` em `packages/shared/src/types.ts`.
3. `POST /api/company-brain/adapters/github/pr-ci/sync` busca PRs reais, commit combined status e check-runs via GitHub API.
4. O route cria/reutiliza Source `github_repo`, cria Artifact `github_pr_ci` por PR/head SHA e registra `WatcherRun` com artifacts/signals.
5. Signals AutoImprove sao criados apenas quando CI/status esta `pending`, `failure` ou `error`, ou quando check-runs falham/ficam pendentes.
6. Source metadata registra repo, watcher, ultimo run, pulls/checks/failing checks e `actionPolicy=observe_only`.
7. UI `/company-brain` adiciona formulario `GitHub PR/CI`; MCP expõe `sync_company_brain_github_pr_ci`.
8. Nenhum writeback GitHub foi implementado.

Dogfood real validado em DB temporario `/tmp/aios-runtime-github-pr-ci-dogfood.sqlite`, daemon em `127.0.0.1:43122`:

- Repo usado: `home-assistant/core` como fallback publico com PR aberto visivel.
- Source: `-dLmM5UfyAGp`.
- WatcherRun: `_XNELEWejtB4`, `watcherId=watcher-github-pr-ci-v0`.
- PRs vistos: `1`.
- Artifacts `github_pr_ci` criados: `1`.
- Signals AutoImprove criados: `1`.
- Checks vistos: `36`; failing checks: `1`.
- Watcher permaneceu `active`.

Proximo corte recomendado: GitHub notifications watcher, depois writeback controlado somente com `action_policy`, `risk_class`, HITL e audit trail.

## Slice GitHub Notifications Watcher v0

Objetivo: observar a inbox autenticada de GitHub notifications como fonte operacional read-only, sem marcar notificacoes como lidas e sem writeback no GitHub.

Implementado em 2026-05-06:

1. Seed `watcher-github-notifications-v0` em `packages/daemon/src/db/client.ts`, com `actionPolicy=observe_only`, `riskClass=B`, `targetWorkflowBlueprintId=development-blueprint-v0` e `outputPolicy=notification_artifacts_and_unread_signals`.
2. Tipos `SyncGitHubNotificationsRequest` e `SyncGitHubNotificationsResponse` em `packages/shared/src/types.ts`.
3. `POST /api/company-brain/adapters/github/notifications/sync` busca `/notifications` via GitHub API autenticada.
4. O route cria/reutiliza Source `GitHub Notifications`, cria Artifact `github_notification` por notification id e registra `WatcherRun`.
5. Signals AutoImprove sao criados para notifications `unread`; severidade `critical` para `mention`/`review_requested`, `warn` para demais reasons.
6. Source metadata registra watcher, ultimo run, notifications vistas, unread vistas e `actionPolicy=observe_only`.
7. UI `/company-brain` adiciona formulario `GitHub notifications`; MCP expõe `sync_company_brain_github_notifications`.
8. Nenhum writeback GitHub foi implementado; o watcher nao marca notificacoes como lidas.

Dogfood real validado em DB temporario `/tmp/aios-runtime-github-notifications-dogfood.sqlite`, daemon em `127.0.0.1:43123`:

- Source: `eJNSWqIRGbTG`.
- WatcherRun: `vL2oZwgzEXhF`, `watcherId=watcher-github-notifications-v0`.
- Notifications vistas: `10`.
- Unread vistas: `10`.
- Artifacts `github_notification` criados: `10`.
- Signals AutoImprove criados: `10`.
- Watcher permaneceu `active`.

Proximo corte recomendado: writeback controlado somente com `action_policy`, `risk_class`, HITL e audit trail. Nao iniciar sem politica explicita de risco/escopo.

## Slice Strategy Tradeoff v0

Objetivo: tornar tradeoffs, constraints, non-goals, riscos, dependencias e principios objetos explicitos do Company Brain, ligados a priority/decision/evidence em vez de texto solto em roadmap.

Implementado em 2026-05-06:

1. Tipos `StrategyTradeoffKind`, `StrategyTradeoffStatus`, `StrategyTradeoff` e `CreateStrategyTradeoffRequest` em `packages/shared/src/types.ts`.
2. Tabela `cb_strategy_tradeoffs` e indices por status, priority e decision.
3. Rota `GET/POST /api/company-brain/strategy-tradeoffs`.
4. Summary inclui `strategyTradeoffs`, `strategyTradeoffCount` e `activeStrategyTradeoffCount`.
5. UI `/company-brain` tem formulario `Tradeoff`, cards no Strategy Map e secao `Strategy Tradeoffs`.
6. MCP tool `create_company_brain_strategy_tradeoff`.
7. Artifact links usam `targetType=strategy_tradeoff` e `relationship=source_for_tradeoff`.

Dogfood local validado em DB temporario `/tmp/aios-runtime-strategy-tradeoff-dogfood.sqlite`, daemon em `127.0.0.1:43115`:

- Source: `fK4svHXnlHJ1`.
- Artifact fonte: `4eepO7K7JJLu`.
- Priority: `bDHA3ECTuhbo`.
- Decision: `aqDY6Z2yaYnl`.
- StrategyTradeoff: `a6cwWG_2H4XN`, `kind=tradeoff`, `status=accepted`.
- Tradeoff ficou ligado a priority, decision e artifact fonte.
- ArtifactLink criado com `relationship=source_for_tradeoff`.
- Summary retornou `strategyTradeoffCount=1` e `activeStrategyTradeoffCount=1`.

Proximo corte recomendado: extractor v0 para transformar artifacts reais de Slack/docs em Decision/Signal candidatos com provenance e review pendente.

## Slice Artifact Insights Extractor v0

Objetivo: permitir que artifacts reais de Slack/docs/issues virem candidatos internos de Decision e Signal sem LLM obrigatório, sem auto-approve e sem writeback externo.

Implementado em 2026-05-06:

1. Tipos `ArtifactInsightExtractionMode`, `ExtractArtifactInsightsRequest` e `ExtractArtifactInsightsResponse` em `packages/shared/src/types.ts`.
2. Rota `POST /api/company-brain/extractors/artifact-insights`.
3. Extractor cria `Decision` candidata com `status=proposed`, source artifact, priority/goal opcionais e provenance `createdFrom=extractor:artifact_insights`.
4. Extractor cria `Signal` candidato no envelope AutoImprove, com `humanReviewStatus=pending` na provenance e tags `candidate`, `artifact_extractor_v0` e artifact type.
5. Dedupe por artifact para decision/signal do extractor v0.
6. UI `/company-brain` tem formulario `Extract` para artifact/mode/severity/priority/work item.
7. MCP tool `extract_company_brain_artifact_insights`.

Dogfood local validado em DB temporario `/tmp/aios-runtime-artifact-extractor-dogfood.sqlite`, daemon em `127.0.0.1:43116`:

- Source: `31poeMQzmT7L`.
- Artifact Slack: `LLgB3qj3oGAr`.
- Priority: `U-5bRD9RSphp`.
- Primeiro extract: Decision `W8-geFz-d6tt`, Signal `OlGGbCGAGc-U`, ambos criados.
- Decision ficou `status=proposed` e review pendente na provenance.
- Signal ficou `source=transcript`, severity `warn`, tags `candidate/artifact_extractor_v0/slack_message` e review pendente.
- Segundo extract reutilizou os mesmos objetos (`decisionCreated=false`, `signalCreated=false`).
- Summary retornou `decisionCount=1`, `signalCount=1` e artifact link `candidate_source_for_decision`.

Proximo corte recomendado: review/update API/UI/MCP para decisions candidates ou extractor de AlignmentFinding/Guidance a partir de signal candidato aprovado.

## Slice Decision Review v0

Objetivo: fechar o loop de candidates do Artifact Insights Extractor para decisions, permitindo aceitar/rejeitar/supersedar sem promover nada automaticamente para writeback externo.

Implementado em 2026-05-06:

1. Tipo `UpdateDecisionRequest` em `packages/shared/src/types.ts`.
2. Rota `PUT /api/company-brain/decisions/:id`.
3. Update valida priority/goal links quando enviados.
4. Ao aceitar, `decidedAt` e setado se ainda estava vazio.
5. Provenance preserva origem do extractor e atualiza `humanReviewStatus` para `approved`, `rejected` ou `pending`, com `reviewNote`.
6. UI `/company-brain` adiciona acoes `Accept`, `Reject` e `Supersede` na lista de decisions.
7. MCP tool `update_company_brain_decision`.

Dogfood local validado em DB temporario `/tmp/aios-runtime-decision-review-dogfood.sqlite`, daemon em `127.0.0.1:43117`:

- Candidate aceito: `D_EM2w3V-XcG`, `status=accepted`, `decidedAt` preenchido, provenance `humanReviewStatus=approved`.
- Candidate rejeitado: `ijO22x-8CcDV`, `status=rejected`, `decidedAt` vazio, provenance `humanReviewStatus=rejected`.
- Notes preservaram `candidate=true; extractor=artifact_insights_v0` e adicionaram a nota de review.
- Summary retornou `decisionCount=2` e `activeDecisionCount=1`.

Proximo corte recomendado: `Signal -> AlignmentFinding/Guidance extractor v0` para transformar signal candidato aprovado/revisado em finding e guidance sem auto-writeback.

## Slice Signal Guidance Extractor v0

Objetivo: transformar um `Signal` existente em `AlignmentFinding` e `GuidanceItem` candidatos, fechando o caminho artifact -> signal -> finding -> guidance sem exigir watcher nem writeback externo.

Implementado em 2026-05-06:

1. Tipos `ExtractSignalGuidanceRequest` e `ExtractSignalGuidanceResponse` em `packages/shared/src/types.ts`.
2. Rota `POST /api/company-brain/extractors/signal-guidance`.
3. Extractor infere priority/goal a partir do request, work item, goal ou metadata do signal gerado pelo Artifact Insights Extractor.
4. `AlignmentFinding` usa classification derivada pela regra atual de alinhamento, severity do signal e provenance `createdFrom=extractor:signal_guidance`.
5. `GuidanceItem` nasce `status=open`, `feedbackStatus=pending`, `generatedFrom.extractor=signal_guidance_v0` e provenance pendente.
6. Dedupe por signal para finding/guidance do extractor v0.
7. UI `/company-brain` adiciona acao `Guidance` em cards de signals.
8. MCP tool `extract_company_brain_signal_guidance`.

Dogfood local validado em DB temporario `/tmp/aios-runtime-signal-guidance-dogfood.sqlite`, daemon em `127.0.0.1:43118`:

- Signal: `9Q-46j8sivgb`.
- AlignmentFinding: `Cu-59XsDFZIG`, `classification=aligned`, review pendente.
- GuidanceItem: `xmoxBYFUvImM`, `status=open`, `feedbackStatus=pending`, review pendente.
- Segundo extract reutilizou os mesmos objetos (`findingCreated=false`, `guidanceCreated=false`).
- Summary retornou `signalCount=1`, `alignmentFindingCount=1`, `guidanceItemCount=1`, `openGuidanceCount=1`.

## Slice AIOS Briefing Watcher v0

Objetivo: criar um pulso operacional interno do AIOS a partir do Company Brain, sem writeback externo, para mostrar se o sistema esta legivel como gestao e nao apenas como colecao de entidades.

Implementado em 2026-05-06:

1. Seed `source-aios-briefing-v0` e `watcher-aios-briefing-v0` em `packages/daemon/src/db/client.ts`.
2. Watcher especial reutiliza `Watcher/WatcherRun` existente e mantem `actionPolicy=observe_only`, `riskClass=B`, `failurePolicy=record_error_no_writeback`.
3. Run gera Artifact interno `aios_briefing` com summary estruturado e provenance `watcher:watcher-aios-briefing-v0:briefing`.
4. Briefing cobre decisions novas/pendentes, tradeoffs, open guidance, findings, source health, adoption dashboard, work items sem priority/goal, gates/SLA em risco e proximos passos.
5. Signals opcionais sao emitidos apenas para gaps claros: source stale/error/never synced, guidance vencida, work item sem priority/goal, gate critico pendente e SLA risk. Cada signal traz envelope AutoImprove Core em `metadata.autoImproveEnvelope`.
6. `CompanyBrainSummary` inclui `lastBriefing`; tambem existe `GET /api/company-brain/briefing`.
7. UI `/company-brain` mostra painel AIOS Briefing com ultimo artifact, secoes, next steps, contador de gap signals e botao para rodar o watcher.
8. MCP tool `get_company_brain_briefing` expõe o ultimo briefing; `get_company_brain_summary` tambem retorna `lastBriefing`.
9. Nenhum post no Slack/GitHub ou writeback externo automatico foi implementado.

Dogfood local validado em DB temporario `/tmp/aios-runtime-aios-briefing-dogfood.sqlite`, daemon em `127.0.0.1:43119`:

- WatcherRun: `KXZkIiALdSmE`.
- Artifact briefing: `KFbXLc23I8-2`, `artifactType=aios_briefing`, `actionPolicy=observe_only`.
- Secoes geradas: `9` (`decisions`, `tradeoffs`, `open_guidance`, `findings`, `source_health`, `adoption_dashboard`, `unlinked_work`, `gates_sla`, `next_steps`).
- Gap signals emitidos: `5`, todos com `metadata.autoImproveEnvelope`.
- Summary retornou `lastBriefing.artifactId=KFbXLc23I8-2`, igual ao endpoint `/api/company-brain/briefing`.

## Slice Review Cohesion v0

Objetivo: unificar a revisao operacional de candidates gerados pelo Company Brain sem criar writeback externo nem recriar os objetos existentes.

Implementado em 2026-05-06:

1. Tipos `CompanyBrainReviewItemKind`, `CompanyBrainReviewQueueItem` e `CompanyBrainReviewCohesion` em `packages/shared/src/types.ts`.
2. Helper derivado `buildReviewCohesion` no daemon, sem nova tabela, usando `Decision`, `Signal`, `AlignmentFinding` e `GuidanceItem` existentes.
3. `GET /api/company-brain/review-cohesion` e campo `reviewCohesion` em `/api/company-brain/summary`.
4. A fila mostra:
   - `decision_candidate`: decisions `proposed`;
   - `signal_needs_finding`: signals sem `AlignmentFinding`;
   - `finding_needs_guidance`: findings sem `GuidanceItem`;
   - `guidance_needs_feedback`: guidance `new/open` com `feedbackStatus=pending`.
5. Cada item inclui target, status, severity, area, links internos, next action e provenance.
6. UI `/company-brain` adiciona painel Review Cohesion com contadores e acoes internas: aceitar/rejeitar decision, extrair guidance de signal, criar guidance interna para finding e aceitar/concluir guidance.
7. MCP tool `get_company_brain_review_cohesion`.
8. Nenhum writeback externo automatico foi implementado.

Dogfood local validado em DB temporario `/tmp/aios-runtime-review-cohesion-dogfood.sqlite`, daemon em `127.0.0.1:43120`:

- Fila inicial: `totalItemCount=4`, cobrindo os quatro kinds esperados.
- Decision aceita internamente: `A7Fm2EaHUDNM`.
- Signal extraido para finding/guidance: `fr9YHWu4E7l4`.
- Guidance criada a partir de finding: `9qfq9Y4W4IjP`.
- Guidance pendente, guidance extraida e guidance criada foram concluidas por API.
- Fila final: `totalItemCount=0`.
- Summary retornou `reviewQueueItemCount=0`.

## Slice Writeback Governance v0

Objetivo: criar politica, modelo e fila interna para writeback controlado, sem executar mutacao externa em Slack, GitHub ou qualquer sistema fora do AIOS.

Implementado em 2026-05-06:

1. Tipos `ExternalActionProposal`, `ExternalActionAuditEvent`, destinations, action kinds, approval status e execution status em `packages/shared/src/types.ts`.
2. Tabela `cb_external_action_proposals` em `packages/daemon/src/db/schema.ts` e migration inline em `packages/daemon/src/db/client.ts`, com guidance/source links, destination, payload, risk/action policy, approval, execution, external id/url, erro, rollback, idempotency, visibility e provenance.
3. Politica v0:
   - Risk A: apenas acao interna ou draft; sem writeback externo.
   - Risk B: comentario GitHub ou reply Slack de baixo risco, sempre dependente de aprovacao humana.
   - Risk C/unknown: bloqueado no v0, sem reinforced approval implementado.
4. API:
   - `GET /api/company-brain/external-action-proposals`
   - `POST /api/company-brain/external-action-proposals/from-guidance`
   - `PUT /api/company-brain/external-action-proposals/:id`
5. `CompanyBrainSummary` inclui `externalActionProposals` e contadores total/pending/approved/blocked.
6. UI `/company-brain` adiciona painel Writeback Governance com criacao a partir de guidance aceita, fila, policy summary, status e botoes approve/reject.
7. MCP tools:
   - `list_company_brain_external_action_proposals`
   - `create_company_brain_external_action_proposal`
   - `review_company_brain_external_action_proposal`
8. Aprovar proposta registra HITL/audit e mantem `executionStatus=not_started`; nao chama adapters externos e nao gera `externalId`.

Dogfood local validado em DB temporario `/tmp/aios-runtime-writeback-governance-dogfood.sqlite`, daemon em `127.0.0.1:43124`:

- Guidance aceita: `Z0u8rPYSsEK4`.
- Proposta B GitHub comment aprovada internamente: `Odbhk9mWFzt0`, `executionStatus=not_started`, `externalId=null`.
- Proposta B Slack thread reply rejeitada: `GSMjWhVuL0pK`, `executionStatus=cancelled`.
- Proposta C bloqueada: `4-RYOKYCh2EI`, tentativa de approve retornou erro 400 por policy.
- Proposta A internal draft: `BpSp0VlcbPQ-`, `approvalStatus=pending`, `executionStatus=not_started`.
- Summary retornou `externalActionProposalCount=4`, `pending=1`, `approved=1`, `blocked=1`; todos os `externalIds` permaneceram `null`.

## Slice GitHub Comment Writeback v0

Objetivo: executar o primeiro writeback externo real de forma minima e governada: somente comentario em issue/PR GitHub, a partir de `ExternalActionProposal` aprovada, com preview, idempotencia e audit trail.

Implementado em 2026-05-06:

1. `ExternalActionKind` passa a aceitar `comment` como action canonica para GitHub comment, mantendo `github_comment` como legado compatível.
2. `ExternalActionExecutionStatus` inclui `completed`.
3. Tipos `ExecuteExternalActionProposalRequest`, `GitHubCommentWritebackTarget` e `GitHubCommentWritebackResponse` em `packages/shared/src/types.ts`.
4. Daemon adiciona:
   - `POST /api/company-brain/external-action-proposals/:id/github-comment/preview`
   - `POST /api/company-brain/external-action-proposals/:id/github-comment/execute`
5. Preview valida proposal e retorna o corpo exato do comentario com marker HTML invisivel, sem chamar GitHub; registra `executionStatus=dry_run` e audit event `github_comment_previewed`.
6. Execute real exige todos os gates:
   - `approvalStatus=approved`
   - `executionStatus=not_started` ou `dry_run`
   - `destinationType=github`
   - `actionType=comment` ou legado `github_comment`
   - `riskClass=B`
   - `actionPolicy=writeback_allowed`
   - `idempotencyKey` presente
   - `destinationRef` como `owner/repo#number`, `repo#number` com owner default ou URL GitHub issue/PR
   - `payload.body` nao vazio
7. Execute usa `GITHUB_TOKEN` ou `GH_TOKEN`, busca comentarios existentes pelo marker antes de postar e nunca tenta label/assign/close/reopen/merge/deploy/notification read.
8. Sucesso registra `executionStatus=completed`, `externalId`, `externalUrl` e audit event `github_comment_posted` ou `github_comment_reused`.
9. Erro registra `executionStatus=failed`, `errorSummary` e audit event `github_comment_failed`.
10. UI `/company-brain` adiciona botoes Preview e Execute no painel Writeback Governance, com confirmacao no browser antes da execucao real.
11. MCP tools adicionadas:
    - `preview_company_brain_github_comment_writeback`
    - `execute_company_brain_github_comment_writeback`
12. Client GitHub do daemon usa DNS `ipv4first` e retry apenas em GET/read; POST nao faz retry automatico para evitar comentario duplicado se a resposta cair apos mutacao.

Dogfood local validado em DB temporario `/tmp/aios-runtime-github-comment-writeback-dogfood.sqlite`, daemon em `127.0.0.1:43125`, contra `antonio-mello-ai/crewdock#3`:

- Guidance aceita criada para dogfood.
- Proposal executada: `hTZmyt_cHq00`.
- Preview retornou `dry_run`, body com marker `aios-writeback`, `externalId=null`.
- Houve falhas transientes iniciais de rede para GitHub; cada tentativa registrou `github_comment_failed` e `errorSummary=fetch failed`.
- Retry com client `ipv4first` concluiu com `executionStatus=completed`.
- Comentario criado: `externalId=4390632745`, `externalUrl=https://github.com/antonio-mello-ai/crewdock/issues/3#issuecomment-4390632745`.
- Segunda execucao da mesma proposal retornou `already_completed` e nao postou de novo.
- Verificacao GitHub API confirmou comment `4390632745` com marker `aios-writeback`.
- Caminho proibido validado: proposal sem aprovacao retornou 400 `proposal must be approved before GitHub writeback`, ficou `executionStatus=failed` e sem `externalId/externalUrl`.

## Slice Slack Thread Reply Writeback v0

Objetivo: executar Slack writeback real de forma estreita e governada: somente reply em thread existente, a partir de `ExternalActionProposal` aprovada, com preview, idempotencia e audit trail. Nenhuma mensagem top-level, DM, edicao, delete, reaction, pin, invite, topic, rename ou GitHub action nova entra neste corte.

Implementado em 2026-05-06:

1. `ExternalActionKind` passa a aceitar `thread_reply` como action canonica para Slack thread reply, mantendo `slack_thread_reply` como legado compativel.
2. Tipos `SlackThreadReplyWritebackTarget` e `SlackThreadReplyWritebackResponse` em `packages/shared/src/types.ts`.
3. Daemon adiciona:
   - `POST /api/company-brain/external-action-proposals/:id/slack-thread-reply/preview`
   - `POST /api/company-brain/external-action-proposals/:id/slack-thread-reply/execute`
4. Preview valida proposal e retorna o corpo exato da reply com marker discreto, sem chamar Slack write API; registra `executionStatus=dry_run` e audit event `slack_thread_reply_previewed`.
5. Execute real exige todos os gates:
   - `approvalStatus=approved`
   - `executionStatus=not_started` ou `dry_run`
   - `destinationType=slack`
   - `actionType=thread_reply` ou legado `slack_thread_reply`
   - `riskClass=B`
   - `actionPolicy=writeback_allowed`
   - `idempotencyKey` presente
   - `destinationRef` como `slack://channel/threadTs`, `channelId:threadTs`, `channelId/threadTs` ou permalink Slack de thread
   - `payload.body` nao vazio
6. Execute usa `SLACK_BOT_TOKEN`, rejeita DM (`D...`), busca replies da thread por `conversations.replies`, exige que a thread ja tenha pelo menos uma reply e procura marker antes de postar.
7. Se encontrar reply anterior com o marker, registra `slack_thread_reply_reused` e nao duplica.
8. Sucesso registra `executionStatus=completed`, `externalId=channel:ts`, `externalUrl` com permalink ou fallback `slack://channel/ts` e audit event `slack_thread_reply_posted` ou `slack_thread_reply_reused`.
9. Erro registra `executionStatus=failed`, `errorSummary` e audit event `slack_thread_reply_failed`.
10. UI `/company-brain` adiciona Preview/Reply para proposals Slack e mantem confirmacao no browser antes da execucao real.
11. MCP tools adicionadas:
    - `preview_company_brain_slack_thread_reply_writeback`
    - `execute_company_brain_slack_thread_reply_writeback`
12. `ExternalActionProposal` gerada para Slack agora usa payload canonico `{ body }`; payload legado `{ text }` nao e aceito pelo executor porque o gate exige `payload.body`.

Dogfood local validado em DB temporario `/tmp/aios-runtime-slack-thread-reply-writeback-dogfood.sqlite`, daemon em `127.0.0.1:43126`:

- Slack token validado sem expor segredo: workspace `Felhen`, channel `#aios-runtime` encontrado como `C0B1ZM0JULA` e bot membro do canal.
- Nenhuma thread com replies foi encontrada em `#aios-runtime`; por isso o dogfood externo ficou em preview, sem post real.
- Guidance aceita criada para dogfood.
- Proposal aprovada: `h7GkOthHzW0z`.
- Destination preview usado: `slack://C0B1ZM0JULA/1778072936.876349`.
- Preview retornou `dry_run`, target normalizado, body com marker `aios-writeback`, `externalId=null`.
- Caminho proibido validado: proposal sem aprovacao `zQp7_ttOCwUk` retornou 400 `proposal must be approved before Slack writeback`, sem chamada Slack de escrita.

Dogfood real posterior validado em DB operacional local ignorado pelo git, daemon em `127.0.0.1:3101`, usando thread segura `https://felhen.slack.com/archives/C0B1ZM0JULA/p1778092775577459`:

- Payload aprovado: `AIOS writeback dogfood executado: esta resposta foi criada a partir de uma ExternalActionProposal aprovada, com preview gate, HITL rationale, idempotency marker e audit trail. Não houve mensagem fora de thread.`
- Guidance aceita criada: `rvis2S8FuEqt`.
- Proposal criada/aprovada: `gx7PrLKf4iJF`, `destinationType=slack`, `actionType=thread_reply`, `riskClass=B`, `actionPolicy=writeback_allowed`, `idempotencyKey=dogfood:slack-thread-reply-v0:C0B1ZM0JULA:1778092775.577459`.
- Target normalizado: `slack://C0B1ZM0JULA/1778092775.577459`.
- Preview retornou `dry_run`, marker presente e `externalId=null`.
- Execute retornou `completed`, `reusedExisting=false`, `externalId=C0B1ZM0JULA:1778092928.052089`.
- `externalUrl` gravado: `https://felhen.slack.com/archives/C0B1ZM0JULA/p1778092928052089?thread_ts=1778092775.577459&cid=C0B1ZM0JULA`.
- Replay do execute retornou `already_completed`, `reusedExisting=true`, com o mesmo `externalId/externalUrl`.
- Readback da thread via Slack API encontrou exatamente 1 mensagem com o marker de idempotencia, confirmando que nao houve duplicacao.
- Audit trail da proposal: `proposal_created`, `approved`, `slack_thread_reply_previewed`, `slack_thread_reply_posted`.

## Slice Writeback Safety Dashboard v0

Objetivo: tornar auditavel em uma unica superficie tudo que o AIOS ja escreveu fora ou tentou preparar para writeback, antes de permitir labels/status/assign ou qualquer acao externa mais forte.

Implementado em 2026-05-06:

1. Tipos `WritebackSafetyItemKind`, `WritebackSafetyQueueItem` e `CompanyBrainWritebackSafetyDashboard` em `packages/shared/src/types.ts`.
2. Daemon adiciona dashboard derivado a partir de `ExternalActionProposal.auditTrail`, sem tabela nova e sem mutacao externa.
3. Summary passa a incluir `writebackSafetyDashboard` e stats:
   - `completedExternalActionCount`
   - `failedExternalActionCount`
   - `duplicateAvoidedExternalActionCount`
4. API dedicada:
   - `GET /api/company-brain/writeback-safety-dashboard`
5. O dashboard classifica items como:
   - `completed_external_writeback`
   - `duplicate_avoided`
   - `failed_execution`
   - `approved_ready`
   - `pending_approval`
   - `rejected_proposal`
   - `blocked_proposal`
6. Stats cobrem completed external writes, GitHub comments, Slack thread replies, approved-ready, pending approval, failed execution, rejected, blocked, risk C/unknown, refs externas faltantes e duplicate avoided.
7. UI `/company-brain` adiciona painel compacto dentro de Writeback Governance com written/failed/ready/reused/rejected/blocked e ultimos audit items com next action, external URL ou erro.
8. MCP tool adicionada:
   - `get_company_brain_writeback_safety_dashboard`

Dogfood local validado em DB temporario `/tmp/aios-runtime-writeback-safety-dashboard-dogfood.sqlite`, daemon em `127.0.0.1:43127`, sem writeback externo:

- 5 proposals artificiais criadas para cobrir pending, approved-ready, rejected, blocked risk C e failed execution.
- IDs: pending `nDpLQ30DzgxP`, approved `51ra1f3LgbPa`, rejected `guAKeYeKUjvK`, blocked `k983qJ-v_7qc`, failed `Zv7cAukr-igf`.
- Falha controlada validada por tentativa sem aprovacao: 400 `proposal must be approved before GitHub writeback`; nenhuma chamada externa de escrita ocorreu.
- Dashboard retornou `proposalCount=5`, `pendingApprovalCount=1`, `approvedReadyCount=1`, `failedExecutionCount=1`, `rejectedProposalCount=1`, `blockedProposalCount=1`, `riskCOrUnknownCount=1`.
- `itemKinds` retornou `approved_ready`, `blocked_proposal`, `failed_execution`, `pending_approval`, `rejected_proposal`.
- Summary refletiu `completedExternalActionCount=0`, `failedExternalActionCount=1`, `duplicateAvoidedExternalActionCount=0`.

## Slice Writeback Preview Gate v0

Objetivo: endurecer a fronteira de execucao externa sem criar novas acoes externas: todo execute real de GitHub comment ou Slack thread reply deve ter preview/dry-run registrado depois da aprovacao humana.

Implementado em 2026-05-06:

1. Daemon registra snapshot de preview no audit trail e, no corte Retry Safety, centraliza a regra em `buildWritebackExecutionReview` / `assertWritebackExecutionReview`.
2. `execute` de GitHub comment exige audit event `github_comment_previewed` com timestamp posterior ou igual a `approvedAt` antes de buscar comentarios ou chamar POST no GitHub.
3. `execute` de Slack thread reply exige audit event `slack_thread_reply_previewed` com timestamp posterior ou igual a `approvedAt` antes de buscar thread replies ou chamar Slack write API.
4. Tentativa de execute sem preview retorna 400, registra audit event recuperavel:
   - `github_comment_preview_required`
   - `slack_thread_reply_preview_required`
5. Esse bloqueio preserva `executionStatus` anterior (`not_started` ou `dry_run`) em vez de marcar `failed`, para permitir rodar preview depois.
6. UI `/company-brain` separa permissao de preview e execute: Preview fica habilitado para `not_started/dry_run`; Execute/Reply so fica habilitado em `dry_run`.
7. MCP descriptions de execute deixam explicita a precondicao de preview posterior a aprovacao.

Dogfood local validado em DB temporario `/tmp/aios-runtime-hitl-hardening-dogfood.sqlite`, daemon em `127.0.0.1:43128`, sem writeback externo:

- GitHub proposal `W-_neQCL3bIr`: execute antes de preview retornou 400 `GitHub comment writeback preview is required after approval before execution`, manteve `executionStatus=not_started`, audit `github_comment_preview_required`; preview posterior retornou `dry_run` com marker.
- Slack proposal `K20ZAIgicmB-`: execute antes de preview retornou 400 `Slack thread reply writeback preview is required after approval before execution`, manteve `executionStatus=not_started`, audit `slack_thread_reply_preview_required`; preview posterior retornou `dry_run` com marker.
- Dashboard refletiu `proposalCount=2`, `approvedReadyCount=2`, `failedExecutionCount=0`, `completedExternalWriteCount=0`.

## Slice Writeback HITL Rationale v0

Objetivo: fortalecer aprovacao humana antes de qualquer execute real, exigindo actor e rationale explicitos e deixando hash do payload/idempotency no audit trail.

Implementado em 2026-05-06:

1. `UpdateExternalActionProposalRequest.actor` passa a ser obrigatorio no tipo compartilhado.
2. API `PUT /api/company-brain/external-action-proposals/:id` passa a rejeitar approve sem `actor`.
3. Approve exige `note` nao vazio.
4. Reject exige `actor` e `rejectionReason` ou `note` nao vazio.
5. Audit event `approved` e `rejected` agora inclui:
   - `payloadHash`
   - `idempotencyKey`
   - payload e destino revisados
6. MCP `review_company_brain_external_action_proposal` passa a exigir `actor` e descreve rationale/HITL.
7. UI ja enviava `actor=Antonio`, note de approval e rejection reason; continuou compativel.

Dogfood local validado em DB temporario `/tmp/aios-runtime-hitl-rationale-dogfood.sqlite`, daemon em `127.0.0.1:43129`, sem writeback externo:

- Proposal approve `y6XQ9cCJmT2X`: approve sem actor retornou 400 `actor is required to approve writeback proposals`.
- A mesma proposal sem note retornou 400 `approval note is required to approve writeback proposals`.
- Approve com actor/note concluiu `approvalStatus=approved`, audit `approved`, `payloadHash` e `idempotencyKey` presentes.
- Proposal reject `olsaKbBNaGEU`: reject sem reason retornou 400 `rejection reason is required to reject writeback proposals`.
- Reject com actor/reason concluiu `approvalStatus=rejected`, audit `rejected`, `payloadHash` e `idempotencyKey` presentes.

## Slice Retry Safety / Idempotent Execution Review v0

Objetivo: impedir duplicacao, replay indevido, payload alterado depois da aprovacao/preview e retry perigoso antes de permitir actions mais fortes como label/status/assign.

Implementado em 2026-05-06:

1. Tipos `WritebackExecutionReview`, `WritebackExecutionReviewStatus`, `WritebackExecutionReviewFlag` e `WritebackRetryPolicy` em `packages/shared/src/types.ts`.
2. `ExecuteExternalActionProposalRequest` aceita `retryRationale` para retry manual de falha recuperavel.
3. Daemon adiciona hash estavel de payload e snapshots em audit trail de approve/preview.
4. `buildWritebackExecutionReview` compara:
   - payloadHash aprovado;
   - payloadHash do preview;
   - payloadHash atual;
   - destinationRef aprovado/preview/atual;
   - idempotencyKey aprovado/preview/atual;
   - approvedAt, previewAt, actor e rationale.
5. `assertWritebackExecutionReview` bloqueia execute quando:
   - falta preview posterior a aprovacao;
   - preview aconteceu antes da aprovacao;
   - preview ficou stale;
   - payload mudou depois da aprovacao ou do preview;
   - destinationRef mudou;
   - idempotencyKey mudou;
   - proposal esta failed sem novo `retryRationale`;
   - proposal esta blocked/cancelled/rejected/risk C/unknown.
6. Estados de execucao mapeados para o review: `not_started`, `dry_run`, `completed`, `already_completed` em resposta de replay, `failed`, `cancelled` e `blocked`.
7. Retry policy exposta em API/UI/MCP:
   - GET/read pode ter retry automatico;
   - POST/write nao faz retry automatico;
   - retry manual de failed exige nova rationale humana;
   - completed/already_completed nunca executa de novo;
   - blocked/cancelled exigem nova proposal.
8. Safety Dashboard passa a expor status/flags derivados:
   - `ready_to_execute`
   - `needs_preview`
   - `needs_reapproval`
   - `retryable_failed`
   - `unsafe_failed`
   - `payload_mismatch`
   - `destination_mismatch`
   - `duplicate_prevented`
   - `completed`
   - `blocked`
9. UI `/company-brain` mostra o review status por proposal, novos contadores de safety e so habilita Execute/Reply quando o dashboard marca `ready_to_execute`.
10. MCP execute tools de GitHub/Slack aceitam `retryRationale` e descrevem os gates de review.
11. Nenhuma action externa nova foi adicionada: sem label, assign, close/reopen, merge, deploy, mark notification read, Slack top-level, DM, edit/delete/react/pin/invite/topic/rename.

Dogfood local validado em DB temporario `/tmp/aios-runtime-retry-safety-dogfood.sqlite`, daemon em `127.0.0.1:43130`:

- Execute GitHub sem preview retornou 400, `reviewStatus=needs_preview`, `executionStatus=not_started`.
- Preview sintetico antes da aprovacao bloqueou execute com `reviewStatus=needs_preview` e flag `preview_before_approval`.
- Payload alterado depois do preview bloqueou execute com `reviewStatus=payload_mismatch`.
- Proposal `failed` sem `retryRationale` bloqueou retry com `reviewStatus=retryable_failed`, `executionStatus=failed` preservado e audit `github_comment_retry_required`.
- Proposal ja `completed` retornou `already_completed` em reexecute, sem chamada externa.
- Slack duplicate-prevention foi validado contra a thread segura `https://felhen.slack.com/archives/C0B1ZM0JULA/p1778092775577459`, reutilizando a proposal `gx7PrLKf4iJF` e idempotency key `dogfood:slack-thread-reply-v0:C0B1ZM0JULA:1778092775.577459`: marker count antes/depois ficou `1`, execute retornou `reusedExisting=true`, `reviewStatus=duplicate_prevented`, `externalId=C0B1ZM0JULA:1778092928.052089`, e reexecute retornou `already_completed`.
- Dashboard final retornou `proposalCount=6`, `needsPreviewCount=2`, `payloadMismatchCount=1`, `retryableFailedCount=1`, `completedExternalWriteCount=2`, `duplicateAvoidedCount=1`, `readyToExecuteCount=0`.

## Slice Writeback Policy Matrix v0

Objetivo: registrar dentro do repo a fronteira versionada entre acoes internas, writebacks B permitidos e acoes bloqueadas antes de criar propostas para label/status/assign.

Implementado em 2026-05-06:

1. Novo documento `docs/writeback-policy-matrix.md`.
2. Matriz A/B/C para `risk_class` e `action_policy`.
3. Matriz por `destination_type` e `action_type`, marcando:
   - executavel agora: GitHub issue/PR comment e Slack thread reply;
   - preview-only: GitHub label proposal v0 e GitHub status/check proposal v0;
   - bloqueado: assign/unassign, close/reopen, merge, deploy, notification read, Slack top-level/DM/edit/delete/react/pin/invite/topic/rename e unknown.
4. Gates obrigatorios documentados para GitHub comment e Slack thread reply, alinhados com HITL, preview, idempotencia e Retry Safety.
5. Requisitos para preview-only candidates: target, payload diff, rationale de risco, idempotency key, approvals futuros e audit event sem mutacao externa.
6. Nenhuma mudanca de schema/API/UI/MCP e nenhuma chamada externa.

## Slice GitHub Label Proposal v0 Preview-Only

Objetivo: permitir que o AIOS proponha labels GitHub de forma auditavel sem executar nenhuma mutacao externa.

Implementado em 2026-05-06:

1. `ExternalActionKind` aceita `label` e `github_label`.
2. Tipo `GitHubLabelProposalPreviewResponse` e `GitHubLabelActionMode` em `packages/shared/src/types.ts`.
3. `externalActionPolicy` permite Risk B GitHub label como proposal preview-only: pode ser revisada e dry-run, mas nao existe executor.
4. Daemon adiciona `POST /api/company-brain/external-action-proposals/:id/github-label/preview`.
5. Preview valida `destinationType=github`, action label, `destinationRef`, `payload.labels`, `mode=add/remove/set`, risk class classificado e `idempotencyKey`.
6. Preview registra audit event `github_label_previewed`, `payloadHash`, target normalizado, labels, mode e `executionBlocked=true`.
7. Safety review marca label proposals como `blocked`, impedindo que elas aparecam como `ready_to_execute`.
8. UI `/company-brain` permite criar label proposals com campo de labels e botao `Preview labels`, sem botao de execute.
9. MCP tool `preview_company_brain_github_label_proposal`.
10. Nenhuma chamada GitHub write API e nenhuma rota de execute foram adicionadas.

Dogfood local validado em DB temporario `/tmp/aios-runtime-github-label-preview-dogfood.sqlite`, daemon em `127.0.0.1:43131`, sem token GitHub e sem writeback externo:

- Guidance aceita criada para dogfood.
- Proposal criada: `jbkoFiC8fiZZ`, `destinationType=github`, `actionType=label`, `riskClass=B`, `actionPolicy=request_human`, destination `antonio-mello-ai/crewdock#3`, payload `{ labels: ["aios-dogfood-preview", "needs-review"], mode: "add" }`.
- Preview retornou `status=preview_only`, `executionBlocked=true`, `labels=[aios-dogfood-preview, needs-review]`, `mode=add`, audit `github_label_previewed`, `externalId=null`, `externalUrl=null`.
- Tentativa em `/github-label/execute` retornou 404, confirmando ausencia de executor.
- Safety Dashboard retornou `reviewStatus=blocked` para a proposal, impedindo `ready_to_execute`.

## Slice GitHub Status/Check Proposal v0 Preview-Only

Objetivo: modelar como o AIOS sugeriria feedback operacional para PR/CI no GitHub sem executar nenhuma mutacao real.

Implementado em 2026-05-06:

1. `ExternalActionKind` aceita `github_status` e `github_check`.
2. Tipos `GitHubStatusCheckTarget` e `GitHubStatusCheckProposalPreviewResponse` em `packages/shared/src/types.ts`.
3. `externalActionPolicy` permite Risk B GitHub status/check como proposal preview-only para `request_human` ou `writeback_allowed`.
4. Daemon adiciona `POST /api/company-brain/external-action-proposals/:id/github-status-check/preview`.
5. Preview valida payload:
   - `repo`;
   - `pullNumber` ou `sha`;
   - `context` ou `name`;
   - `state` para `github_status` ou `conclusion` para `github_check`;
   - `title`, `summary`, `description`, `targetUrl` opcional e `rationale`.
6. Preview retorna target exato, payloadHash, idempotencyKey, risk rationale, `executionBlocked=true` e `status=preview_only`.
7. Preview registra audit event `github_status_check_previewed` com target, payload, hash, policy e rationale.
8. Safety review marca status/check proposals como `blocked`, impedindo que elas aparecam como `ready_to_execute`.
9. UI `/company-brain` permite criar status/check proposals com campos de PR/CI e botao `Preview status`, sem botao de execute.
10. MCP tool `preview_company_brain_github_status_check_proposal`.
11. Nenhuma chamada GitHub write API e nenhuma rota de execute foram adicionadas.

Dogfood local validado em DB temporario `/tmp/aios-runtime-github-status-check-preview-dogfood.sqlite`, daemon em `127.0.0.1:43132`, usando `GITHUB_TOKEN` somente para leitura:

- GitHub PR/CI watcher read-only rodou em `home-assistant/core`, `state=open`, `limit=1`.
- WatcherRun: `X4KQxjNU_DQH`.
- Artifact `github_pr_ci`: `IkNiaN5OqR3F`, raw_ref `https://github.com/home-assistant/core/pull/169942@c3a3f29b46cd6e95508f3fa8f69010b57f26c70b`.
- PR/CI target usado: repo `home-assistant/core`, PR `169942`, head SHA `c3a3f29b46cd6e95508f3fa8f69010b57f26c70b`.
- Proposal `github_status`: `tqIheZVYAL-5`, preview retornou `status=preview_only`, target exato, context `aios/preview-status`, state `success`, payloadHash `556bf9a8a66c18586aa4763052caa2596c7886c371a5739e1562d44bddc4ec4a`, `executionBlocked=true`, `externalId=null`, `externalUrl=null`.
- Proposal `github_check`: `6aO84WGXVO30`, preview retornou `status=preview_only`, target exato, name `aios/preview-check`, conclusion `success`, payloadHash `4f8a65ed8d0520e1722f6751b0b6295024ddaaff80434bd41e23e7afe260f60d`, `executionBlocked=true`, `externalId=null`, `externalUrl=null`.
- Tentativas em `/github-status-check/execute` retornaram 404 para status e check, confirmando ausencia de executor.
- Safety Dashboard retornou `reviewStatus=blocked` para ambas as proposals.

## Slice Writeback Audit Review v0

Objetivo: reforcar a revisao visual/audit da fila de writeback antes de qualquer executor real de label ou outra acao mais forte.

Implementado em 2026-05-06:

1. Tipo `WritebackAuditReview` em `packages/shared/src/types.ts`.
2. Cada item de `CompanyBrainWritebackSafetyDashboard.items` agora inclui `auditReview`.
3. `auditReview` expõe:
   - `eventCount`;
   - ultimo evento, ator e timestamp;
   - timestamps de approval, preview e execution;
   - duplicate prevention;
   - presenca de external ref;
   - erro;
   - payloadHash atual;
   - idempotencyKey;
   - destinationRef.
4. UI `/company-brain` mostra event count, actor, idempotency key, payload hash e review flags no painel Writeback Safety.
5. Nenhuma mudanca de schema, nenhuma rota nova de mutacao e nenhuma chamada externa.

Dogfood local validado em DB temporario `/tmp/aios-runtime-writeback-audit-review-dogfood.sqlite`, daemon em `127.0.0.1:43133`, sem writeback externo:

- Proposal preview-only criada: `Qni3wKUqM4Mo`, `actionType=github_status`, destination `https://github.com/home-assistant/core/pull/169942`, idempotency `dogfood:writeback-audit-review:v0:github-status`.
- Preview status/check retornou 200 e audit `github_status_check_previewed`.
- Safety Dashboard retornou `reviewStatus=blocked`.
- `auditReview` retornou `eventCount=2`, `latestEvent=github_status_check_previewed`, `latestActor=writeback-audit-review-dogfood`, `approvalEventAt=null`, `previewEventAt=1778096098054`, `executionEventAt=null`, `hasExternalRef=false`, `hasError=false`, payloadHash `aef16370c0fe82d50e1e0c009df51a487d0a321cfcebb48aa4a9ec37e308f18a`.

## Slice GitHub Label Executor v0

Objetivo: executar somente GitHub label add Risk B ja previsto, com alvo controlado, sem abrir assign/status/close/merge/deploy ou qualquer outra mutacao externa.

Implementado em 2026-05-06:

1. Rota `POST /api/company-brain/external-action-proposals/:id/github-label/execute`.
2. MCP tool `execute_company_brain_github_label_writeback`.
3. UI `/company-brain` com botao `Apply label`, habilitado apenas quando Safety Review retorna `ready_to_execute`.
4. Executor exige:
   - `destinationType=github`;
   - `actionType=label/github_label`;
   - `approvalStatus=approved`;
   - `riskClass=B`;
   - `actionPolicy=writeback_allowed`;
   - HITL actor/rationale na aprovacao;
   - preview apos aprovacao;
   - Retry Safety `ready_to_execute`;
   - `idempotencyKey`;
   - `mode=add`;
   - exatamente um label;
   - alvo/label allowlisted por `AIOS_GITHUB_LABEL_WRITEBACK_ALLOWLIST`.
5. Allowlist default do v0: `antonio-mello-ai/crewdock#3=enhancement`.
6. Antes de qualquer write, o executor le labels atuais da issue/PR.
7. Se o label aprovado ja existe, grava audit `github_label_completed_noop`, retorna `completed_noop`, preenche `externalId/externalUrl` e nao chama a write API.
8. Reexecucao de proposal `completed` retorna `already_completed`.
9. Se o label estiver ausente, o executor verifica que o label ja existe no repo antes de adicionar; nao cria label novo.
10. `github_status/github_check`, assign, close/reopen, merge, deploy e notification-read seguem bloqueados.

Dogfood real validado em DB temporario `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon em `127.0.0.1:43134`, usando alvo aprovado `antonio-mello-ai/crewdock#3`:

- Guidance aceita: `OqzwuwF4VjPo`.
- Proposal aprovada: `fx3NheQm3Crv`.
- Target: `antonio-mello-ai/crewdock#3`.
- Label: `enhancement`.
- Preview retornou `status=dry_run`, `executionBlocked=false`, labels `["enhancement"]`.
- Safety antes do execute retornou `reviewStatus=ready_to_execute`, `reviewFlags=[]`, audit `github_label_previewed`.
- Execute retornou `status=completed_noop`, `mutationAttempted=false`, `missingLabels=[]`, `currentHasEnhancement=true`, `externalUrl=https://github.com/antonio-mello-ai/crewdock/issues/3`.
- Reexecute retornou `status=already_completed`, `mutationAttempted=false`.
- Safety apos execute retornou `reviewStatus=duplicate_prevented`, flags `duplicate_prevented/completed`, audit `github_label_completed_noop`.

## Slice Post-Writeback Audit Review v0

Objetivo: melhorar a leitura pos-writeback sem criar nova mutacao externa, especialmente para labels executadas/noop.

Implementado em 2026-05-06:

1. `WritebackAuditReview` agora inclui `executionEvent`, `completedNoop` e `mutationAttempted`.
2. `CompanyBrainWritebackSafetyDashboard.stats` agora inclui:
   - `githubLabelWriteCount`;
   - `githubLabelNoopCount`;
   - `completedNoopCount`;
   - `externalMutationAttemptedCount`.
3. UI `/company-brain` mostra metricas `labels` e `noop` e outcome por item: execution event, mutacao tentada e noop.
4. Nenhuma rota de mutacao nova, nenhuma chamada externa nova.

Dogfood read-only validado reaproveitando DB temporario `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon em `127.0.0.1:43135`:

- Proposal revisada: `fx3NheQm3Crv`.
- Stats: `completedExternalWriteCount=1`, `githubLabelWriteCount=1`, `githubLabelNoopCount=1`, `completedNoopCount=1`, `externalMutationAttemptedCount=0`, `duplicateAvoidedCount=1`.
- Item retornou `reviewStatus=duplicate_prevented`, `auditEvent=github_label_completed_noop`, `executionEvent=github_label_completed_noop`, `duplicatePrevented=true`, `completedNoop=true`, `mutationAttempted=false`, `hasExternalRef=true`.

## Slice Writeback Negative-Path Review v0

Objetivo: deixar propostas bloqueadas de label/status/check legiveis no Safety Dashboard sem criar nenhum executor novo.

Implementado em 2026-05-06:

1. `WritebackAuditReview` agora inclui `blockReasons`.
2. Safety Dashboard inclui stats:
   - `previewOnlyBlockedCount`;
   - `githubLabelBlockedCount`;
   - `githubStatusCheckBlockedCount`.
3. UI `/company-brain` mostra metricas `label blocks` e `preview-only`.
4. Cada item mostra `blocked by ...` quando houver motivos derivados.
5. Motivos cobrem, entre outros:
   - `github_label_mode_not_supported`;
   - `github_label_single_label_required`;
   - `github_label_target_not_allowlisted`;
   - `github_status_check_preview_only`.
6. Nenhuma rota de execute nova e nenhuma chamada externa.

Dogfood read-only validado em DB temporario `/tmp/aios-runtime-writeback-negative-review-dogfood.sqlite`, daemon em `127.0.0.1:43136`:

- Proposal `I5PGjeflFsRN`: `github_label`, `mode=remove`, preview `preview_only`, `executionBlocked=true`, `reviewStatus=blocked`, reasons `blocked/github_label_mode_not_supported/github_label_target_or_policy_blocked`.
- Proposal `FwXUdmXYQ3up`: `github_label`, multi-label, preview `preview_only`, `executionBlocked=true`, `reviewStatus=blocked`, reasons `blocked/github_label_single_label_required/github_label_target_or_policy_blocked/github_label_target_not_allowlisted`.
- Proposal `y7CNoMfDo3sb`: `github_label`, target fora da allowlist, preview `preview_only`, `executionBlocked=true`, `reviewStatus=blocked`, reasons `blocked/github_label_target_or_policy_blocked/github_label_target_not_allowlisted`.
- Proposal `Z7kq04y9nFok`: `github_status`, preview `preview_only`, `executionBlocked=true`, `reviewStatus=blocked`, reasons `blocked/github_status_check_preview_only`.
- Stats: `previewOnlyBlockedCount=1`, `githubLabelBlockedCount=3`, `githubStatusCheckBlockedCount=1`, `externalMutationAttemptedCount=0`.

## Slice Writeback Adapter Summary v0

Objetivo: consolidar a revisao operacional por adapter sem criar nova rota de mutacao.

Implementado em 2026-05-06:

1. `CompanyBrainWritebackSafetyDashboard.adapterSummaries`.
2. Adapters normalizados:
   - `github_comment`;
   - `github_label`;
   - `github_status_check`;
   - `slack_thread_reply`;
   - `other`.
3. Cada adapter summary expõe:
   - `proposalCount`;
   - `completedCount`;
   - `completedNoopCount`;
   - `mutationAttemptedCount`;
   - `blockedCount`;
   - `readyCount`;
   - `failedCount`;
   - `latestAt`.
4. UI `/company-brain` mostra resumo por adapter no painel Writeback Governance.
5. Nenhuma chamada externa e nenhuma rota de execute nova.

Dogfood read-only validado reaproveitando `/tmp/aios-runtime-writeback-negative-review-dogfood.sqlite`, daemon em `127.0.0.1:43137`:

- `github_label`: `proposalCount=3`, `blockedCount=3`, `completedCount=0`, `completedNoopCount=0`, `mutationAttemptedCount=0`, `failedCount=0`, `latestAt` presente.
- `github_status_check`: `proposalCount=1`, `blockedCount=1`, `completedCount=0`, `completedNoopCount=0`, `mutationAttemptedCount=0`, `failedCount=0`, `latestAt` presente.

## Slice Writeback Audit Trail Export v0

Objetivo: permitir revisao/export read-only do audit trail de writeback por adapter/proposal.

Implementado em 2026-05-06:

1. `WritebackAuditTrailEntry` e `CompanyBrainWritebackAuditTrailResponse` em `packages/shared/src/types.ts`.
2. `CompanyBrainWritebackSafetyDashboard.latestAuditTrail` com os ultimos eventos.
3. API read-only `GET /api/company-brain/external-action-proposals/audit-trail`.
4. Filtros:
   - `adapter=github_comment|github_label|github_status_check|slack_thread_reply|other`;
   - `proposalId=<id>`;
   - `limit=1..250`.
5. MCP tool `list_company_brain_writeback_audit_trail`.
6. UI `/company-brain` mostra `Latest audit trail` no painel Writeback Governance.
7. Cada evento exportado inclui proposal, adapter, destination/action, risk/policy, approval/execution status, idempotency, refs externas, reviewStatus, blockReasons, actor, timestamp, note e metadata.
8. Nenhuma chamada externa e nenhuma rota de execute nova.

Dogfood read-only validado reaproveitando `/tmp/aios-runtime-writeback-negative-review-dogfood.sqlite`, daemon em `127.0.0.1:43138`:

- Summary retornou `latestAuditTrailCount=12`.
- `GET /external-action-proposals/audit-trail?adapter=github_label&limit=20` retornou `total=9`, `adapter=github_label` e todos os items com adapter `github_label`.
- `GET /external-action-proposals/audit-trail?proposalId=I5PGjeflFsRN&limit=10` retornou `total=3`, todos do mesmo proposal e blockReasons `blocked/github_label_mode_not_supported/github_label_target_or_policy_blocked`.

## Slice Writeback HITL Runbook v0

Objetivo: registrar um checklist operacional antes de qualquer novo executor externo.

Implementado em 2026-05-06:

1. Novo documento `docs/writeback-hitl-runbook.md`.
2. Conteudo:
   - superficie executavel atual;
   - checklist preflight;
   - gates obrigatorios para novo executor;
   - dogfood checklist;
   - template de aprovacao HITL;
   - lista de acoes bloqueadas ate nova politica.
3. Nenhum codigo runtime alterado e nenhuma chamada externa.

## Slice Writeback Audit Search/Export v0

Objetivo: ampliar busca/export read-only do audit trail sem tocar em executores externos.

Implementado em 2026-05-06:

1. `GET /api/company-brain/external-action-proposals/audit-trail` agora aceita:
   - `destinationType`;
   - `actionType`;
   - `riskClass`;
   - `executionStatus`;
   - `actor`;
   - `fromAt`/`toAt`;
   - `proposalId`;
   - `guidanceId` ou `guidanceItemId`;
   - `idempotencyKey`;
   - `externalUrl`;
   - `q` ou `search`;
   - `format=csv`.
2. Busca textual inclui proposal ids, guidance id, idempotency key, external refs, actor, event, note e `blockReasons`.
3. `CompanyBrainWritebackSafetyDashboard.destinationSummaries` agrupa por repo GitHub ou canal Slack.
4. UI `/company-brain` mostra os principais destination summaries no painel Writeback Governance.
5. MCP `list_company_brain_writeback_audit_trail` aceita os novos filtros.
6. Nenhuma rota de execute nova e nenhuma chamada externa.

Dogfood read-only validado:

- DB `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43139`: filtro combinado `destinationType=github`, `actionType=github_label`, `riskClass=B`, `executionStatus=completed`, `actor=github-label-executor-dogfood`, `idempotencyKey=github-label-executor`, `externalUrl=crewdock/issues/3`, `search=completed_noop` retornou `total=1`, event `github_label_completed_noop`; CSV por proposal `fx3NheQm3Crv` retornou header e 5 linhas; destination summary `github:antonio-mello-ai/crewdock` retornou `completedCount=1`, `completedNoopCount=1`, `mutationAttemptedCount=0`.
- DB `/tmp/aios-runtime-writeback-negative-review-dogfood.sqlite`, daemon `127.0.0.1:43140`: filtro `adapter=github_status_check`, `executionStatus=dry_run`, `search=preview-only` retornou 3 eventos do adapter; busca por `target_not_allowlisted` retornou proposals de label bloqueadas; destination summary `github:antonio-mello-ai/crewdock` retornou `total=4`, `blocked=4`, `mutation=0`.

## Slice Writeback Evidence Packet v0

Objetivo: gerar um pacote auditavel read-only por proposal, sem executar nenhuma acao externa.

Implementado em 2026-05-06:

1. Tipo `WritebackEvidencePacket`.
2. API `GET /api/company-brain/external-action-proposals/:id/evidence-packet`.
3. MCP tool `get_company_brain_writeback_evidence_packet`.
4. UI `/company-brain` com botao `Evidence` em cada proposal e resumo do pacote carregado.
5. Pacote inclui:
   - proposal completo;
   - guidance item;
   - signal/finding/work item/workflow run ligados;
   - `executionReview`;
   - `auditReview`;
   - audit trail;
   - approval event;
   - preview event;
   - execution event;
   - payload hashes aprovado/preview/atual;
   - destination refs aprovado/preview/atual;
   - idempotency keys aprovado/preview/atual;
   - external id/url/rollback ref;
   - timeline created/approved/preview/execution/updated.
6. Nenhuma rota de execute nova e nenhuma chamada externa.

Dogfood read-only validado em `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43141`, proposal `fx3NheQm3Crv`:

- `hasGuidance=true`.
- `reviewStatus=duplicate_prevented`.
- `auditEvent=github_label_completed_noop`.
- `auditTrailCount=4`.
- Approval event `approved`.
- Preview event `github_label_previewed`.
- Execution event `github_label_completed_noop`.
- Payload hashes aprovado/preview/atual iguais: `c3e689498f5679b96d3dc8a686ebc832213a117a7e10ea7e4056aa40e0e7097d`.
- Destination refs aprovado/preview/atual `antonio-mello-ai/crewdock#3`.
- Idempotency keys aprovado/preview/atual `dogfood:github-label-executor:v0:crewdock-3-enhancement`.
- External URL `https://github.com/antonio-mello-ai/crewdock/issues/3`.
- Timeline completo.

## Slice Operating Loop Metrics v0

Objetivo: medir o loop operacional de writeback sem executar nenhuma acao externa.

Implementado em 2026-05-06:

1. Tipo `WritebackOperatingLoopMetrics`.
2. `CompanyBrainWritebackSafetyDashboard.operatingLoopMetrics` em summary/API/MCP.
3. Metricas derivadas:
   - contagens de pending/approved/blocked/rejected/failed/completed/noop;
   - duplicacoes evitadas;
   - mutacoes externas tentadas;
   - approvals e previews stale;
   - bloqueios preview-only;
   - taxas de blocked/rejected/failed/completed/noop/duplicate/mutation;
   - duracoes medias guidance -> proposal, proposal -> approval, approval -> preview, preview -> execution e proposal -> execution.
4. UI `/company-brain` mostra `Operating loop metrics` dentro de Writeback Governance.
5. Nenhuma rota de execute nova e nenhuma chamada externa.

Dogfood read-only validado:

- DB `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43142`: `proposalCount=1`, `completed=1`, `completedNoop=1`, `duplicatePrevented=1`, `mutationAttempted=0`, `staleApproval=0`, `stalePreview=0`, medias guidance/proposal/approval/preview/execution preenchidas.
- DB `/tmp/aios-runtime-writeback-negative-review-dogfood.sqlite`, daemon `127.0.0.1:43143`: `proposalCount=4`, `blocked=4`, `blocked rate=1`, `previewOnlyBlocked=1`, `failed=0`, `mutationAttempted=0`, medias ate preview preenchidas e execution nulo.

## Slice AIOS Briefing Writeback Safety v0

Objetivo: fazer o briefing interno carregar o estado de seguranca de writeback, sem executar nenhuma acao externa.

Implementado em 2026-05-06:

1. `CompanyBrainBriefingSection.key` aceita `writeback_safety`.
2. `buildBriefingSections` inclui secao `Writeback Safety` com:
   - approvals pendentes;
   - falhas;
   - execucoes externas recentes;
   - duplicacoes evitadas;
   - bloqueios derivados do Safety Dashboard;
   - risk C/unknown;
   - stale approvals/previews;
   - items que precisam preview/reapproval/retry review.
3. `nextSteps` do briefing agora inclui acoes de HITL, retry audit, stale preview/reapproval e bloqueios de safety quando existirem.
4. Artifact `aios_briefing` grava `writebackSafetyStats` e `writebackOperatingLoopMetrics` em metadata.
5. UI `/company-brain` mostra ate 9 secoes do briefing para incluir `writeback_safety`.
6. Nenhuma rota de execute nova e nenhuma chamada externa.

Dogfood read-only validado:

- DB `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43144`: run do `watcher-aios-briefing-v0` gerou artifact `qDkhTUBAlCNK`; secao `writeback_safety` mostrou `1 completed external writes`, `1 duplicates prevented`, `0 mutation attempts` e evento recente `github_label_completed_noop`; metadata trouxe `writebackSafetyStats` e `writebackOperatingLoopMetrics`.
- DB `/tmp/aios-runtime-writeback-negative-review-dogfood.sqlite`, daemon `127.0.0.1:43145`: run do `watcher-aios-briefing-v0` gerou artifact `Vt8B8QIkSdco`; secao `writeback_safety` mostrou `4 blocked by safety`, `0 mutation attempts` e bloqueios `github_status_check_preview_only`, `github_label_target_not_allowlisted`, `github_label_single_label_required` e `github_label_mode_not_supported`; next step manteve os itens fora de execucao.

## Slice Adoption Dashboard Writeback Maturity v0

Objetivo: refletir maturidade de writeback por source/projeto no Adoption Dashboard, sem executar nenhuma acao externa.

Implementado em 2026-05-06:

1. `AdoptionProjectStatus.writebackMaturity`.
2. `WritebackMaturityStage`: `none`, `proposal_created`, `pending_review`, `preview_ready`, `executed_or_noop`, `blocked_or_failed`.
3. Metricas por projeto:
   - proposals;
   - pending/approved;
   - completed/noop;
   - failed/blocked;
   - duplicates prevented;
   - mutation attempts;
   - stale approvals/previews;
   - latest audit timestamp;
   - latest external URL.
4. Novo gap `writeback_needs_review` quando o projeto tem blocked/failed/stale writeback safety.
5. Stats globais no Adoption Dashboard:
   - `writebackProjectCount`;
   - `writebackCompletedProjectCount`;
   - `writebackNeedsReviewProjectCount`;
   - `duplicatePreventedWritebackCount`.
6. UI `/company-brain` mostra stage de writeback, contadores `writeback`, `wb done`, `wb review` e ultimo external URL por projeto.
7. Nenhuma rota de execute nova e nenhuma chamada externa.

Dogfood read-only validado:

- DB `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43146`: Adoption Dashboard retornou `writebackProjectCount=1`, `writebackCompletedProjectCount=1`, `duplicatePreventedWritebackCount=1`; projeto `Felhen Demo v0.1` com stage `executed_or_noop`, `proposalCount=1`, `completedNoopCount=1`, `mutationAttemptedCount=0`, latest URL `https://github.com/antonio-mello-ai/crewdock/issues/3`.
- DB `/tmp/aios-runtime-writeback-negative-review-dogfood.sqlite`, daemon `127.0.0.1:43147`: Adoption Dashboard retornou `writebackProjectCount=1`, `writebackNeedsReviewProjectCount=1`; projeto `Felhen Demo v0.1` com stage `blocked_or_failed`, `proposalCount=4`, `blockedCount=4`, `mutationAttemptedCount=0`, gap `writeback_needs_review`.

## Slice Writeback Audit UI Filters/Export v0

Objetivo: expor na UI os filtros/export read-only ja existentes para audit trail.

Implementado em 2026-05-06:

1. Hook `useCompanyBrainWritebackAuditTrail`.
2. Helper `companyBrainWritebackAuditTrailCsvUrl`.
3. UI `/company-brain` substitui `Latest audit trail` por `Audit trail search/export`.
4. Filtros na UI:
   - search;
   - adapter;
   - destinationType;
   - actionType;
   - riskClass;
   - executionStatus;
   - actor;
   - proposalId;
   - guidanceId;
   - idempotencyKey;
   - externalUrl;
   - from/to date;
   - limit.
5. Link `Export CSV` usa o endpoint read-only `format=csv`.
6. Nenhuma rota nova de execute e nenhuma chamada externa.

Dogfood read-only validado em `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43148`:

- Filtro combinado `adapter=github_label`, `destinationType=github`, `actionType=github_label`, `riskClass=B`, `executionStatus=completed`, `idempotencyKey=github-label-executor`, `externalUrl=crewdock/issues/3`, `search=completed_noop`, `limit=8` retornou `total=1` e event `github_label_completed_noop`.
- Export CSV por proposal `fx3NheQm3Crv` retornou header com colunas de audit trail e linhas de eventos.

## Slice Writeback Evidence Packet JSON Export v0

Objetivo: permitir baixar/compartilhar o pacote auditavel por proposal como JSON read-only.

Implementado em 2026-05-06:

1. `GET /api/company-brain/external-action-proposals/:id/evidence-packet?download=1` retorna JSON formatado do packet.
2. Response inclui `Content-Disposition: attachment; filename=aios-writeback-evidence-<proposalId>.json`.
3. UI `/company-brain` adiciona link `JSON` por proposal.
4. UI adiciona `Export evidence JSON` no resumo do packet carregado.
5. Nenhuma rota nova de execute e nenhuma chamada externa.

Dogfood read-only validado em `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43149`, proposal `fx3NheQm3Crv`:

- Header `Content-Disposition` retornou `attachment; filename=aios-writeback-evidence-fx3NheQm3Crv.json`.
- JSON parseavel com `proposal.id=fx3NheQm3Crv`.
- `executionReview.status=duplicate_prevented`.
- `auditTrail.length=4`.
- `payloadHashes.current=c3e689498f5679b96d3dc8a686ebc832213a117a7e10ea7e4056aa40e0e7097d`.
- `externalRefs.externalUrl=https://github.com/antonio-mello-ai/crewdock/issues/3`.

## Slice Writeback Evidence Packet Index v0

Objetivo: listar rapidamente quais proposals ja tem evidence packet exportavel e qual e o estado de auditoria.

Implementado em 2026-05-06:

1. Tipo `WritebackEvidencePacketIndexItem`.
2. `CompanyBrainWritebackSafetyDashboard.evidencePacketIndex`.
3. Cada item inclui:
   - proposal id/title;
   - destination/action/risk;
   - approval/execution/review status;
   - audit event count;
   - latest audit timestamp;
   - flags `hasGuidance`, `hasSignal`, `hasFinding`, `hasWorkItem`, `hasWorkflowRun`;
   - payload hash atual;
   - external URL;
   - export path JSON;
   - updatedAt.
4. UI `/company-brain` mostra `Evidence packet index` com status, audit count, links presentes, hash e link JSON.
5. Nenhuma rota nova de execute e nenhuma chamada externa.

Dogfood read-only validado em `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43150`, proposal `fx3NheQm3Crv`:

- `evidencePacketIndex.length=1`.
- `reviewStatus=duplicate_prevented`.
- `auditEventCount=4`.
- `hasGuidance=true`, `hasSignal=true`, `hasFinding=true`, `hasWorkItem=true`, `hasWorkflowRun=true`.
- `payloadHashCurrent=c3e689498f5679b96d3dc8a686ebc832213a117a7e10ea7e4056aa40e0e7097d`.
- `externalUrl=https://github.com/antonio-mello-ai/crewdock/issues/3`.
- `exportPath=/api/company-brain/external-action-proposals/fx3NheQm3Crv/evidence-packet?download=1`.

## Slice Writeback Evidence Integrity Gaps v0

Objetivo: analisar evidence packets e proposals de forma read-only para tornar explicitos gaps de links, audit trail, hashes, idempotency, refs externas, stale review, rationale e provenance antes de expandir executores.

Implementado em 2026-05-06:

1. Tipos novos para `WritebackEvidenceIntegrityGap`, `WritebackEvidenceIntegritySummary` e response de gaps.
2. `WritebackEvidencePacket` inclui `integrityGaps`.
3. `evidencePacketIndex` inclui `integrityGapCount`, `integrityGapSeverity` e `integrityGapKinds`.
4. Safety Dashboard inclui `evidenceIntegrityGaps` e `evidenceIntegritySummary`.
5. Gaps detectados:
   - `missing_guidance_link`;
   - `missing_signal_or_finding_link`;
   - `missing_work_item_or_workflow_link`;
   - `missing_approval_event`;
   - `missing_preview_event`;
   - `missing_execution_event`;
   - `missing_payload_hash`;
   - `missing_idempotency_key`;
   - `missing_external_ref_after_completed`;
   - `stale_preview`;
   - `stale_approval`;
   - `insufficient_rationale`;
   - `incomplete_provenance`.
6. API `GET /api/company-brain/external-action-proposals/evidence-integrity-gaps`.
7. Filtros por `severity`, `kind/gapType`, `adapter`, `proposalId` e `limit`.
8. MCP tool `list_company_brain_writeback_evidence_integrity_gaps`.
9. UI `/company-brain` mostra painel `Evidence integrity gaps`, filtros e badges no evidence packet index/packet carregado.
10. AIOS Briefing `writeback_safety` inclui contadores de evidence integrity gaps e next step quando ha gaps.
11. `docs/writeback-policy-matrix.md` foi atualizado para refletir a politica de GitHub interno privado allowlisted: status/check, assign/unassign e mark-notification-read podem ser Classe B planejada sob allowlist/gates, mas sem executor real neste corte.
12. Nenhuma mutacao externa nova foi adicionada.

Dogfood read-only validado:

- DB bom `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43151`, proposal `fx3NheQm3Crv`: Safety Dashboard retornou `evidenceIntegritySummary.total=0`; evidence packet JSON retornou `integrityGaps=[]`; index manteve `hasGuidance=true`, `hasSignal=true`, `hasFinding=true`, `hasWorkItem=true`, `hasWorkflowRun=true`.
- DB negativo existente `/tmp/aios-runtime-writeback-negative-review-dogfood.sqlite`, daemon `127.0.0.1:43152`: proposals bloqueadas de policy estavam completas do ponto de vista de integridade, retornando `evidenceIntegritySummary.total=0`.
- DB especifico `/tmp/aios-runtime-evidence-integrity-gaps-dogfood.sqlite`, daemon `127.0.0.1:43153`: proposal `J-IH-nLDh83B` gerou 12 gaps, incluindo missing guidance, missing signal/finding, missing work/workflow, missing approval/preview/execution events, missing payload hash, missing idempotency key, missing external ref after completed, stale approval, insufficient rationale e incomplete provenance.
- No mesmo DB, proposal `kcQMiZsMf0RQ` gerou `stale_preview` alem de links ausentes.
- Endpoint de gaps retornou `total=15`, `criticalCount=6`, `warnCount=9`, cobrindo todos os 13 tipos.
- Filtro `kind=stale_preview` retornou apenas `kcQMiZsMf0RQ`.
- Evidence packet JSON de `J-IH-nLDh83B` incluiu `integrityGaps` com os tipos esperados.
- Run do `watcher-aios-briefing-v0` gerou artifact `Oz4A41Psq9qj`; secao `writeback_safety` mostrou `15 evidence integrity gaps; 6 critical; 9 warn` e next step `Review 15 writeback evidence integrity gaps before expanding executors.`

## Slice Evidence Remediation Suggestions v0

Objetivo: transformar gaps de integridade em sugestoes read-only de remediacao, sem alterar proposals, sem backfill automatico e sem executar mutacao externa.

Implementado em 2026-05-06:

1. Tipos novos para `WritebackEvidenceRemediationSuggestion`, `WritebackEvidenceRemediationSummary` e response de suggestions.
2. Cada gap gera uma sugestao com:
   - `actionKind`;
   - `targetField`;
   - `suggestedAction`;
   - `requiresHumanReview`;
   - `requiresNewProposal`;
   - `actionPolicy=observe_only`;
   - `executionBlocked=true`.
3. Action kinds:
   - `relink_guidance`;
   - `link_signal_or_finding`;
   - `link_work_or_workflow`;
   - `rerun_hitl_approval`;
   - `rerun_preview`;
   - `review_execution_audit`;
   - `capture_payload_hash`;
   - `create_new_proposal_with_idempotency`;
   - `attach_external_ref`;
   - `refresh_stale_review`;
   - `capture_human_rationale`;
   - `repair_provenance`.
4. `WritebackEvidencePacket` inclui `remediationSuggestions`.
5. Safety Dashboard inclui `evidenceRemediationSuggestions` e `evidenceRemediationSummary`.
6. API `GET /api/company-brain/external-action-proposals/evidence-remediation-suggestions`.
7. Filtros por `severity`, `gapKind`, `actionKind`, `adapter`, `proposalId` e `limit`.
8. MCP tool `list_company_brain_writeback_evidence_remediation_suggestions`.
9. UI `/company-brain` mostra painel `Evidence remediation suggestions` com filtros e metricas `human review`/`new proposal`.
10. AIOS Briefing `writeback_safety` inclui contadores de sugestoes e metadata `writebackEvidenceRemediationSummary`.
11. Nenhuma mutacao externa ou interna automatica foi adicionada.

Dogfood read-only validado:

- DB `/tmp/aios-runtime-evidence-integrity-gaps-dogfood.sqlite`, daemon `127.0.0.1:43154`: endpoint de suggestions retornou `total=15`, `criticalCount=6`, `warnCount=9`, `humanReviewCount=13`, `newProposalCount=4`.
- Filtro `actionKind=rerun_preview` retornou 2 sugestoes: uma para `missing_preview_event` de `J-IH-nLDh83B` e outra para `stale_preview` de `kcQMiZsMf0RQ`.
- Filtro `proposalId=J-IH-nLDh83B` retornou 12 sugestoes.
- Safety Dashboard passou a expor `evidenceRemediationSummary` e `evidenceRemediationSuggestions`.
- Evidence packet JSON de `J-IH-nLDh83B` incluiu `remediationSuggestions` com `requiresNewProposal=true` para guidance/approval/execution/idempotency.
- Run do `watcher-aios-briefing-v0` gerou artifact `7pCuBBPaG-oT`; secao `writeback_safety` mostrou `15 remediation suggestions; 13 need human review; 4 suggest new proposal` e next step `Use 15 read-only remediation suggestions to repair evidence packets.`
- DB bom `/tmp/aios-runtime-github-label-executor-dogfood.sqlite`, daemon `127.0.0.1:43155`: endpoint de suggestions retornou `total=0`, mantendo `fx3NheQm3Crv` sem gaps ou sugestoes.

## Slice GitHub Status Executor v0

Objetivo: permitir o primeiro writeback real de feedback operacional em commit GitHub, mantendo o corte estrito em repo privado interno allowlisted e sem check-run real.

Implementado em 2026-05-06:

1. `github_status` deixou de ser apenas preview-only quando o proposal esta aprovado, `riskClass=B`, `actionPolicy=writeback_allowed`, tem SHA explicito, contexto `aios/dogfood-status`, state `success` e passa na allowlist `AIOS_GITHUB_STATUS_WRITEBACK_ALLOWLIST`.
2. `github_check` continua preview-only e sem endpoint de execute.
3. Allowlist default do corte: `antonio-mello-ai/felhen@b9e1057f44988555227ae8031cd48325fb6efc71=aios/dogfood-status:success`.
4. Preview `POST /api/company-brain/external-action-proposals/:id/github-status-check/preview` retorna `dry_run` e `executionBlocked=false` apenas para status allowlisted; demais status/check retornam preview-only/bloqueado.
5. Novo execute `POST /api/company-brain/external-action-proposals/:id/github-status-check/execute` executa somente `github_status`.
6. Executor exige HITL actor/rationale, preview apos aprovacao, Retry Safety `ready_to_execute`, idempotencyKey, repo privado, SHA explicito, context/state allowlisted.
7. Antes de POST, le repo e commit statuses atuais. Se ja existir status compativel, grava `github_status_completed_noop`, `completed_noop` e nao chama write API.
8. Em write real, cria commit status e grava `github_status_set`, `executionStatus=completed`, `externalId`, `externalUrl`, payloadHash, idempotencyKey, actor, target, response resumida e repoPrivate no audit trail.
9. Reexecute de proposal concluida retorna `already_completed` sem nova chamada externa.
10. Safety Dashboard/Evidence Packet/Audit Search reconhecem `github_status_set` e `github_status_completed_noop` como execution events; stats adicionam `githubStatusWriteCount` e `githubStatusNoopCount`; UI mostra preview/execute de status e contador de statuses.
11. MCP adiciona `execute_company_brain_github_status_writeback`; preview MCP foi atualizado para explicar que commit status allowlisted pode ser executavel e check-run continua bloqueado.
12. `docs/writeback-policy-matrix.md` e `docs/writeback-hitl-runbook.md` foram atualizados para separar `github_status` allowlisted de `github_check` preview-only.

Dogfood real validado em DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43146`, usando token do `gh` somente no ambiente do daemon:

- Alvo aprovado conferido como privado: `antonio-mello-ai/felhen`, branch `main`, SHA `b9e1057f44988555227ae8031cd48325fb6efc71`.
- Proposal: `35xo7wHd9CBV`, idempotency `dogfood:github-status-executor:v0:felhen-main-b9e1057`.
- Preview retornou `status=dry_run`, `executionBlocked=false`, payloadHash `6737a218dba45d17e183f92ede73276af44a215f00a7e1444ac32558bc3de48f`.
- Execute criou status GitHub real `id=47036420104`, context `aios/dogfood-status`, state `success`, target URL `https://github.com/antonio-mello-ai/felhen/commit/b9e1057f44988555227ae8031cd48325fb6efc71`.
- Reexecute retornou `already_completed`, `mutationAttempted=false`, preservando `externalId=47036420104` e sem nova mutacao.
- Evidence packet de `35xo7wHd9CBV` retornou `executionReview=completed`, `executionEvent=github_status_set`, `integrityGapCount=0`, `remediationCount=0`.
- Safety Dashboard mostrou `completedExternalWriteCount=1`, `externalMutationAttemptedCount=1`, `githubStatusWriteCount=1`, `githubStatusCheckBlockedCount=0`, `blockReasons=[]` para o proposal.

Proximo corte recomendado: melhorias read-only/audit/export/observability para status writeback e evidence packets. Parar antes de qualquer nova mutacao externa, novo alvo, check-run real, assign/unassign, notification-read, close/reopen, merge, deploy ou repo/canal publico.

## Slice Writeback Target Summary v0

Objetivo: melhorar observability read-only de writeback, especialmente status/check, sem nova mutacao externa.

Implementado em 2026-05-06:

1. `WritebackAuditReview` agora inclui `targetSummary` derivado.
2. `WritebackEvidencePacketIndexItem` tambem inclui `targetSummary`.
3. Para `github_status/github_check`, o resumo usa `repo | sha curto ou PR | context/name | state/conclusion`.
4. Para label/comment/thread, o resumo usa destino normalizado e action principal.
5. UI `/company-brain` mostra o target summary no Evidence Packet Index e no card de Evidence Packet carregado.
6. API/summary/MCP recebem o campo por meio das estruturas existentes, sem nova rota e sem chamada externa.

Dogfood read-only validado no DB temporario do status executor `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43147`:

- Safety Dashboard para proposal `35xo7wHd9CBV`: `targetSummary=antonio-mello-ai/felhen | b9e1057f4498 | aios/dogfood-status | success`, `executionEvent=github_status_set`, `mutationAttempted=true`.
- Evidence Packet de `35xo7wHd9CBV`: mesmo `targetSummary`, `executionReview=completed`, `gaps=0`.
- Summary/Evidence Packet Index de `35xo7wHd9CBV`: `targetSummary` presente, `reviewStatus=completed`, `externalUrl` preservada.

## Slice GitHub Status Writeback Observability v0

Objetivo: endurecer observability e evidence read-only para o status writeback real ja executado, sem nova mutacao externa.

Implementado em 2026-05-06:

1. Audit Trail API ganhou filtro explicito `event`, permitindo consultar `github_status_set`, `github_status_completed_noop`, `github_status_failed` e outros eventos.
2. `WritebackAuditTrailEntry` agora inclui `targetSummary` e `githubStatus` normalizado.
3. `githubStatus` inclui repo, SHA, shortSha, context, state, statusId, statusUrl, externalUrl, repoPrivate, allowlistMatched, existingStatusesRead, existingStatusesReadCount, duplicateDetected, completedNoop, mutationAttempted e response resumida.
4. CSV de audit trail inclui `targetSummary` e `githubStatus`.
5. Evidence Packet inclui `githubStatus` normalizado alem dos eventos `approvalEvent`, `previewEvent`, `executionEvent`, hashes e idempotency ja existentes.
6. Safety Dashboard/UI separa contadores de GitHub comments, GitHub labels, GitHub statuses e Slack thread replies.
7. UI de audit trail adiciona filtro por evento e mostra alvo/status id/repo private nos eventos de status.
8. UI de evidence packet mostra approval/preview/execution events e status id/context/state/repo private.
9. AIOS briefing agora considera `github_status_set` como execucao recente e mostra o target summary do status writeback.
10. Executor de status passa a gravar, para execucoes futuras, `allowlistMatched=true`, `existingStatusesRead=true`, `existingStatusesReadCount` e `duplicateDetected` no response auditado.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43149`:

- Audit Trail com `event=github_status_set` retornou `total=1`, proposal `35xo7wHd9CBV`, `externalId=47036420104`, `targetSummary=antonio-mello-ai/felhen | b9e1057f4498 | aios/dogfood-status | success`.
- `githubStatus` no audit trail mostrou `repoPrivate=true`, `allowlistMatched=true`, `existingStatusesRead=true`, `duplicateDetected=false`, `completedNoop=false`, `mutationAttempted=true`.
- CSV com `event=github_status_set` exportou colunas `targetSummary` e `githubStatus`.
- Evidence Packet de `35xo7wHd9CBV` retornou `approval=approved`, `preview=github_status_check_previewed`, `execution=github_status_set`, payloadHash `6737a218dba45d17e183f92ede73276af44a215f00a7e1444ac32558bc3de48f`, idempotency `dogfood:github-status-executor:v0:felhen-main-b9e1057` e status id `47036420104`.
- Busca textual por `47036420104` retornou eventos do proposal com `targetSummary` e `githubStatus.statusId`.
- Briefing `writeback_safety` passou a incluir `recent: Dogfood GitHub commit status executor v0 [github_status_set] - antonio-mello-ai/felhen | b9e1057f4498 | aios/dogfood-status | success`.

## Slice Writeback Target Observability v0

Objetivo: consolidar observability read-only por target/projeto, sem criar novo executor ou acionar mutacao externa.

Implementado em 2026-05-06:

1. `CompanyBrainWritebackSafetyDashboard` ganhou `targetObservabilitySummaries`.
2. Cada target agrega `targetKey`, `targetType`, `targetLabel`, `destinationType`, `repoPrivate`, contagens de proposals, completed, noop, failed, blocked, mutationAttempted, duplicateAvoided, staleApproval, stalePreview e needsReview.
3. Cada target tambem inclui `adapters`, `executionStatuses`, `reviewStatuses`, `latestAt`, `latestExternalUrl` e `latestTargetSummary`.
4. Agrupamento GitHub prioriza repo parseado de issue/PR ou payload/status evidence; Slack agrupa por channelId; fallback preserva destinationRef bruto.
5. Safety Dashboard/UI ganhou bloco `Target observability` com repo/canal/alvo, tipo, private/public, contagens, adapters e ultimo target summary.
6. AIOS briefing `writeback_safety` passou a listar targets principais com completed/proposal count, needs_review e stale totals.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43150`:

- `writeback-safety-dashboard.targetObservabilitySummaries[0]` retornou `targetLabel=antonio-mello-ai/felhen`, `targetType=github_repo`, `repoPrivate=true`, `proposalCount=1`, `completedCount=1`, `mutationAttemptedCount=1`, `needsReviewCount=0`.
- Adapter rollup retornou `{ github_status_check: 1 }`, `executionStatuses.completed=1`, `reviewStatuses.completed=1`.
- `latestTargetSummary=antonio-mello-ai/felhen | b9e1057f4498 | aios/dogfood-status | success`.
- Briefing watcher `watcher-aios-briefing-v0` gerou artifact `-3lQVCawvbXW` no run `gbBIjJ28LpxE` com item `target: antonio-mello-ai/felhen [1/1 completed] - needs_review=0; stale=0`.

## Slice Writeback Proposal/Target Review v0

Objetivo: consolidar pacotes de auditoria/evidence em uma visao read-only por proposal/target, sem executor novo e sem mutacao externa.

Implementado em 2026-05-06:

1. Summary ganhou `writebackProposalTargetReview`.
2. API read-only `/api/company-brain/external-action-proposals/proposal-target-review` com filtros `proposalId`, `targetKey`, `destinationType`, `actionType`, `riskClass`, `reviewStatus` e `limit`.
3. MCP ganhou `list_company_brain_writeback_proposal_target_review`.
4. Cada item consolida proposal, target rollup, `reviewStatus`, `reviewFlags`, `blockReasons`, hash comparisons, destination ref comparisons, approval/preview/execution events, evidence completeness, remediation count, `githubStatus`, idempotency e next action.
5. UI ganhou bloco `Proposal/target review` no Writeback Governance.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43151`:

- Endpoint retornou `total=1`, `proposalId=35xo7wHd9CBV`, `targetKey=github:antonio-mello-ai/felhen`, `reviewStatus=completed`.
- Hashes `approved`, `preview` e `current` bateram em `6737a218dba45d17e183f92ede73276af44a215f00a7e1444ac32558bc3de48f`.
- Eventos retornaram `approval=approved`, `preview=github_status_check_previewed`, `execution=github_status_set`, actor `Antonio`.
- Evidence completeness retornou guidance, signal, finding, work item e workflow run ligados, com `integrityGapCount=0` e `remediationSuggestionCount=0`.
- Filtro `targetKey=github:antonio-mello-ai/felhen&reviewStatus=completed` retornou o mesmo proposal.
- Summary expos `writebackProposalTargetReview.items[0]=35xo7wHd9CBV` e `targetCount=1`.

## Slice Evidence/Provenance Graph v0

Objetivo: expor grafo read-only de evidence/provenance conectando source, artifact, signal, finding, guidance, work, workflow, proposal e target.

Implementado em 2026-05-06:

1. Summary ganhou `evidenceGraph`.
2. API read-only `/api/company-brain/evidence-graph` ganhou filtros `rootKind`, `rootId` e `limit`.
3. MCP ganhou `get_company_brain_evidence_graph`.
4. Nós cobrem `source`, `artifact`, `priority`, `goal`, `work_item`, `workflow_run`, `signal`, `alignment_finding`, `guidance_item`, `external_action_proposal` e `writeback_target`.
5. Arestas cobrem source->artifact, priority/goal->work, artifact/work/workflow->signal, signal/artifact/work/workflow/goal/priority->finding, finding/signal/work/workflow/goal/priority->guidance, guidance/signal/finding/work/workflow->proposal, proposal->writeback target e `ArtifactLink`.
6. UI ganhou bloco `Evidence graph` com contadores e amostra de arestas no Writeback Governance.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43152`:

- Grafo completo com `limit=100` retornou `nodeCount=17`, `edgeCount=36`, `sourceCount=2`, `artifactCount=6`, `proposalCount=1`, `targetCount=1`, `orphanNodeCount=0`.
- Recorte `rootKind=external_action_proposal&rootId=35xo7wHd9CBV` retornou 7 nós: proposal, target GitHub, guidance, work item, workflow run, signal e alignment finding.
- O recorte retornou arestas `guidance_proposal`, `signal_proposal`, `finding_proposal`, `work_proposal`, `workflow_proposal`, `proposal_writeback_target`, alem das arestas de signal/finding/guidance/workflow.
- Summary confirmou presença de `external_action_proposal:35xo7wHd9CBV` e `writeback_target:github:antonio-mello-ai/felhen`.

## Slice Company Brain Timeline v0

Objetivo: expor timeline read-only por proposal, target ou source para auditoria temporal de evidence/provenance/writeback.

Implementado em 2026-05-06:

1. Summary ganhou `timeline`.
2. API read-only `/api/company-brain/timeline` ganhou escopos `all`, `proposal`, `target` e `source`, com `id` e `limit`.
3. MCP ganhou `get_company_brain_timeline`.
4. Eventos cobrem source created/synced, artifact ingested, watcher run, work item created, workflow started/finished, signal created, alignment finding created, guidance created/feedback, proposal created e audit events de approval/preview/execution.
5. Timeline deduplica `proposal_created` quando o audit trail ja tem esse evento e a timeline tambem gera o evento estrutural.
6. UI ganhou bloco `Timeline` no Writeback Governance com eventos recentes, entity kind, status, target/source e ator.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43153`:

- `scope=proposal&id=35xo7wHd9CBV` retornou 10 eventos: `github_status_set`, `github_status_check_previewed`, `approved`, `proposal_created`, `guidance_feedback`, `work_item_created`, `workflow_run_started`, `signal_created`, `alignment_finding_created`, `guidance_created`.
- `externalWriteEventCount=1` e primeiro evento `github_status_set`.
- `scope=target&id=github:antonio-mello-ai/felhen` retornou os mesmos 10 eventos do target, sem duplicar `proposal_created`.
- Summary retornou timeline global com eventos de source/proposal/target/source e latest event de source sync.

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

Objetivo da sessao: continuar apos GitHub Comment Writeback v0, Slack Thread Reply Writeback v0, Writeback Safety Dashboard v0, Writeback Preview Gate v0, Writeback HITL Rationale v0, Retry Safety / Idempotent Execution Review v0, Writeback Policy Matrix v0, GitHub Label Proposal v0 preview-only, GitHub Status/Check Proposal v0 preview-only, Writeback Audit Review v0, GitHub Label Executor v0, Post-Writeback Audit Review v0, Writeback Negative-Path Review v0, Writeback Adapter Summary v0, Writeback Audit Trail Export v0, Writeback HITL Runbook v0, Writeback Audit Search/Export v0, Writeback Evidence Packet v0, Operating Loop Metrics v0, AIOS Briefing Writeback Safety v0, Adoption Dashboard Writeback Maturity v0, Writeback Audit UI Filters/Export v0, Writeback Evidence Packet JSON Export v0, Writeback Evidence Packet Index v0, Writeback Evidence Integrity Gaps v0, Evidence Remediation Suggestions v0, GitHub Status Executor v0, Writeback Target Summary v0, GitHub Status Writeback Observability v0, Writeback Target Observability v0, Writeback Proposal/Target Review v0, Evidence/Provenance Graph v0 e Company Brain Timeline v0. O proximo corte recomendado e saved audit views v0 para filtros persistidos/read-only de audit trail, proposal/target review, graph e timeline; depois policy simulator/preview replay. Pare antes de novo executor real, novo alvo externo, check-run real, assign/unassign, notification-read, close/reopen, merge, deploy, repo/canal publico ou qualquer writeback que nao esteja em GitHub interno privado allowlisted com approval, preview, HITL rationale, retry safety, idempotency e audit trail.

Antes de editar, confirme git status, commit atual, schema atual, rotas atuais e leia o `corp` atual. Depois implemente um corte pequeno e validavel:
- preservar provenance, status, human review, idempotency e audit trail;
- expor em API/UI/MCP ou summary quando fizer sentido;
- manter close/reopen/merge/deploy/delete/permissions/secrets/customer repos/Slack top-level/DM bloqueados sem novo escopo explicito;
- qualquer writeback novo deve passar por action_policy, risk_class, HITL, dry-run, idempotency e audit trail.

Nao mover logica de verticais para o core. ERP e Juntos em Sala entram como fontes/dogfood/adapters, nao como schema do runtime.

Validar com build/testes relevantes e documentar qualquer residual em docs/backlog.md ou nova nota de handoff.
```
