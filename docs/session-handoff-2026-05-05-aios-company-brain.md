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

Proximo corte recomendado: Slack threads/incremental sync, depois GitHub PR/CI watcher real, GitHub notifications watcher e somente depois writeback controlado com `action_policy`, `risk_class`, HITL e audit trail.

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

Objetivo da sessao: desenhar ou implementar apenas com politica explicita o proximo corte apos GitHub Notifications Watcher v0. O proximo tema e writeback controlado com `action_policy`, `risk_class`, HITL e audit trail; nao iniciar mutacao externa sem escopo/risco aceitos.

Antes de editar, confirme git status, commit atual, schema atual, rotas atuais e leia o `corp` atual. Depois implemente um corte pequeno e validavel:
- especificar politica de writeback controlado antes de qualquer mutacao externa;
- preservar provenance, status e human review;
- expor em API/UI/MCP ou summary quando fizer sentido;
- manter writeback externo bloqueado sem HITL/action_policy explicita.

Nao mover logica de verticais para o core. ERP e Juntos em Sala entram como fontes/dogfood/adapters, nao como schema do runtime.

Validar com build/testes relevantes e documentar qualquer residual em docs/backlog.md ou nova nota de handoff.
```
