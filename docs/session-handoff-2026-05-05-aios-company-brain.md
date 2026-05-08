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

## Slice Saved Audit Views v0

Objetivo: criar presets read-only de auditoria para reduzir friccao de revisao sem persistir estado mutavel ou introduzir CRUD.

Implementado em 2026-05-06:

1. Summary ganhou `savedAuditViews`.
2. API read-only `/api/company-brain/saved-audit-views` gera views derivadas em runtime.
3. MCP ganhou `get_company_brain_saved_audit_views`.
4. Views cobrem `audit_trail`, `proposal_target_review`, `evidence_graph` e `timeline`.
5. Cada view traz `id`, `title`, `surface`, `description`, `filters`, `itemCount`, `exportUrl`, `reviewPriority` e `updatedAt`.
6. UI ganhou bloco `Saved audit views` com links para export/JSON/CSV via daemon URL.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43154`:

- Endpoint retornou 6 views: `source-timeline:source-aios-briefing-v0`, `writeback-status-executions`, `proposal-target-review-needs-review`, `target-timeline:github:antonio-mello-ai/felhen`, `proposal-graph:35xo7wHd9CBV` e `failed-writebacks`.
- Stats: `viewCount=6`, `criticalCount=0`, `warnCount=0`, `auditTrailViewCount=2`, `proposalReviewViewCount=1`, `graphViewCount=1`, `timelineViewCount=2`.
- View `writeback-status-executions` apontou para `/api/company-brain/external-action-proposals/audit-trail?event=github_status_set&format=csv&limit=50` e o CSV retornou header valido com `targetSummary` e `githubStatus`.
- Summary expos os mesmos stats em `savedAuditViews`.

## Slice Writeback Policy Simulator v0

Objetivo: simular policy/risk/action combinations sem criar proposal, sem preview real e sem executar writeback.

Implementado em 2026-05-06:

1. Summary ganhou `writebackPolicySimulator`.
2. API read-only `/api/company-brain/writeback-policy-simulator` aceita opcionalmente `destinationType`, `actionType`, `riskClass` e `actionPolicy` para inserir um caso custom no topo da matriz.
3. MCP ganhou `simulate_company_brain_writeback_policy`.
4. Matriz padrao cobre GitHub comment, GitHub label add, GitHub commit status, GitHub check-run preview-only, Slack thread reply e Risk C blocked.
5. Cada caso retorna resultado de policy, `executionBlocked`, `previewOnly`, `realExecutorAvailable`, required gates, blocked actions e rationale.
6. UI ganhou bloco `Policy simulator` no Writeback Governance.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43155`:

- Matriz padrao retornou `caseCount=6`, `executableCaseCount=4`, `previewOnlyCaseCount=1`, `blockedCaseCount=2`, `humanApprovalRequiredCount=6`.
- Casos executaveis: GitHub comment, GitHub label add, GitHub commit status e Slack thread reply, todos com gates de approval, HITL rationale, preview after approval, payload hash, destination ref, idempotency e audit trail.
- Caso custom `destinationType=github&actionType=github_check&riskClass=B&actionPolicy=request_human` retornou `previewOnly=true`, `executionBlocked=true`, `realExecutorAvailable=false`, blocked action `real_check_run_creation`.
- Risk C ficou blocked, sem abrir mutacao real.

## Slice Preview/Replay Simulator v0

Objetivo: analisar replay/idempotency/dry-run safety de proposals existentes, sem chamar write APIs e sem gravar audit trail.

Implementado em 2026-05-06:

1. Summary ganhou `previewReplaySimulator`.
2. API read-only `/api/company-brain/external-action-proposals/preview-replay-simulator` lista proposals existentes com preview local puro.
3. MCP ganhou `get_company_brain_preview_replay_simulator`.
4. Cada item traz status de preview, payload hash, idempotency key, terminal state, duplicate/noop flags, automatic write retry policy, retry rationale requirement, external refs e reason.
5. UI ganhou bloco `Preview/replay simulator` no Writeback Governance.
6. O simulador usa builders locais de preview e nao chama GitHub/Slack write APIs nem append audit events.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43156`:

- Stats: `proposalCount=1`, `previewAvailableCount=1`, `previewBlockedCount=0`, `terminalStateCount=1`, `safeToExecuteWithoutNewApprovalCount=0`.
- Proposal `35xo7wHd9CBV` retornou `preview.status=dry_run`, `executionBlocked=false`, `mutationAttempted=false`, payloadHash `6737a218dba45d17e183f92ede73276af44a215f00a7e1444ac32558bc3de48f`.
- Replay retornou `terminalState=true`, `safeToExecuteWithoutNewApproval=false`, `automaticWriteRetryAllowed=false` e reason `Terminal or externally completed proposal; do not replay write execution.`
- External refs preservados: `externalId=47036420104` e externalUrl do commit `b9e1057...`.

## Slice Markdown Evidence Packet Export v0

Objetivo: permitir export humano/auditavel do evidence packet completo em Markdown, mantendo o endpoint read-only e sem qualquer nova mutacao externa.

Implementado em 2026-05-06:

1. Endpoint `GET /api/company-brain/external-action-proposals/:id/evidence-packet` aceita `format=markdown` ou `markdown=1`.
2. A resposta Markdown usa `Content-Type: text/markdown; charset=utf-8` e `Content-Disposition` com filename `aios-writeback-evidence-<proposalId>.md`.
3. O export inclui proposta, risk/policy/status, target, payload hashes, destination refs, external refs, approval/preview/execution events, evidence links, integrity gaps, remediation suggestions, GitHub status evidence e audit trail.
4. UI `/company-brain` adiciona link `Export Markdown` no packet carregado, ao lado do export JSON existente.
5. Export JSON existente com `download=1` foi preservado.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43157`:

- Proposal `35xo7wHd9CBV` retornou Markdown 200 OK com `content-type: text/markdown; charset=utf-8`.
- Header `content-disposition` retornou `attachment; filename=aios-writeback-evidence-35xo7wHd9CBV.md`.
- Markdown incluiu `External ID: 47036420104`, payload hash `6737a218dba45d17e183f92ede73276af44a215f00a7e1444ac32558bc3de48f` e eventos `approved`, `github_status_check_previewed` e `github_status_set`.
- Secao `GitHub Status` preservou repo `antonio-mello-ai/felhen`, SHA `b9e1057f44988555227ae8031cd48325fb6efc71`, context `aios/dogfood-status`, state `success`, `repoPrivate=true` e status id `47036420104`.
- Porta do daemon foi encerrada apos o teste e nao restou listener em `43157`.

## Slice AIOS Briefing Audit/Readiness v0

Objetivo: transformar o AIOS Briefing em pulso operacional de audit/readiness, nao apenas resumo de entidades.

Implementado em 2026-05-06:

1. Tipos e parser de briefing aceitam as secoes `audit_readiness` e `execution_readiness`.
2. `buildBriefingSections` consolida proposal/target review, evidence graph, timeline, saved audit views, policy simulator e preview/replay simulator.
3. `audit_readiness` mostra proposals/targets, items que precisam review, bloqueios, integrity gaps, tamanho do evidence graph, timeline de audit e saved views priorizadas.
4. `execution_readiness` mostra casos executaveis/preview-only/bloqueados da policy, coverage de preview/replay, estados terminais, protecoes de duplicacao e retries que precisam rationale.
5. Metadata do artifact de briefing agora grava stats de proposal/target review, evidence graph, timeline, saved audit views, policy simulator e preview/replay.
6. UI `/company-brain` removeu o limite fixo de nove secoes e passa a mostrar todas as secoes do briefing.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43158`:

- Watcher `watcher-aios-briefing-v0` gerou run `svOgSHd3ekI4` e artifact `GOgYJWxbnDDm`.
- Summary retornou secoes `audit_readiness` e `execution_readiness` junto das secoes existentes.
- `audit_readiness` mostrou `1 proposals across 1 targets`, `17 evidence graph nodes`, `25 timeline events` e `6 saved audit views`.
- `execution_readiness` mostrou `4 executable policy cases`, `1 preview-only`, `2 blocked`, `1/1 proposals have local preview simulators` e replay terminal bloqueado para proposal completada.
- Porta do daemon foi encerrada apos o teste e nao restou listener em `43158`.

## Slice Adoption Dashboard Audit Maturity v0

Objetivo: fazer o Adoption Dashboard refletir maturidade auditavel por projeto/source, conectando closed loop, writeback maturity e evidence/readiness sem criar nenhuma mutacao externa.

Implementado em 2026-05-06:

1. `AdoptionProjectStatus` ganhou `auditReadiness` com stage, score, target count, proposal review needs action, evidence integrity gaps, remediation suggestions, evidence graph/timeline coverage, preview/replay blockers, retry rationale, latest audit e next action.
2. `AdoptionGapKind` ganhou `audit_readiness_gap` para destacar sources com readiness comprometida por gaps, remediation, proposal review, preview/replay ou graph orphan.
3. `CompanyBrainAdoptionDashboard.stats` ganhou contadores `auditReadyProjectCount`, `auditNeedsAttentionProjectCount`, `auditReadinessGapCount` e `auditTargetCount`.
4. UI `/company-brain` mostra badge de audit readiness, score, targets, gaps e next action por projeto no Adoption Dashboard.
5. AIOS Briefing passou a incluir contadores de audit-ready/readiness review/writeback targets na secao Adoption Dashboard.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43159`:

- Summary retornou `auditReadyProjectCount=1`, `auditNeedsAttentionProjectCount=0`, `auditReadinessGapCount=0` e `auditTargetCount=1`.
- Projeto `Felhen Demo v0.1` retornou `auditReadiness.stage=execution_ready`, `score=100`, `targetCount=1`, `replayTerminalCount=1` e next action `Keep audit readiness monitored.`
- Projeto `AIOS Briefing Runtime` retornou `auditReadiness.stage=evidence_ready`, `score=30`, `targetCount=0` e next action `Create governed proposal only from accepted guidance.`
- Watcher `watcher-aios-briefing-v0` gerou run `VqVSD92Mgwfm` e artifact `bFirMC4pdKTv`; o briefing incluiu `1/2 projects audit-ready; 0 need audit readiness review; 1 writeback targets tracked.`
- Porta do daemon foi encerrada apos o teste e nao restou listener em `43159`.

## Slice MCP Markdown Evidence Export v0

Objetivo: permitir que agentes consumam o evidence packet Markdown diretamente via MCP, mantendo o mesmo endpoint read-only da API/UI.

Implementado em 2026-05-06:

1. MCP server ganhou `daemonFetchText` para respostas textuais sem assumir JSON.
2. Nova tool `get_company_brain_writeback_evidence_packet_markdown` chama `/api/company-brain/external-action-proposals/:id/evidence-packet?format=markdown`.
3. Tool retorna o Markdown como conteúdo MCP `text`, preservando título, proposta, hashes, eventos, evidence links, integrity, GitHub status evidence e audit trail.
4. Descricao de `get_company_brain_adoption_dashboard` foi atualizada para mencionar audit readiness e writeback maturity.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43160`:

- Cliente MCP local chamou `get_company_brain_writeback_evidence_packet_markdown` para proposal `35xo7wHd9CBV`.
- Resultado continha `# AIOS Writeback Evidence Packet`, status id `47036420104`, payload hash `6737a218dba45d17e183f92ede73276af44a215f00a7e1444ac32558bc3de48f` e evento `github_status_set`.
- Porta do daemon foi encerrada apos o teste e nao restou listener em `43160`.

## Slice AIOS Core Operational Readiness v0

Objetivo: consolidar se o AIOS Core esta minimamente utilizavel como closed loop interno e separar gaps reais de uso diario, demo, design partner, polish e mutacao externa.

Implementado em 2026-05-06:

1. Novo tipo `CompanyBrainCoreReadiness` em shared types.
2. Summary ganhou `coreReadiness`.
3. API read-only `/api/company-brain/core-readiness`.
4. MCP ganhou `get_company_brain_core_readiness`.
5. UI `/company-brain` ganhou bloco `Core Readiness` com overall status, contadores, modulos e gaps reais.
6. Documento `docs/company-brain-operational-readiness.md` versiona o veredito, tabela de modulos, gaps e proximo corte recomendado.

Dogfood read-only validado no DB temporario `/tmp/aios-runtime-github-status-executor-dogfood.sqlite`, daemon `127.0.0.1:43161`:

- API `/core-readiness` retornou `overallStatus=internal_closed_loop_ready`.
- Stats: `moduleCount=15`, `operationalCount=15`, `dogfoodedCount=15`, `missingCount=0`, `readOnlyOnlyCount=7`, `needsRealAdapterCount=1`, `blockedByPolicyCount=1`.
- Gaps: `dailyUseBlockingGapCount=2`, `demoGapCount=0`, `designPartnerGapCount=1`, `polishGapCount=1`, `externalMutationGapCount=1`.
- Summary incluiu `coreReadiness` com `moduleCount=15`.
- Cliente MCP local chamou `get_company_brain_core_readiness` e confirmou `overallStatus=internal_closed_loop_ready`, `moduleCount=15`, `dailyUseBlockingGapCount=2` e modulo `watchers`.
- Porta do daemon foi encerrada apos o teste e nao restou listener em `43161`.

Veredito operacional:

- O core ja esta pronto para uso interno como closed loop assistido.
- Ainda falta Operating Cadence v0 para uso diario fluido.
- Demo interna esta pronta com briefing recente.
- Design partner readiness ainda precisa operating pack/runbook.
- Qualquer writeback mais forte continua exigindo aprovacao explicita de novo alvo/acao.

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

Objetivo da sessao: continuar apos GitHub Comment Writeback v0, Slack Thread Reply Writeback v0, Writeback Safety Dashboard v0, Writeback Preview Gate v0, Writeback HITL Rationale v0, Retry Safety / Idempotent Execution Review v0, Writeback Policy Matrix v0, GitHub Label Proposal v0 preview-only, GitHub Status/Check Proposal v0 preview-only, Writeback Audit Review v0, GitHub Label Executor v0, Post-Writeback Audit Review v0, Writeback Negative-Path Review v0, Writeback Adapter Summary v0, Writeback Audit Trail Export v0, Writeback HITL Runbook v0, Writeback Audit Search/Export v0, Writeback Evidence Packet v0, Operating Loop Metrics v0, AIOS Briefing Writeback Safety v0, Adoption Dashboard Writeback Maturity v0, Writeback Audit UI Filters/Export v0, Writeback Evidence Packet JSON Export v0, Writeback Evidence Packet Index v0, Writeback Evidence Integrity Gaps v0, Evidence Remediation Suggestions v0, GitHub Status Executor v0, Writeback Target Summary v0, GitHub Status Writeback Observability v0, Writeback Target Observability v0, Writeback Proposal/Target Review v0, Evidence/Provenance Graph v0, Company Brain Timeline v0, Saved Audit Views v0, Writeback Policy Simulator v0, Preview/Replay Simulator v0, Markdown Evidence Packet Export v0, AIOS Briefing Audit/Readiness v0, Adoption Dashboard Audit Maturity v0, MCP Markdown Evidence Export v0 e AIOS Core Operational Readiness v0. Proximo corte recomendado: Operating Cadence v0, com watchers read-only agendados/polling e sem nova mutacao externa. Pare antes de novo executor real, novo alvo externo, check-run real, assign/unassign, notification-read, close/reopen, merge, deploy, repo/canal publico ou qualquer writeback que nao esteja em GitHub interno privado allowlisted com approval, preview, HITL rationale, retry safety, idempotency e audit trail.

Antes de editar, confirme git status, commit atual, schema atual, rotas atuais e leia o `corp` atual. Depois implemente um corte pequeno e validavel:
- preservar provenance, status, human review, idempotency e audit trail;
- expor em API/UI/MCP ou summary quando fizer sentido;
- manter close/reopen/merge/deploy/delete/permissions/secrets/customer repos/Slack top-level/DM bloqueados sem novo escopo explicito;
- qualquer writeback novo deve passar por action_policy, risk_class, HITL, dry-run, idempotency e audit trail.

Nao mover logica de verticais para o core. ERP e Juntos em Sala entram como fontes/dogfood/adapters, nao como schema do runtime.

Validar com build/testes relevantes e documentar qualquer residual em docs/backlog.md ou nova nota de handoff.
```

## Operating Cadence v0 - 2026-05-06

Status: implementado e dogfooded em DB temporario. O corte fecha o pulso operacional read-only sem instalar scheduler externo e sem writeback novo.

Arquivos principais:

- `packages/shared/src/types.ts`: adiciona `WatcherRunTriggerSource`, `CompanyBrainOperatingCadence`, request/response de cadence runner, campos de cadencia em Source Health e Core Readiness.
- `packages/daemon/src/routes/company-brain.ts`: adiciona helpers de schedule provenance, `buildOperatingCadence`, GET/POST `/api/company-brain/operating-cadence`, Source Health com `watcher_cadence_*`, Core Readiness com stats de cadencia e AIOS Briefing com secao `operating_cadence`.
- `packages/daemon/src/db/client.ts`: seed de `watcher-aios-briefing-v0` como `schedule` e `watcher-github-pr-ci-v0` como `polling` a cada 2h; notifications permanece manual/poll-on-demand.
- `packages/web/src/app/company-brain/page.tsx`: Core Readiness mostra watchers automatizados, due/stale, ultimo run agendado e proximo run esperado.
- `packages/mcp-server/src/index.ts`: MCP `get_company_brain_operating_cadence` e `run_company_brain_operating_cadence`.
- `docs/company-brain-operating-cadence-runbook.md`: runbook de operacao local e fronteiras.

Dogfood validado:

- DB: `/tmp/aios-runtime-operating-cadence-dogfood-5.sqlite`.
- Daemon: `127.0.0.1:43166`.
- Trigger: `POST /api/company-brain/operating-cadence/run`.
- Repo read-only: `antonio-mello-ai/crewdock`, `state=open`, `limit=1`.
- `watcher-aios-briefing-v0`: run `fRDMbe2w5B9U`, `triggerRef=schedule://dogfood%3Aoperating-cadence-v0/fRDMbe2w5B9U`, 1 artifact.
- `watcher-github-pr-ci-v0`: run `4nI5KofGWHCP`, `triggerRef=schedule://dogfood%3Aoperating-cadence-v0/4nI5KofGWHCP`, 1 artifact `github_pr_ci_poll`.
- Operating cadence stats: `scheduledWatcherCount=2`, `activeScheduledWatcherCount=2`, `staleCadenceCount=0`, `dueCadenceCount=0`, `scheduledRunCount=2`, `manualRunCount=0`.
- Core Readiness stats: `automatedWatcherCount=2`, `dailyUseBlockingGapCount=0`, `staleCadenceCount=0`, `dueCadenceCount=0`.
- Source Health stats: `watcherCadenceStaleCount=0`, `sourceWithoutCadenceCount=0`.
- AIOS Briefing inclui as secoes: `decisions`, `tradeoffs`, `open_guidance`, `findings`, `source_health`, `operating_cadence`, `adoption_dashboard`, `unlinked_work`, `gates_sla`, `writeback_safety`, `audit_readiness`, `execution_readiness`, `next_steps`.

Observacao:

- Tentativa inicial de dogfood em `antonio-mello-ai/felhen` retornou GitHub 404 no processo local, indicando ausencia/escopo insuficiente de token para leitura do repo privado. Para nao adicionar credencial nova neste corte, o fallback default passou a ser `AIOS_OPERATING_CADENCE_GITHUB_REPO` ou `antonio-mello-ai/crewdock`. Repo privado pode ser usado quando `GITHUB_TOKEN`/`GH_TOKEN` tiver leitura.

Proximo corte recomendado:

1. **Gate Closure Ritual v0**: visao/ritual diario para gates pendentes, SLA em risco e workflow runs parados, refletido no briefing/core readiness, sem writeback externo.
2. **AgentContext Daily Handoff v0**: gerar contexto diario para agentes iniciarem alinhados ao Company Brain.
3. **Design Partner Operating Pack v0**: runbook, fronteiras de dados, narrativa reproduzivel e demo seed.

## Gate Closure Ritual v0 - 2026-05-06

Status: implementado e dogfooded em DB temporario. O corte e read-only e nao altera WorkflowRun/Goal nem escreve em sistemas externos.

Arquivos principais:

- `packages/shared/src/types.ts`: adiciona `CompanyBrainGateClosureRitual`, `GateClosureRitualItem` e status/kinds do ritual.
- `packages/daemon/src/routes/company-brain.ts`: adiciona `buildGateClosureRitual`, API `GET /gate-closure-ritual`, summary `gateClosureRitual`, secao `gate_closure` no briefing e Core Readiness usando o ritual para gaps diarios.
- `packages/web/src/app/company-brain/page.tsx`: secao `Gate Closure Ritual` com contadores e top itens.
- `packages/mcp-server/src/index.ts`: MCP `get_company_brain_gate_closure_ritual`.
- `docs/company-brain-gate-closure-ritual-runbook.md`: runbook de uso/validacao.

Dogfood validado:

- DB: `/tmp/aios-runtime-gate-closure-dogfood.sqlite`.
- Daemon: `127.0.0.1:43167`.
- Seed: `POST /api/company-brain/demo/felhen-v0-1`.
- API: `GET /api/company-brain/gate-closure-ritual`.
- Resultado: `itemCount=1`, `workflowGateCount=1`, `pendingGateCount=1`, `dailyClosureReadyCount=1`.
- Primeiro item: `kind=workflow_gate`, `status=ready_for_review`, `severity=warn`, `recommendedAction=Review required evidence and decide whether the next workflow step can start.`
- Briefing: run manual de `watcher-aios-briefing-v0` gerou secao `gate_closure`.

Proximo corte recomendado:

1. **AgentContext Daily Handoff v0**: gerar contexto diario para agentes a partir de briefing, gate closure, open guidance, operating cadence e source health.
2. **Design Partner Operating Pack v0**: empacotar demo/runbook/fronteiras de dados.
3. Parar antes de novo executor real, novo alvo externo, deploy, close/reopen/merge/delete ou qualquer mutacao externa nao aprovada.

## AgentContext Daily Handoff v0 - 2026-05-06

Status: implementado e dogfooded em DB temporario. O corte cria contexto interno para agentes e nao roda agente, nao aplica patch, nao cria proposal e nao faz writeback.

Arquivos principais:

- `packages/shared/src/types.ts`: adiciona request/response `GenerateDailyAgentHandoff`.
- `packages/daemon/src/routes/company-brain.ts`: adiciona `buildDailyAgentHandoffContent` e API `POST /agent-contexts/daily-handoff`.
- `packages/web/src/hooks/use-api.ts`: hook `useGenerateCompanyBrainDailyAgentHandoff`.
- `packages/web/src/app/company-brain/page.tsx`: botao `Daily Handoff` na secao `Agent Contexts`.
- `packages/mcp-server/src/index.ts`: MCP `generate_company_brain_daily_agent_handoff`.
- `docs/company-brain-agentcontext-daily-handoff-runbook.md`: runbook de validacao e fronteiras.

Dogfood validado:

- DB: `/tmp/aios-runtime-agent-handoff-dogfood.sqlite`.
- Daemon: `127.0.0.1:43168`.
- Seed: `POST /api/company-brain/demo/felhen-v0-1`.
- Briefing: `POST /api/company-brain/watchers/watcher-aios-briefing-v0/run`.
- Handoff: `POST /api/company-brain/agent-contexts/daily-handoff`.
- AgentContext criado: `Jo54ubw-2noR`.
- Status: `ready`, `validationStatus=needs_review`.
- `sourceKnowledgeIds=8`, com artifact de briefing, work item, goal e summaries derivados.
- Summary validou `agentContextCount=1` e `readyAgentContextCount=1`.
- Provenance: `createdFrom=company_brain:daily_agent_handoff`.

Proximo corte recomendado:

1. **Design Partner Operating Pack v0**: consolidar demo seed, runbooks, fronteiras de dados e narrativa reproduzivel.
2. Depois avaliar polish de daily ops/adoption apenas a partir de friccao real.
3. Parar antes de novo executor real, novo alvo externo, deploy, close/reopen/merge/delete ou qualquer mutacao externa nao aprovada.

## Design Partner Operating Pack v0 - 2026-05-06

Status: implementado como pacote documental/read-only. Sem codigo novo, sem mutacao externa e sem executor novo.

Arquivo principal:

- `docs/company-brain-design-partner-operating-pack.md`

Conteudo do pack:

- objetivo e narrativa;
- fronteiras permitidas/proibidas;
- comandos de demo seed em DB temporario;
- AIOS Briefing;
- Operating Cadence;
- Gate Closure Ritual;
- AgentContext Daily Handoff;
- roteiro de demo em `/company-brain`;
- dados/privacidade;
- reset;
- criterios de aceite;
- proximos passos pos-demo.

Proximo passo recomendado:

1. Rodar o pack em uma sessao real e coletar friccoes concretas.
2. Ajustar briefing/adoption/dashboard/UI apenas com base nessa friccao.
3. Parar antes de novo executor real, novo alvo externo, deploy, close/reopen/merge/delete ou qualquer mutacao externa nao aprovada.

## Operating Surface v0 + Demo/Readiness Cleanup v0 - 2026-05-07

Status: implementado e dogfooded em DB temporario. O corte permanece sem writeback externo, sem deploy, sem secrets novas e sem novo executor.

Arquivos principais:

- `packages/shared/src/types.ts`: adiciona `CompanyBrainOperatingSnapshot` e inclui `externalActionProposals` no retorno do demo seed.
- `packages/daemon/src/routes/company-brain.ts`: adiciona builder/API `/operating-snapshot`, alias `/preview-replay-simulator`, propostas internas Demo Seed v0.2, heuristica de Source Health para runtime/read-only e reconhecimento do pack `design_partner_operating_pack`.
- `packages/web/src/hooks/use-api.ts`: hooks `useCompanyBrainOperatingSnapshot` e `useRunCompanyBrainOperatingCadence`.
- `packages/web/src/app/company-brain/operating/page.tsx`: nova superficie diaria com 5 cards, `Run Operating Cadence`, timeline recente e Copy/Download `.md` para Daily Agent Handoff.
- `packages/web/src/app/company-brain/page.tsx`: link para a superficie Operating, mantendo a pagina atual como construtor/admin.
- `packages/mcp-server/src/index.ts`: MCP read-only `get_company_brain_operating_snapshot` e uso do alias top-level de preview/replay.
- `docs/company-brain-operating-cadence-runbook.md`: schema real do runner (`watcherRunId`, `artifactsCreated`, `signalsCreated`).
- `docs/company-brain-artifact-field-canonical.md`: documenta `artifactType` como campo canonico.
- `docs/action/company-brain-operating-surface-dogfood-2026-05-07.md`: evidencia do dogfood curto.

Dogfood validado:

- DB: `/tmp/aios-runtime-operating-surface-dogfood.sqlite`.
- Daemon: `127.0.0.1:43172`.
- Web dev: `127.0.0.1:43173`.
- Demo Seed v0.2 criou duas `ExternalActionProposal` internas:
  - Risk A preview-only: `approvalStatus=blocked`, `executionStatus=blocked`, `destinationType=internal`, `actionType=draft`.
  - Risk B pending approval: `approvalStatus=pending`, `executionStatus=not_started`, `destinationType=internal`, `actionType=draft`.
- Briefing: `artifactType=aios_briefing`, `sections=14`.
- Daily Handoff: `status=ready`, `contentFormat=markdown`, `provenance.createdFrom=company_brain:daily_agent_handoff`.
- Operating Cadence: `watcherRunsCreated=2`, `artifactsCreated=2`, runs `watcher-aios-briefing-v0` e `watcher-github-pr-ci-v0` completed.
- Operating Snapshot: 5 cards retornados (`briefing=ready`, `cadence=healthy`, `gate=attention`, `source_health=healthy`, `handoff=ready`), `recentEvents=8`, `externalWriteEventCount=0`.
- Source Health: `sourceWithoutWorkItemsCount=0` e `sourceWithoutSignalsCount=0` para runtime/PR-CI read-only.
- Core Readiness: gap `design_partner_operating_pack` ausente; `designPartnerGapCount=0`.
- Web: `GET /company-brain/operating` retornou 200.

Validacao local ja executada antes do handoff:

- `npx turbo build` passou e listou `/company-brain/operating` como rota static.

Proximo passo recomendado:

1. Usar `/company-brain/operating` como tela inicial da proxima sessao diaria AIOS.
2. Coletar somente friccoes concretas de operacao antes de criar novas features.
3. Continuar automaticamente para read-only/audit/docs/UI/MCP/dogfood temporario.
4. Parar antes de novo executor real, novo alvo externo, deploy, secrets/permissoes, close/reopen/merge/delete ou qualquer mutacao externa fora da policy aprovada.

## Operating Cycle Friction Closure v0 - 2026-05-07

Status: implementado e dogfooded localmente antes de qualquer feature nova. O corte fecha as friccoes 3-6 registradas em `docs/action/company-brain-operating-cycle-real-2026-05-07.md`.

Arquivos principais:

- `packages/shared/src/types.ts`: adiciona `runs[].artifactId`, `GateClosureRitual.overallStatus/summary/totals`, `OperatingSnapshot.overallStatus/summary/totals` e novos `coreReadiness.overallStatus` (`daily_use_blocked`, `demo_not_ready`).
- `packages/daemon/src/routes/company-brain.ts`: executa PR/CI antes do briefing no cadence, atualiza o artifact de briefing apos persistir o `WatcherRun`, popula `artifactId`, agrega Gate Closure/Operating Snapshot e ajusta a semantica de Core Readiness.
- `packages/web/src/app/company-brain/operating/page.tsx`: mostra status/summary agregado da superficie Operating.
- `packages/web/src/app/company-brain/page.tsx`: mostra status/summary agregado do Gate Closure e classifica `daily_use_blocked`/`demo_not_ready` como alerta.
- `docs/company-brain-operating-cadence-runbook.md`: documenta `runs[].artifactId`.
- `docs/company-brain-gate-closure-ritual-runbook.md`: documenta `overallStatus`, `summary` e `totals`.
- `docs/action/company-brain-operating-cycle-real-2026-05-07.md`: registra o fix pass e evidencias.

Dogfood validado:

- DB: `/tmp/aios-cycle-fix-2026-05-07.sqlite`.
- Daemon: `127.0.0.1:43182`.
- `POST /api/company-brain/operating-cadence/run`:
  - `watcherRunsCreated=2`;
  - `artifactsCreated=2`;
  - `activeScheduledWatcherCount=2`;
  - `staleCadenceCount=0`;
  - `dueCadenceCount=0`;
  - `runs[].artifactId` preenchido para PR/CI e briefing.
- `GET /api/company-brain/briefing`:
  - secao `Operating Cadence` mostra `2/2 scheduled watchers active; 2 scheduled runs; 0 manual runs.`;
  - `0 stale cadence watchers; 0 due`.
- `GET /api/company-brain/gate-closure-ritual`:
  - `overallStatus=attention`;
  - `totals.itemCount=1`;
  - `totals.pendingGateCount=1`.
- `GET /api/company-brain/operating-snapshot` final:
  - `overallStatus=attention`;
  - `summary=4/5 operating cards ready; 1 attention; 0 critical; 0 errors; 0 missing.`;
  - `latestAgentContext` ready.
- `GET /api/company-brain/core-readiness`:
  - `overallStatus=daily_use_blocked`;
  - `dailyUseBlockingGapCount=1`;
  - `demoGapCount=0`;
  - `designPartnerGapCount=0`.

Validacao executada:

- `npx turbo build` passou.

Proximo passo recomendado:

1. Rodar `git diff --check` e `npx turbo build` finais.
2. Commit/push deste corte.
3. Deploy CT165 daemon (`git pull`, build daemon, restart `aios-daemon`).
4. Deploy Cloudflare Pages com `NEXT_PUBLIC_DAEMON_URL=https://api.felhen.ai` e `NEXT_PUBLIC_VAPID_PUBLIC_KEY` lido do CT165.
5. Validar:
   - `GET https://api.felhen.ai/api/health`;
   - `GET https://api.felhen.ai/api/company-brain/operating-snapshot`;
   - `GET https://ai.felhen.ai/company-brain/operating`.

## Operating Cycle Production Deploy - 2026-05-07

Status: deploy concluido e ciclo real persistido.

Commits publicados em `main`:

- `05699e6` `docs: record company brain operating cycle dogfood`
- `c8f62c9` `fix: harden company brain operating cycle`
- `e518f3d` `fix: allow github pr ci watcher retry`

Deploy executado:

- CT165 fast-forward ate `e518f3d`.
- `npx turbo build --filter=@aios/daemon --force` passou no CT165.
- `systemctl restart aios-daemon` executado; servico ficou `active`.
- Cloudflare Pages publicado para o projeto `crewdock`; deploy URL retornada: `https://4d90ffda.crewdock.pages.dev`.

Validacao externa:

- `GET https://api.felhen.ai/api/health` -> `200`, `{"status":"ok"}`.
- `GET https://api.felhen.ai/api/company-brain/operating-snapshot` -> `200`, com `overallStatus`, `summary`, `totals` e `operatingCadence.stats`.
- `GET https://ai.felhen.ai/company-brain/operating` -> `200 text/html`, carregando chunk `app/company-brain/operating/page`.

Dogfood real:

- Primeiro run com `antonio-mello-ai/felhen` falhou somente em leitura GitHub PR/CI (`404` da API para repo privado), sem writeback externo.
- Isso revelou gap de retry: watcher em `status=error` nao podia rerodar.
- `e518f3d` ajustou o GitHub PR/CI watcher para aceitar retry em `active` ou `error`; sucesso segue voltando o watcher para `active`.
- Rerun real com `antonio-mello-ai/crewdock`:
  - `watcher-github-pr-ci-v0`: `completed`, `watcherRunId=hEfStW4sLBaK`, `artifactId=0O-L_teH6XME`;
  - `watcher-aios-briefing-v0`: `completed`, `watcherRunId=l8Y9-Lj3k_ep`, `artifactId=EjpCHihR3cUG`;
  - `activeScheduledWatcherCount=2`;
  - `staleCadenceCount=0`;
  - `dueCadenceCount=0`;
  - `errorCadenceCount=0`;
  - `scheduledRunCount=6`.

Snapshot real apos deploy:

- `overallStatus=attention`;
- `summary=4/5 operating cards ready; 0 attention; 0 critical; 0 errors; 1 missing.`;
- `operating_cadence.state=healthy`;
- `gate_closure_ritual.state=clear`;
- `source_health.state=healthy`;
- `daily_agent_handoff.state=missing`.

Briefing real apos deploy:

- `2/2 scheduled watchers active; 6 scheduled runs; 0 manual runs.`;
- `0 stale cadence watchers; 0 due`;
- ultimos scheduled runs de PR/CI e briefing estao `completed` com provenance `schedule://production:operating-cycle-2026-05-07-retry-ok`.

Residual objetivo:

1. Gerar Daily Agent Handoff em producao antes da proxima sessao diaria.
2. Revisar se o token GitHub usado pelo daemon deve ou nao ter leitura do repo privado `antonio-mello-ai/felhen`; hoje `crewdock` funciona para o watcher read-only, enquanto `felhen` retornou `404`.

## Production Operating Loop v0 - 2026-05-07

Status: implementado e dogfooded localmente. Deploy CT165 pendente neste ponto do handoff.

Objetivo:

- Fechar o bloqueio `stale_or_due_watcher_cadence` sem depender de run manual/one-off.
- Manter o corte observe-only: sem Linear, sem writeback, sem executor externo novo, sem secrets novas.

Arquivos principais:

- `packages/daemon/src/config.ts`: adiciona `AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED`, `AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS`, `AIOS_COMPANY_BRAIN_OPERATING_LOOP_INITIAL_DELAY_MS` e `AIOS_COMPANY_BRAIN_OPERATING_LOOP_SCHEDULE_ID`.
- `packages/daemon/src/routes/company-brain.ts`: extrai `runCompanyBrainOperatingCadence`, adiciona estado/loop interno, endpoint `GET /operating-loop`, loop com lock em memoria e filtro `observe_only` para `watcher-aios-briefing-v0` + `watcher-github-pr-ci-v0`.
- `packages/daemon/src/index.ts`: inicia/para o loop junto com o daemon.
- `packages/shared/src/types.ts`: adiciona `CompanyBrainOperatingLoopState` e inclui loop em Operating Cadence/Core Readiness.
- `packages/mcp-server/src/index.ts`: adiciona `get_company_brain_operating_loop` e atualiza descricao de cadence.
- `packages/web/src/app/company-brain/operating/page.tsx`: mostra loop status, last tick, last run e next tick.
- `.env.prod.example`, `README.md`, `CLAUDE.md`, runbook e docs/action atualizados.

Dogfood local:

- DB: `/tmp/aios-operating-loop-v0.sqlite`.
- Daemon: `127.0.0.1:43184`.
- Env: loop enabled, interval `1000ms`, initial delay `100ms`, scheduleId `dogfood:company-brain-operating-loop-v0`, repo `antonio-mello-ai/crewdock`.
- Resultado automatico, sem POST manual:
  - `operatingLoop.enabled=true`;
  - `operatingLoop.status=idle`;
  - `operatingLoop.runCount=1`;
  - `watcherRunsCreated=2`;
  - `artifactsCreated=2`;
  - `watcher-github-pr-ci-v0` completed, `artifactId=HPRNv5pBRfAg`, `triggerRef=schedule://dogfood%3Acompany-brain-operating-loop-v0/NNic64E8ELko`;
  - `watcher-aios-briefing-v0` completed, `artifactId=eiioweu-q587`, `triggerRef=schedule://dogfood%3Acompany-brain-operating-loop-v0/6MFy-2dI_b06`;
  - `activeScheduledWatcherCount=2`;
  - `staleCadenceCount=0`;
  - `dueCadenceCount=0`;
  - `errorCadenceCount=0`;
  - `dailyUseBlockingGapCount=0`;
  - Operating Snapshot cadence card `state=healthy`.

Validacao local:

- `git diff --check` passou.
- `npx turbo build` passou.

Proximo passo imediato:

1. Commit/push do corte.
2. Deploy CT165 daemon.
3. Habilitar no CT165 `.env.prod`:
   - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED=true`;
   - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS=300000`;
   - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_INITIAL_DELAY_MS=30000`;
   - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_SCHEDULE_ID=production:company-brain-operating-loop`;
   - `AIOS_OPERATING_CADENCE_GITHUB_REPO=antonio-mello-ai/crewdock`.
4. Restart `aios-daemon`.
5. Validar em producao:
   - `GET https://api.felhen.ai/api/company-brain/operating-cadence`;
   - `GET https://api.felhen.ai/api/company-brain/core-readiness`;
   - `GET https://api.felhen.ai/api/company-brain/operating-snapshot`;
   - `staleCadenceCount=0` e `dueCadenceCount=0` apos o loop executar.

### Deploy e validacao de producao

Status: concluido.

- Commit deployado: `d82710b`.
- CT165: `git pull --ff-only` e `npx turbo build --filter=@aios/daemon --force` passaram.
- `.env.prod` recebeu apenas configs nao-secretas do loop:
  - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED=true`;
  - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS=300000`;
  - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_INITIAL_DELAY_MS=5000`;
  - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_SCHEDULE_ID=production:company-brain-operating-loop`;
  - `AIOS_OPERATING_CADENCE_GITHUB_REPO=antonio-mello-ai/crewdock`.
- `aios-daemon.service` reiniciado e `active`.
- Cloudflare Pages publicado: `https://b83e7c9b.crewdock.pages.dev`.
- `GET https://api.felhen.ai/api/health` -> `200`.
- `GET https://ai.felhen.ai/company-brain/operating` -> `200 text/html`, chunk `app/company-brain/operating/page-fc99e8c3f829ce3c.js`.

Evidencia do loop real:

- `operatingLoop.enabled=true`;
- `operatingLoop.status=idle`;
- `operatingLoop.tickCount=1`;
- `operatingLoop.runCount=1`;
- `operatingLoop.lastErrorSummary=null`;
- `operatingLoop.scheduleId=production:company-brain-operating-loop`;
- `operatingLoop.lastDueWatcherIds=[watcher-github-pr-ci-v0]`;
- `lastRun.watcherRunsCreated=1`;
- `lastRun.artifactsCreated=1`;
- `watcher-github-pr-ci-v0` completed:
  - `watcherRunId=DB8t6HVmDsX-`;
  - `artifactId=KX7Ujpfv80MO`;
  - `triggerRef=schedule://production%3Acompany-brain-operating-loop/DB8t6HVmDsX-`.

Operating Cadence/Core Readiness/Snapshot reais:

- `activeScheduledWatcherCount=2`;
- `staleCadenceCount=0`;
- `dueCadenceCount=0`;
- `errorCadenceCount=0`;
- `dailyUseBlockingGapCount=0`;
- `dailyGaps=[]`;
- Operating Snapshot `overallStatus=healthy`;
- `summary=5/5 operating cards ready; 0 attention; 0 critical; 0 errors; 0 missing.`;
- Daily Agent Handoff `Ry3RMiKMNQ2q` aparece ready.

Segundo tick recorrente:

- `operatingLoop.tickCount=2`;
- `operatingLoop.runCount=1`;
- `operatingLoop.skippedTickCount=1`;
- `operatingLoop.status=idle`;
- `operatingLoop.lastDueWatcherIds=[]`;
- `operatingLoop.lastErrorSummary=null`;
- `operatingLoop.nextTickAt` atualizado para o proximo intervalo de 5 minutos.

Residual:

1. O status `overallStatus=demo_not_ready` de Core Readiness nao e mais daily-use blocker; ele vem do fallback de readiness, enquanto `demoGapCount=0` e `dailyUseBlockingGapCount=0`.

## 2026-05-07 - Company Operating Map Alignment

Direcional de produto atualizado apos benchmark contra Cofounder:

- A superficie diaria do AIOS nao deve ficar como admin dashboard.
- A experiencia alvo e `Company Operating Map`: AIOS/Company Brain no centro,
  areas/departamentos ao redor, work items, agent runs, gates, blockers, HITL,
  source health, evidence, guidance e handoff visiveis por area.
- Project/repo pipeline continua necessario, mas vira drilldown dentro do mapa.
- Symphony continua referencia para a camada de execucao de coding agents; AIOS
  continua Company Brain, governanca, evidencia, strategy alignment e learning.
- Transcript do CEO da Cofounder reforca que o alvo maior e "superoptimization":
  agentes gerenciando agentes para objetivos de negocio, nao apenas execucao de
  tasks. AIOS precisa preservar goal, metrica, evidence, policy, outcome e
  aprendizado para chegar nisso.

Fila GitHub atualizada:

- `#29 AIOS-EXEC-03: Symphony-compatible Agent Runner` segue como proximo corte.
- `#30 AIOS-EXEC-04: Session Result Intake`.
- `#31 AIOS-EXEC-05: Company Operating Map v0` substitui o antigo `Project Pipeline View`.
- `#37 AIOS-EXEC-06: Company Command Router v0` criado.
- `#38 AIOS-EXEC-07: Area Blueprint Registry v0` criado.
- `#39 AIOS-EXEC-08: Goal-to-Execution Superoptimizer v0` criado.
- `#40 AIOS-EXEC-09: Agent Run Evaluation Loop v0` criado.

Sync read-only de GitHub Issues em producao apos `#39/#40`:

- `issuesSeen=7`;
- `lastIssueNumbers=[40,39,38,37,31,30,29]`;
- `workItemsCreated=2`;
- `workItemsUpdated=5`;
- `get_company_brain_next_work` / API seguem recomendando `#29`, agora com
  `candidatesConsidered=7`.

Docs atualizados:

- `docs/backlog.md`;
- `docs/aios-issues-runbook.md`;
- `docs/action/aios-github-roadmap-reset-2026-05-07.md`;
- `docs/action/aios-company-operating-map-alignment-2026-05-07.md`.

Docs upstream no `corp` tambem foram atualizados:

- `docs/action/aios-product-roadmap.md`;
- `docs/action/aios-symphony-alignment-2026-05-07.md`;
- `docs/action/aios-cofounder-product-surface-alignment-2026-05-07.md`;
- `docs/action/aios-yc-thesis-five-week-build-plan-2026-05-05.md`;
- `docs/action/roadmap.md`;
- `docs/action/CHANGELOG.md`.

## 2026-05-07 - AIOS Agent Execution v1

Milestone `AIOS Execution Loop v0` foi concluida em modo continuo:

- PRs `#41` a `#47` mergeados;
- issues `#29`, `#30`, `#31`, `#37`, `#38`, `#39`, `#40` fechadas;
- CT165 deployado a cada cut;
- Company Brain reconciliado ate empty state da milestone.

Nova milestone aberta:

- `AIOS Agent Execution v1` (GitHub milestone number `4`).

Issues abertas:

- `#48 AIOS-RUN-01: AgentRun schema and lifecycle v1`;
- `#49 AIOS-RUN-02: WorkflowLoader and WORKFLOW.md skeleton`;
- `#50 AIOS-RUN-03: Workspace manager and git worktree safety`;
- `#51 AIOS-RUN-04: Manual AgentRun dry-run orchestrator`;
- `#52 AIOS-RUN-05: Session Result Intake UI`;
- `#53 AIOS-RUN-06: Operating Map v1 from Area Blueprint Registry`;
- `#54 AIOS-RUN-07: Evaluation-driven ImprovementProposal records`.

Producao:

- CT165 recebeu `GITHUB_TOKEN` em `.env.prod` para sync autenticado do GitHub
  Issues adapter;
- `aios-daemon` reiniciado e `active`;
- sync read-only retornou `issuesSeen=7`,
  `lastIssueNumbers=[54,53,52,51,50,49,48]`, `workItemsCreated=7`;
- `GET /api/company-brain/next-work` recomenda
  `#48 AIOS-RUN-01: AgentRun schema and lifecycle v1` com
  `candidatesConsidered=7`.

Proximo prompt deve mandar a janela de implementacao consumir `#48` primeiro e
seguir issue-by-issue pela milestone nova. Parar apenas em launch automatico
real de agente, novo segredo/permissao alem do token ja configurado, novo
servico pago, writeback externo fora das policies ou cleanup destrutivo de
workspace.

## 2026-05-07 - AIOS Agent Execution v2

Milestone `AIOS Agent Execution v1` foi concluida:

- PRs `#55` a `#61` mergeados;
- issues `#48` a `#54` fechadas;
- CT165 daemon ativo apos redeploys;
- Pages publicado para mudancas de UI;
- session results submetidos em producao;
- production smoke validou AgentRun schema, WorkflowLoader, workspace prepare,
  dry-run orchestrator, Session Result UI, Operating Map registry-driven e
  ImprovementProposal persistente.

Antes de abrir nova fila, foi rodado sync `state=all` em producao para marcar
`#48` a `#54` como `done`. `Next Work` voltou a empty state.

Nova milestone aberta:

- `AIOS Agent Execution v2` (GitHub milestone number `5`).

Issues abertas:

- `#62 AIOS-RUN-08: Runner policy and execution gates v2`;
- `#63 AIOS-RUN-09: Manual real subprocess executor v2`;
- `#64 AIOS-RUN-10: AgentRun logs, heartbeat, timeout and cancel v2`;
- `#65 AIOS-RUN-11: Runner session result auto-intake v2`;
- `#66 AIOS-RUN-12: Workspace cleanup and quarantine gate v2`;
- `#67 AIOS-RUN-13: Agent Runs execution console v2`;
- `#68 AIOS-RUN-14: Supervised runner dogfood pack v2`.

Direcional da v2: sair do dry-run para supervised real runner. O AIOS deve
conseguir iniciar um AgentRun manual, em workspace isolado, com policy gates,
logs, cancelamento, timeout, intake de resultado e dogfood controlado. Ainda
nao e milestone de auto-dispatch amplo.

Bug corrigido na preparacao da fila: o GitHub Issues adapter passou a usar
`filter=all` no endpoint REST. Sem isso, o GitHub listava apenas issues
atribuidas ao token, e issues abertas sem assignee nao apareciam no Company
Brain nem no `next-work`.

Producao apos deploy:

- CT165 atualizado para `e803626`;
- `npx turbo build --filter=@aios/daemon --force` passou no CT165;
- `aios-daemon.service` reiniciado e `active`;
- `GET /api/health` retornou `{"status":"ok"}`;
- sync GitHub Issues `state=open` retornou `issuesSeen=7`,
  `workItemsCreated=7`, `lastIssueNumbers=[68,67,66,65,64,63,62]`;
- `GET /api/company-brain/next-work` recomenda
  `#62 AIOS-RUN-08: Runner policy and execution gates v2` com
  `candidatesConsidered=7`.

Proximo prompt deve mandar a janela de implementacao consumir `#62` primeiro e
seguir issue-by-issue pela milestone `AIOS Agent Execution v2`. Pode seguir sem
parar em docs, APIs internas, UI, policy, logs, cancelamento, workspace
quarantine e dogfood controlado. Deve parar antes de auto-dispatch amplo,
novo segredo/permissao, servico pago, writeback externo fora das policies,
auto-merge/deploy ou cleanup destrutivo sem confirmacao explicita.

## 2026-05-08 - AIOS Agent Execution v3

Milestone `AIOS Agent Execution v2` foi concluida:

- PRs `#69` a `#75` mergeados;
- issues `#62` a `#68` fechadas;
- CT165 deployado para os cortes de daemon;
- Pages publicado para `/company-brain/agent-runs`;
- dogfood pack documentou production default-blocked e run local controlado;
- production sync `state=all` retornou `issuesSeen=50`, `workItemsUpdated=50`;
- `Next Work` voltou a empty state.

Nova milestone aberta:

- `AIOS Agent Execution v3` (GitHub milestone number `6`).

Issues abertas:

- `#76 AIOS-RUN-15: Async AgentRun spawn with PID, SIGTERM and SSE logs v3`;
- `#77 AIOS-RUN-16: Per-run workspace isolation keyed by AgentRun id v3`;
- `#78 AIOS-RUN-17: Git worktree remove after cleanup gate v3`;
- `#79 AIOS-RUN-18: Operating Loop queued-run suggester without auto-dispatch v3`.

Direcional da v3: transformar o runner real supervisionado de request-blocking
em background-capable. O AIOS deve conseguir iniciar um AgentRun assincrono,
acompanhar PID/heartbeat/logs, cancelar via SIGTERM, isolar workspace por run,
limpar worktree com gate seguro e sugerir queued runs no Operating Loop sem
executa-los automaticamente.

Producao apos sync:

- sync GitHub Issues `state=open` retornou `issuesSeen=4`,
  `workItemsCreated=4`, `lastIssueNumbers=[79,78,77,76]`;
- `GET /api/company-brain/next-work` recomenda
  `#76 AIOS-RUN-15: Async AgentRun spawn with PID, SIGTERM and SSE logs v3`
  com `candidatesConsidered=4`.

Proximo prompt deve mandar a janela de implementacao consumir `#76` primeiro e
seguir issue-by-issue pela milestone `AIOS Agent Execution v3`. Pode seguir sem
parar em docs, APIs internas, UI, async spawn, PID/executionRef, SIGTERM,
SSE/log streaming, workspace per-run, cleanup com `git worktree remove` gated e
Operating Loop suggester observe-only. Deve parar antes de auto-dispatch amplo,
novo segredo/permissao, servico pago, writeback externo fora das policies,
auto-merge/deploy ou cleanup fora do workspace root.

## 2026-05-08 - AIOS Agent Execution v4

Milestone `AIOS Agent Execution v3` foi concluida:

- PRs `#80` a `#83` mergeados;
- issues `#76` a `#79` fechadas;
- CT165 daemon `active`;
- frontend deployado em Cloudflare Pages;
- `Next Work` em producao voltou a empty state apos fechamento da milestone.

Nova milestone aberta:

- `AIOS Agent Execution v4` (GitHub milestone number `7`).

Issues abertas:

- `#84 AIOS-RUN-19: Auto-dispatch governance and eligibility policy v4`;
- `#85 AIOS-RUN-20: Promote Operating Loop suggestion to queued AgentRun v4`;
- `#86 AIOS-RUN-21: Operating Loop single-run auto-dispatch v4`;
- `#87 AIOS-RUN-22: AgentRun reconciliation, stall recovery and tracker refresh v4`;
- `#88 AIOS-RUN-23: Controlled auto-dispatch dogfood pack v4`.

Direcional da v4: controlled auto-dispatch. O Operating Loop pode, quando
explicitamente habilitado por env/allowlist/policy, promover uma suggestion
e iniciar no maximo um AgentRun async por tick. Continua fora de escopo:
autonomia ampla multi-issue, novos segredos, servicos pagos, writeback fora das
policies, auto-merge/deploy e cleanup fora do workspace root.

Producao apos sync:

- sync GitHub Issues `state=open` retornou `issuesSeen=5`,
  `workItemsCreated=5`, `lastIssueNumbers=[88,87,86,85,84]`;
- `GET /api/company-brain/next-work` recomenda
  `#84 AIOS-RUN-19: Auto-dispatch governance and eligibility policy v4`
  com `candidatesConsidered=5`.

Proximo prompt deve mandar a janela de implementacao consumir `#84` primeiro e
seguir issue-by-issue pela milestone `AIOS Agent Execution v4`. Pode seguir sem
parar em docs, APIs internas, UI, auto-dispatch policy, suggestion promotion,
single-run dispatch, reconciliation/stall recovery e dogfood controlado. Deve
parar antes de broad auto-dispatch, novos segredos/permissoes, servico pago,
writeback externo fora das policies, auto-merge/deploy ou cleanup fora do
workspace root.

## 2026-05-08 - AIOS Agent Execution v5

Milestone `AIOS Agent Execution v4` foi concluida:

- PRs `#89` a `#93` mergeados;
- issues `#84` a `#88` fechadas;
- CT165 daemon `active`;
- frontend deployado em Cloudflare Pages;
- dogfood v4 registrou WorkItem `5_ob_GjP_Up7` -> Suggestion
  `P4zKUjHehudq` -> AgentRun `wuXBRVe899cA` em ~5s;
- 11 gates de auto-dispatch passaram no ambiente controlado;
- re-tick idempotente retornou `skipped_no_suggestion`;
- producao permaneceu default-off com `decision=blocked_default_off`.

Nova milestone aberta:

- `AIOS Agent Execution v5` (GitHub milestone number `8`).

Issues abertas:

- `#94 AIOS-RUN-24: Auto-dispatch config clarity and policy hints v5`;
- `#95 AIOS-RUN-25: Stable WorkflowBlueprint identity for auto-dispatch v5`;
- `#96 AIOS-RUN-26: Workspace cleanup risk review UX v5`;
- `#97 AIOS-RUN-27: Internal WorkItem status update path v5`;
- `#98 AIOS-RUN-28: Successful controlled auto-dispatch dogfood pack v5`.

Producao apos sync:

- sync GitHub Issues `state=open` retornou `issuesSeen=5`,
  `workItemsCreated=5`, `lastIssueNumbers=[98,97,96,95,94]`;
- `GET /api/company-brain/workflow-loader` mostra
  `activeMilestone=AIOS Agent Execution v5` e `isValid=true`;
- `GET /api/company-brain/next-work` recomenda
  `#94 AIOS-RUN-24: Auto-dispatch config clarity and policy hints v5`
  com `candidatesConsidered=5`.

Direcional da v5: hardening operacional do controlled auto-dispatch. A v5
fecha as 5 friccoes do dogfood v4: semantica de allowlists, identidade estavel
de WorkflowBlueprint, review UX de cleanup, update interno auditado de WorkItem
status e dogfood com caminho `completed` usando comando benigno. Continua fora
de escopo: autonomia ampla multi-issue, novos segredos, servicos pagos,
writeback externo fora das policies, auto-merge/deploy e cleanup fora do
workspace root.

Proximo prompt deve mandar a janela de implementacao consumir `#94` primeiro e
seguir issue-by-issue pela milestone `AIOS Agent Execution v5`. Pode seguir sem
parar em docs, APIs internas, UI/MCP, policy hints, stable blueprint identity,
cleanup review, update interno auditado de WorkItem e dogfood controlado com
comando benigno. Deve parar antes de broad multi-issue auto-dispatch, novos
segredos/permissoes, servico pago, writeback externo fora das policies,
auto-merge/deploy ou cleanup fora do workspace root.

## 2026-05-08 - AIOS Agent Execution v6

Milestone `AIOS Agent Execution v5` foi concluida:

- PRs `#99` a `#103` mergeados;
- issues `#94` a `#98` fechadas;
- CT165 daemon `active`;
- frontend deployado em Cloudflare Pages;
- dogfood v5 registrou WorkItem `cgWHgooT1UCC` -> AgentRuns
  `KNbHJQJ-rUPx` e `frfUkNpMq8gv`, ambos `completed`;
- terminal event do caminho feliz foi `agent_run_real_execution_completed`;
- suggestions foram superseded via reconciliation apos
  `PATCH /work-items/:id/status`;
- producao permaneceu default-off com `enabled=false`,
  `commandOverride=null`, `decision=blocked_default_off` e
  `lastOutcome.status=skipped_disabled`.

Nova milestone aberta:

- `AIOS Agent Execution v6` (GitHub milestone number `9`).

Issues abertas:

- `#104 AIOS-RUN-29: Agent runner profile registry v6`;
- `#105 AIOS-RUN-30: AgentRun patch and validation collector v6`;
- `#106 AIOS-RUN-31: AgentRun to GitHub PR proposal preview v6`;
- `#107 AIOS-RUN-32: Approved GitHub PR writeback executor v6`;
- `#108 AIOS-RUN-33: First AIOS-authored PR dogfood pack v6`.

Producao apos sync:

- sync GitHub Issues `state=open` retornou `issuesSeen=5`,
  `workItemsCreated=5`, `lastIssueNumbers=[108,107,106,105,104]`;
- `GET /api/company-brain/workflow-loader` mostra
  `activeMilestone=AIOS Agent Execution v6` e `isValid=true`;
- `GET /api/company-brain/next-work` recomenda
  `#104 AIOS-RUN-29: Agent runner profile registry v6`
  com `candidatesConsidered=5`.

Direcional da v6: primeiro loop PR-shaped real do AIOS. A v6 deve sair do
auto-dispatch benigno/no-op e produzir um PR revisavel em repo interno:
WorkItem -> AgentRun -> workspace patch/validation packet -> PR proposal
preview -> approved GitHub PR writeback -> dogfood evidence. Continua fora de
escopo: broad multi-issue auto-dispatch, customer repos, novos segredos,
servicos pagos, auto-merge/deploy e writeback externo fora das policies.

Proximo prompt deve mandar a janela de implementacao consumir `#104` primeiro e
seguir issue-by-issue pela milestone `AIOS Agent Execution v6`. Pode seguir sem
parar em docs, APIs internas, UI/MCP, runner profiles, patch/validation packet,
PR proposal preview, approved GitHub PR writeback para `antonio-mello-ai/crewdock`
e dogfood controlado de primeiro PR AIOS-authored. Deve parar antes de broad
multi-issue auto-dispatch, customer repo, novo segredo/permissao, servico pago,
auto-merge/deploy ou writeback externo fora das policies.

## 2026-05-08 - AIOS Agent Execution v7

Milestone `AIOS Agent Execution v6` foi concluida:

- PRs `#109` a `#114` mergeados;
- issues `#104` a `#108` fechadas;
- CT165 daemon `active`;
- frontend deployado em Cloudflare Pages;
- primeiro PR AIOS-authored aberto: `#113`
  (`https://github.com/antonio-mello-ai/crewdock/pull/113`);
- cadeia comprovada: WorkItem `G4FWzjBASmc0` -> AgentRun
  `aios-run-33-dogfood` -> patch packet `T8Lkx2zYv7aE` ->
  ExternalActionProposal `ZtH_lkpjxwFZ` -> PR `#113`;
- re-execute idempotente retornou `alreadyExecuted=true`;
- PR `#113` continua aberto aguardando revisao humana antes de merge;
- producao permaneceu default-off para PR writeback
  (`AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED` unset).

Nova milestone aberta:

- `AIOS Agent Execution v7` (GitHub milestone number `10`).

Issues abertas:

- `#115 AIOS-RUN-34: GitHub PR writeback preflight and auth smoke v7`;
- `#116 AIOS-RUN-35: GitHub PR proposal governance UI v7`;
- `#117 AIOS-RUN-36: Auto-dispatch to PR proposal chain v7`;
- `#118 AIOS-RUN-37: Same-PR iteration loop for AgentRuns v7`;
- `#119 AIOS-RUN-38: Semantic AIOS-authored PR dogfood pack v7`.

Producao apos sync:

- sync GitHub Issues `state=open` retornou `issuesSeen=5`,
  `workItemsCreated=5`, `lastIssueNumbers=[119,118,117,116,115]`;
- `GET /api/company-brain/workflow-loader` mostra
  `activeMilestone=AIOS Agent Execution v7` e `isValid=true`;
- `GET /api/company-brain/next-work` recomenda
  `#115 AIOS-RUN-34: GitHub PR writeback preflight and auth smoke v7`
  com `candidatesConsidered=5`.

Direcional da v7: tornar o loop de PR revisavel e iteravel. A v7 deve fechar
as friccoes do dogfood v6: smoke de pushability/auth, aprovacao de
`github_pr_create` via UI/API em vez de SQLite, chain auto-dispatch -> PR
proposal sem AgentRun seed manual, iteracao no mesmo PR e dogfood com mudanca
semantica real. Continua fora de escopo: auto-merge/deploy, customer repo,
novos segredos/permissoes, servicos pagos e broad multi-issue auto-dispatch.

Proximo prompt deve mandar a janela de implementacao consumir `#115` primeiro e
seguir issue-by-issue pela milestone `AIOS Agent Execution v7`. Pode seguir sem
parar em docs, APIs internas, UI/MCP, PR writeback preflight, governance UI para
`github_pr_create`, chain auto-dispatch -> PR proposal, same-PR iteration e
dogfood semantico controlado. Deve parar antes de auto-merge/deploy, customer
repo, novo segredo/permissao, servico pago ou broad multi-issue auto-dispatch.

### AIOS-RUN-34 implementation checkpoint

Issue `#115` foi implementada localmente em
`aios-run-34-pr-writeback-preflight`.

Entregue:

- API `POST /api/company-brain/external-action-proposals/:id/github-pr/preflight`;
- MCP `preflight_company_brain_github_pr_writeback`;
- helper interno de preflight reaproveitado por
  `POST /external-action-proposals/:id/execute-pr`;
- gates para action type, payload, master switch, repo allowlist, token source,
  auth scheme `x-access-token`, base branch visibility, workspace readiness e
  push probe opcional;
- response com remote URL pattern redigido, dry-run limitations e
  `safePushProbePossible`;
- Artifact/audit para cada preflight.

Dogfood local com DB `/tmp/aios-run34-smoke.sqlite`:

- caminho pronto: proposal `gEh-8kFUWGhh`, artifact `x_VjY1Om_PtD`,
  repo `antonio-mello-ai/crewdock`, `ready=true`, `workspaceReady=true`,
  `baseBranchVisible=true`, `safePushProbePossible=true`,
  `pushProbe.status=passed`, comando redigido com
  `https://x-access-token:[REDACTED]@github.com/antonio-mello-ai/crewdock.git`;
- caminho bloqueado: proposal `9qjBaZqGE54f`, artifact `ph-Rjv3Mmwl9`,
  repo `openai/symphony`, HTTP 400, `failedGates=[repo_allowlist]`;
- executor com proposal bloqueada aprovada internamente retornou HTTP 400
  `preflight_blocked`.

Validacao:

- `npx turbo build --filter=@aios/shared --filter=@aios/daemon --filter=@aios/mcp-server`
  passou.
- `git diff --check` passou.
- `npx turbo build` passou.

Merge/deploy:

- PR `#120` mergeado em `main` no commit `3cbf02d`;
- issue `#115` fechada;
- CT165 fast-forward ate `3cbf02d`;
- CT165 build:
  `npx turbo build --filter=@aios/daemon --filter=@aios/mcp-server --force`
  passou;
- `aios-daemon` reiniciado e `active`;
- `GET https://api.felhen.ai/api/health` -> 200;
- operating snapshot publico com service token -> 200,
  `overallStatus=healthy`, 5 cards;
- rota nova validada em loopback CT165:
  `/api/company-brain/external-action-proposals/not-found/github-pr/preflight`
  -> 404 esperado (`proposal not-found not found`).

### AIOS-RUN-35 implementation checkpoint

Issue `#116` foi implementada localmente em
`aios-run-35-pr-proposal-governance`.

Entregue:

- hooks web para preflight/execute PR:
  `usePreflightCompanyBrainGitHubPrWriteback` e
  `useExecuteCompanyBrainGitHubPrWriteback`;
- preflight hook preserva respostas HTTP 400 com `data` estruturado para a UI
  mostrar gates bloqueados;
- Safety Dashboard renderiza `github_pr_create` como proposta first-class:
  repo/source/base, WorkItem, AgentRun, patch packet, signature, titulo, body,
  diff stat, commits, validations, policy/preflight badges;
- review de `github_pr_create` exige actor + rationale antes de approve,
  reject, preflight e execute;
- controles `Preflight PR` e `Open PR` visiveis; executor segue gated por
  approval + policy/preflight backend.

Dogfood local com DB `/tmp/aios-run35-smoke.sqlite`:

- proposal aprovada via API normal, sem SQLite: `FVu4gopIQZVf`, WorkItem
  `FZ61LXKmy4BA`, AgentRun `LQNejrEenoFm`, `approvalStatus=approved`,
  `approvedBy=codex:run35-smoke`, audit `approved`;
- preflight da aprovada: `status=ready`, artifact `fkFsMuTGCYSO`,
  `pushProbe=passed`;
- proposal rejeitada via API normal, sem SQLite: `Jogid6M8WCyt`, WorkItem
  `Qb_h9I83CObT`, AgentRun `NhDB2sZ-UdQX`, `approvalStatus=rejected`,
  `executionStatus=cancelled`, audit `rejected`;
- Playwright em `http://localhost:3100/company-brain` confirmou textos
  `github_pr_create`, `Preflight PR`, `Open PR` e `patch packet`, com 0 erros
  de console em sessao limpa depois de subir o daemon com
  `AIOS_CORS_ORIGINS=http://localhost:3100`.

Validacao parcial:

- `git diff --check` passou;
- `npx turbo build --filter=@aios/web --filter=@aios/shared` passou.
- `npx turbo build` passou.
