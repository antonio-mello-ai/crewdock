# CrewDock — Backlog

## Direcional P0 - Company Brain / YC Thesis

Fonte de produto: `../../../../corp/docs/action/aios-product-roadmap.md`.
Boundary local: `docs/company-brain-direction.md`.

Status Slice 1 em 2026-05-05 23h BRT: primeiro kernel operacional implementado em codigo para strategy + goal/cadence + evidence + work item + workflow run + gates + provenance. O corte cobre `Source`, `Artifact`, `StrategicPriority`, `Goal`, `Milestone`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `WorkflowStep` e `ArtifactLink`; `Decision`, `AgentContext` e `ImprovementProposal` continuam para Slice 2+.

Status Watcher v0 em 2026-05-06: camada inicial implementada para transformar schedules/jobs em watchers ligados ao Company Brain, monitorando fontes e workflows sem depender de sessao interativa aberta. O corte cobre `Watcher`, `WatcherRun`, summary/API/UI/MCP e run manual que gera outputs internos com provenance/action policy.

Status Closed Loop v0 em 2026-05-06: implementado o loop minimo `WatcherRun -> Artifact -> Signal -> AlignmentFinding -> GuidanceItem`, com `Signal` no envelope do AutoImprove Core, classificacao contra priority/goal, guidance com status/feedback e exibicao em API/UI/MCP. Sem writeback externo automatico.

Status Guidance Feedback v0 em 2026-05-06: `GuidanceItem` agora pode ser atualizado via API/UI/MCP com `status`, `feedback_status`, `feedback_note` e `feedback_at`, mantendo o loop interno sem writeback externo.

Status Decision v0 em 2026-05-06: `Decision` implementado como objeto horizontal do Company Brain com racional, owner, artifacts fonte, priorities/goals, status, visibility e provenance.

Status Strategy Tradeoff v0 em 2026-05-06: `StrategyTradeoff` implementado como objeto de primeira classe para tradeoffs, constraints, non-goals, riscos, dependencias e principios, ligado a priority/decision/artifacts com accepted/rejected options, risk_class, visibility e provenance.

Status Artifact Insights Extractor v0 em 2026-05-06: extractor interno/manual-assistido implementado para transformar `Artifact` existente em candidatos de `Decision` e/ou `Signal` com provenance `extractor:artifact_insights`, review pendente, dedupe por artifact e sem auto-approve ou writeback externo.

Status Decision Review v0 em 2026-05-06: decisions candidates podem ser aceitas, rejeitadas, supersedadas ou arquivadas via API/UI/MCP, atualizando `decided_at` quando aceitas e provenance de review sem writeback externo.

Status Signal Guidance Extractor v0 em 2026-05-06: signals existentes podem gerar `AlignmentFinding` + `GuidanceItem` candidatos via API/UI/MCP, com classification derivada de priority/goal/work item, provenance `extractor:signal_guidance`, review pendente e dedupe por signal.

Status AgentContext v0 em 2026-05-06: `AgentContext` implementado como contexto executavel gerado a partir de conhecimento aprovado, com target agent, source knowledge IDs, markdown content, status, validation status e provenance.

Status ImprovementProposal v0 em 2026-05-06: `ImprovementProposal` implementado para o loop AutoImprove interno, com signals, hypothesis, change class, patch ref, validation plan, impact review e promotion status, sem auto-apply.

Status Local Docs Importer v0 em 2026-05-06: importer read-only para markdown/text local implementado via API/MCP, gerando `Source` + `Artifact` com hash, raw_ref, metadata e provenance.

Status GitHub Issues Sync Adapter v0 em 2026-05-06: adapter read-only real implementado via API/UI/MCP, sincronizando issues para `Source` + `Artifact` + `WorkItem` canonico com provenance, links e source health, sem writeback externo.

Status Adoption Dashboard v0 em 2026-05-06: dashboard derivado do Company Brain implementado via summary/API/UI/MCP, mostrando frentes por source, estágio de closed loop, work items sem priority/goal, gates pendentes, SLA risk, source health e guidance aberta.

Status Source Health v0 em 2026-05-06: relatório dedicado por source implementado via summary/API/UI/MCP, com freshness, ultimo sync, erro, volumes de artifacts/work items/workflow runs/signals/watchers/guidance e issue kinds.

Status Slack Ingestao v0 em 2026-05-06: importer manual/read-only para mensagens Slack implementado via API/UI/MCP, gerando `Source` + `Artifact` `slack_message` com metadata, hash, raw_ref e provenance, com dedupe por raw_ref e sem postar/mutar Slack.

Status Slack API Adapter v0 em 2026-05-06: adapter real/read-only implementado via API/UI/MCP usando `SLACK_BOT_TOKEN`, lendo mensagens recentes de canal selecionado e gerando `Source` + `Artifact` `slack_message` com `createdFrom=adapter:slack_channel`, metadata, raw_ref, hash, provenance e `actionPolicy=observe_only`. Dogfood validado em `#aios-runtime`, sem writeback externo automatico.

Status Slack Threads/Incremental Sync v0 em 2026-05-06: adapter Slack evoluido para sync incremental por source (`lastSyncAt` -> `oldest`), opcao thread-aware com `includeThreads/threadLimit`, artifacts para replies com metadata de thread e resposta API/MCP/UI com `threadsSeen`, `repliesSeen`, `oldestUsed`, `latestTs`, `incremental` e `includeThreads`. Read-only e sem postar/mutar Slack.

Status GitHub PR/CI Watcher v0 em 2026-05-06: watcher real/read-only `watcher-github-pr-ci-v0` implementado para PRs, commit statuses e check-runs, gerando `Artifact` `github_pr_ci`, `WatcherRun` e Signals AutoImprove para CI pending/failure/error com provenance e `actionPolicy=observe_only`. Sem writeback GitHub.

Status GitHub Notifications Watcher v0 em 2026-05-06: watcher real/read-only `watcher-github-notifications-v0` implementado para a inbox autenticada do GitHub, gerando `Artifact` `github_notification`, `WatcherRun` e Signals AutoImprove para notificacoes unread, sem marcar notificacoes como lidas e sem writeback GitHub.

Status Demo Felhen v0.1 em 2026-05-06: runner interno/API/UI/MCP implementado para criar uma cadeia demonstravel strategy -> goal -> evidence -> work item -> workflow run -> signal -> finding -> guidance -> improvement proposal, com Adoption Dashboard em `improving` e Source Health healthy.

Status AIOS Briefing Watcher v0 em 2026-05-06: seed `watcher-aios-briefing-v0` implementado sobre a camada existente de Watcher/WatcherRun, com `actionPolicy=observe_only`. O run gera Artifact interno `aios_briefing` com secoes estruturadas de decisions, tradeoffs, guidance aberta, findings, source health, adoption dashboard, work sem priority/goal, gates/SLA e proximos passos; emite Signals opcionais apenas para gaps claros com envelope AutoImprove e expose o ultimo briefing em summary/API/UI/MCP. Sem Slack/GitHub/writeback externo.

Status Operating Cadence v0 em 2026-05-06: cadencia diaria/polling implementada sem scheduler paralelo e sem instalar cron/systemd. O corte usa `Watcher.schedule`, `Watcher.nextRunAt` e `WatcherRun` com `triggerRef=schedule://...` para agendar `watcher-aios-briefing-v0` e `watcher-github-pr-ci-v0` via API/MCP `operating-cadence/run`. Core Readiness, Source Health, Adoption Dashboard e AIOS Briefing diferenciam runs manuais vs agendados, mostram ultimo run agendado, proximo run esperado e gaps stale/due. GitHub PR/CI gera artifact de snapshot mesmo quando nao ha PR novo. Tudo permanece `observe_only`.

Status Gate Closure Ritual v0 em 2026-05-06: ritual diario read-only implementado para classificar `WorkflowRun` com gate `pending/blocked/failed` e workflow/goal SLA `at_risk/breached`, retornando itens com severity, owner, work/goal links, rationale e recommendedAction. Exposto em summary/API `/gate-closure-ritual`, UI, MCP e AIOS Briefing (`gate_closure`), e usado no Core Readiness para gaps diarios. Sem alterar WorkflowRun, sem writeback externo.

Status AgentContext Daily Handoff v0 em 2026-05-06: gerador interno/read-only implementado em API `/agent-contexts/daily-handoff`, UI e MCP, criando `AgentContext` `ready/needs_review` para `targetAgent=codex` a partir do ultimo briefing, Gate Closure Ritual, Operating Cadence, Source Health, guidance aberta e decisions propostas. O contexto inclui contrato operacional, foco de gate closure, open guidance, briefing next steps, sourceKnowledgeIds e provenance `company_brain:daily_agent_handoff`. Nao roda agente, nao aplica patch e nao faz writeback.

Status Design Partner Operating Pack v0 em 2026-05-06: pacote documental reproduzivel criado em `docs/company-brain-design-partner-operating-pack.md`, consolidando demo seed, operating cadence, gate closure, daily handoff, roteiro de demo, fronteiras de dados, reset e criterios de aceite. Sem codigo novo e sem mutacao externa.

Status Review Cohesion v0 em 2026-05-06: fila unificada derivada para Decision/Signal/AlignmentFinding/Guidance candidates implementada em summary/API/UI/MCP. O corte mostra decisions propostas, signals sem finding, findings sem guidance e guidance aberta com feedback pendente, com next action, severity, provenance e acoes internas de review/extracao/feedback. Sem writeback externo.

Status Writeback Governance v0 em 2026-05-06: politica A/B/C de `risk_class` + `action_policy` implementada com fila interna `ExternalActionProposal`, geracao a partir de `GuidanceItem` aceito, approve/reject por HITL, execution status e audit trail completo em API/UI/MCP. Slack/GitHub writeback real permanece bloqueado; aprovar proposta nao executa mutacao externa.

Status GitHub Comment Writeback v0 em 2026-05-06: executor real restrito a `ExternalActionProposal` aprovada, `destinationType=github`, `actionType=comment`, `riskClass=B`, `actionPolicy=writeback_allowed`, issue/PR comment, dry-run previo, `GITHUB_TOKEN/GH_TOKEN`, marker de idempotencia e audit trail. Sucesso registra `executionStatus=completed`, `externalId` e `externalUrl`; erro registra `failed/errorSummary`. Sem label/assign/close/reopen/merge/deploy/notification read/Slack.

Status Slack Thread Reply Writeback v0 em 2026-05-06: executor real restrito a `ExternalActionProposal` aprovada, `destinationType=slack`, `actionType=thread_reply`, `riskClass=B`, `actionPolicy=writeback_allowed`, reply em thread existente, dry-run previo, `SLACK_BOT_TOKEN`, marker de idempotencia e audit trail. Sucesso registra `executionStatus=completed`, `externalId` e `externalUrl/permalink`; erro registra `failed/errorSummary`. Sem mensagem fora de thread, DM, edit/delete, react, pin, invite, topic, rename, GitHub action nova ou risk C/unknown. Dogfood real validado em thread controlada `#aios-runtime`, com replay retornando `already_completed` e um unico marker na thread.

Status Writeback Safety Dashboard v0 em 2026-05-06: dashboard derivado/read-only implementado em summary/API/UI/MCP para auditar writeback externo: completed GitHub/Slack writes, approved-ready proposals, pending approvals, falhas, rejeicoes, bloqueios, risk C/unknown, refs externas faltantes e duplicacoes evitadas por idempotencia. Sem novas mutacoes externas.

Status Writeback Preview Gate v0 em 2026-05-06: GitHub comment e Slack thread reply agora exigem preview/dry-run registrado depois da aprovacao antes de executar. Tentativa de execute sem preview grava audit event `*_preview_required`, preserva `executionStatus` recuperavel e nao chama APIs externas de escrita. UI so habilita Execute/Reply em `dry_run`; MCP descreve a precondicao.

Status Writeback HITL Rationale v0 em 2026-05-06: approve/reject de `ExternalActionProposal` exige actor humano e rationale (`note` para approve, `rejectionReason` ou `note` para reject). Audit trail de aprovacao/rejeicao inclui `payloadHash` e `idempotencyKey`, mantendo payload/destino revisaveis antes de execute.

Status Retry Safety / Idempotent Execution Review v0 em 2026-05-06: GitHub comment e Slack thread reply agora passam por review derivado antes de execute, com politica explicita de retries, snapshots de payload/destination/idempotency na aprovacao e no preview, bloqueio de payload/destino/idempotency alterados, preview antes de aprovacao, preview stale, failed retry sem rationale e replays completed/already_completed. Safety Dashboard/API/UI/MCP expõem `ready_to_execute`, `needs_preview`, `needs_reapproval`, `retryable_failed`, `unsafe_failed`, `payload_mismatch`, `destination_mismatch`, `duplicate_prevented`, `completed` e `blocked`.

Status Writeback Policy Matrix v0 em 2026-05-06: `docs/writeback-policy-matrix.md` versiona a matriz A/B/C para `ExternalActionProposal`, actions executaveis, preview-only candidates e bloqueios explicitos antes de label/status/assign.

Status GitHub Label Proposal v0 em 2026-05-06: `ExternalActionProposal` agora aceita `label/github_label` para GitHub em modo preview-only, com payload de labels/mode, API/UI/MCP de preview, audit `github_label_previewed`, Safety Dashboard bloqueando execucao e nenhuma rota de execute/writeback real.

Status GitHub Status/Check Proposal v0 em 2026-05-06: `ExternalActionProposal` agora aceita `github_status/github_check` para feedback operacional de PR/CI, com payload repo/pullNumber/sha/context/name/state/conclusion/title/summary/description/targetUrl/rationale, API/UI/MCP de preview e audit `github_status_check_previewed`. `github_check` e status fora da allowlist continuam preview-only/bloqueados.

Status Writeback Audit Review v0 em 2026-05-06: Safety Dashboard agora expõe `auditReview` derivado por proposal com contagem de eventos, ultimo evento/ator, approval/preview/execution timestamps, duplicate prevention, refs externas, erro, payloadHash atual, idempotencyKey e destinationRef. UI mostra esses campos e review flags para revisao humana antes de qualquer executor real de label.

Status GitHub Label Executor v0 em 2026-05-06: `github_label` agora tem executor real restrito a Risk B, `writeback_allowed`, HITL approval/rationale, preview apos aprovacao, Retry Safety `ready_to_execute`, mode `add`, um unico label e allowlist local (`AIOS_GITHUB_LABEL_WRITEBACK_ALLOWLIST`, default dogfood `antonio-mello-ai/crewdock#3=enhancement`). Antes de qualquer write, o executor le labels atuais; se o label ja existe, grava `github_label_completed_noop`, retorna `completed_noop`, nao chama write API e reexecucao retorna `already_completed`.

Status Post-Writeback Audit Review v0 em 2026-05-06: Safety Dashboard agora distingue outcomes pos-execucao sem novas mutacoes: `executionEvent`, `completedNoop`, `mutationAttempted`, stats para label completado/noop, noops totais e mutacoes externas tentadas. UI mostra outcome por item e metricas `labels`/`noop`.

Status Writeback Negative-Path Review v0 em 2026-05-06: Safety Dashboard agora expõe `blockReasons` derivados e stats `previewOnlyBlockedCount`, `githubLabelBlockedCount` e `githubStatusCheckBlockedCount`, deixando legivel por que label remove/multi-label/fora da allowlist, GitHub check-run e GitHub status fora da allowlist continuam bloqueados sem executor.

Status Writeback Adapter Summary v0 em 2026-05-06: Safety Dashboard agora expõe `adapterSummaries` por adapter (`github_comment`, `github_label`, `github_status_check`, `slack_thread_reply`, `other`) com totais de proposals, completados, noops, mutacoes tentadas, bloqueados, prontos, falhas e latestAt. UI mostra o resumo por adapter sem nova mutacao externa.

Status Writeback Audit Trail Export v0 em 2026-05-06: audit trail de `ExternalActionProposal` agora e exportavel por API/MCP em modo read-only, com filtros por adapter/proposal, `latestAuditTrail` no Safety Dashboard e UI mostrando ultimos eventos. Inclui reviewStatus e blockReasons junto de cada evento.

Status Writeback HITL Runbook v0 em 2026-05-06: `docs/writeback-hitl-runbook.md` define checklist de preflight, gates obrigatorios, dogfood, template de aprovacao humana e acoes bloqueadas antes de qualquer novo executor externo.

Status Writeback Audit Search/Export v0 em 2026-05-06: audit trail agora suporta filtros read-only por destinationType, actionType, riskClass, executionStatus, actor, date range, proposalId, guidanceId, idempotencyKey, externalUrl e busca textual incluindo blockReasons. API suporta `format=csv`, MCP aceita os novos filtros e Safety Dashboard expõe `destinationSummaries` por repo/canal.

Status Writeback Evidence Packet v0 em 2026-05-06: cada `ExternalActionProposal` agora tem pacote read-only com proposal, guidance, signal/finding/work/workflow links, executionReview, auditReview, audit trail, approval/preview/execution events, payload hashes, destination refs, idempotency keys, external refs e timeline. Exposto em API/MCP e UI.

Status Operating Loop Metrics v0 em 2026-05-06: Safety Dashboard agora mede o loop guidance -> proposal -> approval -> preview -> execution, com contagens/taxas de blocked/rejected/failed/completed/noop, duplicacoes evitadas, mutacoes tentadas e approvals/previews stale. Exposto em summary/API/UI/MCP sem novas mutacoes externas.

Status AIOS Briefing Writeback Safety v0 em 2026-05-06: briefing interno agora inclui secao `writeback_safety` com approvals pendentes, falhas, execucoes externas recentes, duplicacoes evitadas, bloqueios de safety/policy, stale approvals/previews e proximos passos de auditoria. Artifact de briefing guarda stats/metrics de writeback em metadata. Sem chamadas externas.

Status Adoption Dashboard Writeback Maturity v0 em 2026-05-06: Adoption Dashboard agora reflete maturidade de writeback por source/projeto, com stage `none/proposal_created/pending_review/preview_ready/executed_or_noop/blocked_or_failed`, contadores de proposals, completed/noop, blocked/failed, duplicate prevention, mutation attempts, stale review, ultimo audit e gap `writeback_needs_review`. Exposto em summary/API/UI/MCP sem novas mutacoes.

Status Writeback Audit UI Filters/Export v0 em 2026-05-06: UI `/company-brain` agora expoe busca/export do audit trail com filtros por adapter, destinationType, actionType, riskClass, executionStatus, actor, proposalId, guidanceId, idempotencyKey, externalUrl, date range e limit, alem de link CSV usando a API read-only existente. Sem novas mutacoes.

Status Writeback Evidence Packet JSON Export v0 em 2026-05-06: endpoint de evidence packet aceita `download=1` e retorna JSON formatado com `Content-Disposition`; UI adiciona link `JSON` por proposal e `Export evidence JSON` no packet carregado. Sem novas mutacoes.

Status Writeback Evidence Packet Index v0 em 2026-05-06: Safety Dashboard agora inclui `evidencePacketIndex` por proposal com status de review, contagem de audit events, links existentes para guidance/signal/finding/work/workflow, hash atual, external URL e path de export JSON. UI mostra o indice com link JSON. Sem novas mutacoes.

Status Writeback Evidence Integrity Gaps v0 em 2026-05-06: Evidence Packets e Safety Dashboard agora analisam proposals de forma read-only e destacam gaps de integridade (`missing_guidance_link`, `missing_signal_or_finding_link`, `missing_work_item_or_workflow_link`, eventos de approval/preview/execution ausentes, hashes/idempotency/refs externas faltantes, stale approval/preview, rationale insuficiente e provenance incompleta). API/UI/MCP expõem filtros por severity, gap type, adapter e proposal; briefing inclui contadores de writeback safety. Dogfood validado com proposal completo sem gaps e proposals temporarias ruins cobrindo todos os tipos.

Status Writeback Policy Matrix update em 2026-05-06: `docs/writeback-policy-matrix.md` agora reflete a politica de GitHub interno privado allowlisted: `github_status/github_check`, `assign/unassign` e `mark_notification_read` podem ser tratados como Classe B planejada sob allowlist, approval, preview, HITL rationale, retry safety, idempotency e audit trail. Executores reais ainda precisam de corte proprio; close/reopen/merge/deploy/delete/permissions/secrets/customer repos seguem bloqueados.

Status Evidence Remediation Suggestions v0 em 2026-05-06: gaps de integridade agora geram sugestoes read-only de remediacao com action kind, target field, human review required, new proposal required, `actionPolicy=observe_only` e `executionBlocked=true`. Exposto em Safety Dashboard, Evidence Packet JSON, API/UI/MCP e briefing. Dogfood validado com DB bom sem sugestoes e DB ruim com 15 sugestoes, 13 exigindo revisao humana e 4 sugerindo nova proposal.

Status GitHub Status Executor v0 em 2026-05-06: `github_status` agora tem executor real restrito a repo privado interno allowlisted, Risk B, `writeback_allowed`, HITL approval/rationale, preview apos aprovacao, Retry Safety `ready_to_execute`, SHA explicito, contexto `aios/dogfood-status` e state `success`. O executor valida repo privado, consulta statuses atuais, evita duplicacao por status compativel, grava `github_status_set` ou `github_status_completed_noop`, externalId/externalUrl e audit trail. `github_check` segue sem executor real.

Status Writeback Target Summary v0 em 2026-05-06: Safety Dashboard, Evidence Packet e Evidence Packet Index agora expõem `targetSummary` derivado/read-only para tornar proposals legiveis por alvo sem abrir o JSON completo. Para `github_status`, o resumo mostra repo, SHA curto, contexto e state; UI mostra o alvo no indice e no packet carregado.

Status GitHub Status Writeback Observability v0 em 2026-05-06: audit/search/export agora tem filtro `event` para eventos como `github_status_set`, `github_status_completed_noop` e `github_status_failed`; Audit Trail CSV inclui `targetSummary` e `githubStatus`; Evidence Packet inclui `githubStatus` normalizado com repo, SHA/shortSha, context, state, statusId, statusUrl, externalUrl, repoPrivate, allowlistMatched, existingStatusesRead, duplicate/noop e mutation flags. Safety Dashboard/UI separam comments, labels, statuses e Slack replies; AIOS briefing inclui status writeback recente.

Status Writeback Target Observability v0 em 2026-05-06: Safety Dashboard/Summary agora expõem `targetObservabilitySummaries` read-only por repo/canal/alvo, com contagens por adapter, execution status, review status, stale approval/preview, duplicates, mutations, repoPrivate e ultimo target summary. UI ganhou bloco "Target observability" e o AIOS briefing passou a listar os principais targets de writeback safety.

Status Writeback Proposal/Target Review v0 em 2026-05-06: criada visao read-only `writebackProposalTargetReview` no Summary e API `/external-action-proposals/proposal-target-review`, com filtros por proposal/target/destination/action/risk/review, consolidando target rollup, safety status, block reasons, hash/ref comparisons, approval/preview/execution events, evidence completeness, remediation count, GitHub status evidence e next action. Exposto tambem em MCP e UI.

Status Evidence/Provenance Graph v0 em 2026-05-06: criado grafo read-only `evidenceGraph` no Summary e API `/evidence-graph`, com filtros por root kind/id e nós para source, artifact, priority, goal, work item, workflow run, signal, alignment finding, guidance item, external action proposal e writeback target. Arestas cobrem source/artifact, artifact links, priority/goal/work, workflow, signal, finding, guidance e proposal->target. Exposto em MCP e UI.

Status Company Brain Timeline v0 em 2026-05-06: criado `timeline` read-only no Summary e API `/timeline`, com escopos `all`, `proposal`, `target` e `source`, reunindo source sync, artifact ingest, watcher run, work item, workflow, signal, finding, guidance, proposal created e audit events de approval/preview/execution. Exposto em MCP e UI com contadores de proposal/target/source/external write events.

Status Saved Audit Views v0 em 2026-05-06: criado `savedAuditViews` read-only no Summary e API `/saved-audit-views`, com presets derivados para audit trail, proposal/target review, evidence graph e timeline. Cada view traz surface, filtros, itemCount, exportUrl, prioridade de review e updatedAt. Exposto em MCP e UI, sem persistir estado mutavel.

Status Writeback Policy Simulator v0 em 2026-05-06: criado `writebackPolicySimulator` read-only no Summary e API `/writeback-policy-simulator`, com matriz de casos para GitHub comment/label/status/check, Slack thread reply e Risk C blocked. O simulador retorna approval/execution policy, preview-only, executor availability, required gates, blocked actions e rationale. Exposto em MCP e UI, sem criar proposal ou executar writeback.

Status Preview/Replay Simulator v0 em 2026-05-06: criado `previewReplaySimulator` read-only no Summary e API `/external-action-proposals/preview-replay-simulator`, analisando proposals existentes com previews locais puros, payload hash, idempotency key, terminal state, duplicate/noop flags, retry rationale e replay safety. Exposto em MCP e UI sem chamar write APIs nem gravar audit trail.

Status Markdown Evidence Packet Export v0 em 2026-05-06: Evidence Packet agora pode ser exportado como Markdown via API `format=markdown` e UI, com proposta, hashes/destinos, eventos de approval/preview/execution, links de evidence, gaps/remediation, GitHub status evidence e audit trail. Sem novas mutacoes.

Status AIOS Briefing Audit/Readiness v0 em 2026-05-06: briefing interno ganhou secoes `audit_readiness` e `execution_readiness`, consolidando proposal/target review, evidence graph, timeline, saved audit views, policy simulator e preview/replay simulator. Metadata do artifact registra stats desses subsistemas e a UI mostra todas as secoes do briefing. Sem novas mutacoes.

Status Adoption Dashboard Audit Maturity v0 em 2026-05-06: Adoption Dashboard agora calcula `auditReadiness` por projeto/source com stage, score, targets, proposal review needs action, evidence integrity gaps, remediation suggestions, graph/timeline coverage, preview/replay blockers, retry rationale e next action. UI mostra stage/score/targets/gaps e o briefing inclui contadores de audit-ready/readiness review. Sem novas mutacoes.

Status MCP Markdown Evidence Export v0 em 2026-05-06: MCP ganhou fetch textual e tool `get_company_brain_writeback_evidence_packet_markdown`, retornando o Markdown read-only do evidence packet com proposta, hashes, eventos, evidence links, gaps, GitHub status evidence e audit trail. `get_company_brain_adoption_dashboard` agora descreve audit readiness/writeback maturity. Sem novas mutacoes.

Status AIOS Core Operational Readiness v0 em 2026-05-06: criado relatório `docs/company-brain-operational-readiness.md` e visão derivada `coreReadiness` no summary/API/UI/MCP, classificando 15 modulos do core como `operational/dogfooded/read_only_only/preview_only/needs_real_adapter/blocked_by_policy/missing` e mapeando gaps de uso diario, demo, design partner, polish e mutacao externa. Dogfood inicial retornou `overallStatus=internal_closed_loop_ready`, 15 modulos operational/dogfooded, 0 missing, 2 gaps de uso diario e 1 gap de mutacao externa; apos Operating Cadence v0, o DB temporario do corte retornou `dailyUseBlockingGapCount=0`, `automatedWatcherCount=2`, `staleCadenceCount=0`, `dueCadenceCount=0`.

Status Operating Surface v0 em 2026-05-07: criada rota `/company-brain/operating` como superficie diaria separada da pagina construtora `/company-brain`, alimentada por API compacta `/api/company-brain/operating-snapshot` e MCP read-only `get_company_brain_operating_snapshot`. A tela mostra cards de AIOS Briefing, Operating Cadence, Gate Closure Ritual, Source Health e Daily Agent Handoff com estado, ultima atualizacao, alerta principal e acao primaria; inclui `Run Operating Cadence`, `Run briefing`, geracao de handoff, Copy e Download `.md`, alem de timeline recente reaproveitada. Sem writeback externo.

Status Demo/Readiness Cleanup v0 em 2026-05-07: Demo Seed v0.2 agora cria duas `ExternalActionProposal` internas de exemplo (`Risk A` preview-only e `Risk B` pending approval) sem executor externo; Source Health deixou de marcar `no_work_items`/`no_signals` para sources runtime/read-only de evidencia como briefing e PR/CI poll; `design_partner_operating_pack` reconhece o pack documental existente; `/api/company-brain/preview-replay-simulator` virou alias top-level; runbook de Operating Cadence documenta `watcherRunId`, `artifactsCreated` e `signalsCreated`; `docs/company-brain-artifact-field-canonical.md` define `artifactType` como campo canonico.

Status Operating Cycle Friction Closure v0 em 2026-05-07: fechadas as friccoes 3-6 do ciclo real sem feature nova e sem writeback externo. O briefing gerado por Operating Cadence agora reflete o estado pos-run (`2/2 scheduled watchers active`, `0 due`) porque o PR/CI roda antes do briefing e o artifact e atualizado apos persistir o `WatcherRun`. `RunOperatingCadenceResponse.runs[]` agora inclui `artifactId`; `gateClosureRitual` e `operatingSnapshot` expõem `overallStatus`, `summary` e `totals`; `coreReadiness.overallStatus` distingue `daily_use_blocked` e `demo_not_ready` de `design_partner_not_ready`. Dogfood local validou `activeScheduledWatcherCount=2`, `runs[].artifactId` preenchido, `operatingSnapshot.overallStatus=attention` e `coreReadiness.overallStatus=daily_use_blocked`.

Status Operating Cycle deploy real em 2026-05-07: CT165 atualizado ate `e518f3d`, daemon buildado/reiniciado, Cloudflare Pages publicado e endpoints reais validados (`/api/health`, `/api/company-brain/operating-snapshot`, `/company-brain/operating`). Primeiro run real revelou falha read-only de PR/CI em repo privado sem writeback externo; `e518f3d` permitiu retry do GitHub PR/CI watcher a partir de `status=error`. Rerun em DB persistente fechou com PR/CI e briefing `completed`, `runs[].artifactId` preenchido, `activeScheduledWatcherCount=2`, `staleCadenceCount=0`, `dueCadenceCount=0`, `errorCadenceCount=0` e snapshot real `4/5 operating cards ready`.

Status Production Operating Loop v0 em 2026-05-07: implementado e deployado runner recorrente interno no daemon, configuravel por `AIOS_COMPANY_BRAIN_OPERATING_LOOP_*`, sem cron/systemd timer novo e sem writeback externo. O loop checa watchers due/stale, roda somente `watcher-aios-briefing-v0` e `watcher-github-pr-ci-v0` com `actionPolicy=observe_only`, usa lock em memoria e grava provenance `schedule://...`. Exposto em `/api/company-brain/operating-loop`, `operatingCadence.operatingLoop`, `coreReadiness.operatingLoop`, Operating UI e MCP `get_company_brain_operating_loop`. Dogfood local validou run automatico com `watcherRunsCreated=2`, `artifactsCreated=2`, `activeScheduledWatcherCount=2`, `staleCadenceCount=0`, `dueCadenceCount=0` e `dailyUseBlockingGapCount=0`. Em producao CT165, primeiro tick automatico rodou `watcher-github-pr-ci-v0` com `triggerRef=schedule://production%3Acompany-brain-operating-loop/DB8t6HVmDsX-`, `artifactId=KX7Ujpfv80MO`, `activeScheduledWatcherCount=2`, `staleCadenceCount=0`, `dueCadenceCount=0`, `dailyUseBlockingGapCount=0` e Operating Snapshot `5/5 operating cards ready`. Segundo tick confirmou recorrencia: `tickCount=2`, `runCount=1`, `skippedTickCount=1`, `lastDueWatcherIds=[]`, sem erro.

Status AIOS GitHub Roadmap Reset em 2026-05-07: issues antigas `#1` a `#6` foram triadas como legado/icebox/superseded e fechadas como `not planned`, sem apagar contexto. Criada milestone `AIOS Execution Loop v0`, labels de produto/runtime e fila ativa `#25` a `#31`: `AIOS-CLEAN-00`, `AIOS-CLEAN-01`, `AIOS-EXEC-01` a `AIOS-EXEC-05`. Sync read-only de GitHub Issues em producao criou Source `AIOS GitHub Issues active roadmap` e WorkItems canonicos para as 7 issues. Registro em `docs/action/aios-github-roadmap-reset-2026-05-07.md`.

Status AIOS-CLEAN-00 Product Surface Split em 2026-05-07: issue `#25` fechada com `/runtime` separado da entrada AIOS principal e Runtime Admin (Console/Terminal/Jobs/Schedules/Costs/Inbox/Settings) reagrupado fora do produto AIOS.

Status AIOS-CLEAN-01 GitHub Pipeline Hygiene em 2026-05-07: issue `#26` consumida. Criado `docs/aios-issues-runbook.md` com convencoes de label/title/body, mapping issue->WorkItem, fluxo de consumo por agente e mutation policy. Issues fechadas legacy (`#7` a `#24`, waves de security/perf pre-AIOS) receberam label `legacy-runtime` para ficarem fora do roadmap atual mas pesquisaveis. Sync read-only do adapter `mcp__aios__sync_company_brain_github_issues` reconciliou `Source` `AIOS GitHub Issues active roadmap` e `WorkItems` para a fila ativa.

Status AIOS-EXEC-02 WorkItem to GitHub Issue Flow v0 em 2026-05-07: issue `#28` consumida com executor governado para transformar WorkItem em GitHub Issue. Tipos novos no shared (`GitHubIssueCreateTarget`, `GitHubIssueCreateProposalPreviewResponse`, `GitHubIssueCreateWritebackResponse`, `GenerateGitHubIssueCreateProposalRequest`) e action/adapter `github_issue_create`. Daemon ganhou payload builder com marker de idempotency, allowlist `AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST`, preview `POST /api/company-brain/external-action-proposals/:id/github-issue-create/preview` e executor `POST /api/company-brain/external-action-proposals/:id/github-issue-create/execute`, com Risk B, `writeback_allowed`, HITL approval, preview-after-approval, Retry Safety, `GITHUB_TOKEN`, dedupe por marker no body, audit trail e link `externalUrl` de volta ao WorkItem. MCP tools `create`, `preview` e `execute_company_brain_github_issue_create_writeback`; UI `/company-brain` ganhou filtro/action `github_issue_create` e botoes `Preview issue` / `Create issue`. `docs/writeback-policy-matrix.md` e `docs/aios-issues-runbook.md` tratam o action_type como executable para repos internos allowlisted. Dogfood real em repo privado/allowlisted validou criacao, reexecute `already_completed`, idempotency `reused=true` e WorkItem linkado.

Status AIOS-EXEC-02 deploy real em 2026-05-07: PR #35 mergeado em `main` (`0f555e0`) e issue #28 fechada. CT165 atualizado ate `0f555e0`, `AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST=antonio-mello-ai/crewdock` configurado em `.env.prod`, daemon buildado/reiniciado e `active`; Cloudflare Pages publicado em `https://b0569eb8.crewdock.pages.dev`. Production smoke: `/api/health` -> 200; `/api/company-brain/operating-snapshot` com service token -> 200/healthy/5 de 5 cards ready; rota nova `/external-action-proposals/:id/github-issue-create/preview` respondeu `400 preview_failed` para id inexistente, confirmando deploy sem mutacao; `/company-brain/operating` e `/company-brain` -> 200 com service token. Residual: producao ainda nao tem `GITHUB_TOKEN`/`GH_TOKEN` no `.env.prod`/systemd; executor real em producao exige instalar token apropriado antes de criar issue via AIOS.

Status AIOS-EXEC-01 Execution Command Center v0 em 2026-05-07: issue `#27` consumida. `/company-brain/operating` deixou de ser apenas painel de saude e passou a recomendar o proximo WorkItem em uma secao `Next Work` separada dos `Health` cards. Backend acrescentou `buildNextWork` em `packages/daemon/src/routes/company-brain.ts`, novo endpoint `GET /api/company-brain/next-work` e campo `nextWork` em `OperatingSnapshot`. Ranking determinismo: priority > goal > prefixo `AIOS-` > `dueAt` > issue number > id. Recommendation traz workItem completo, rationale, priority/goal links, acceptanceCriteria parseados do body via secao `## Acceptance Criteria`, evidence linkada (source/artifact/signal/guidance), branchSuggestion derivada do titulo e `agentPromptMarkdown` pronto para copiar. UI tem botao Copy + Download `.md` para o prompt. Empty state explica reason + nextSteps quando nao ha candidato. MCP ganhou tool read-only `get_company_brain_next_work`. Sem auto execucao, sem writeback externo, sem connector novo. Smoke local com seed `Felhen Demo v0.1` validou rationale completo, evidence linkada, agent prompt e empty state com DB vazio. Production smoke em CT165/Pages validou `nextWork` apontando para `#28` apos sync aberto de GitHub Issues, com `overallStatus=healthy`, `candidatesConsidered=4` e `activeWorkItemCount=4`.

Proximo corte planejado: consumir a proxima issue aberta da milestone `AIOS Execution Loop v0`, atualmente `#29`. Continuar automaticamente em cuts cobertos por policy/read-only/audit/docs/UI/MCP/dogfood; para mutacoes externas novas, usar executor allowlisted + HITL + preview-after-approval + Retry Safety, sem parar por default quando o alvo for repo interno privado e a policy ja estiver documentada.

- [x] **Company Brain schema v0** — adicionar objetos horizontais no daemon: `Source`, `Artifact`, `StrategicPriority`, `Decision`, `Signal`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `AlignmentFinding`, `GuidanceItem`, `AgentContext` e `ImprovementProposal`
- [x] **Source registry + raw artifact store** — guardar artifacts com `source`, `raw_ref`, author, timestamp, hash, visibility e provenance
- [x] **Watcher / Operating Loop Layer v0** — adicionar `Watcher` e `WatcherRun` no schema/tipos/API, com `source_ids`, `trigger_type`, `schedule`, `scope_query`, `target_workflow_blueprint_id`, `risk_class`, `action_policy`, `status`, `last_run_at`, `next_run_at`, `failure_policy` e `output_policy`
- [x] **Operating Cadence v0** — usar schedules/jobs existentes como superficie de disparo, sem scheduler paralelo, para rodar `watcher-aios-briefing-v0` e `watcher-github-pr-ci-v0` com provenance `schedule://`, `nextRunAt`, Source Health/Core Readiness/Briefing e runbook
- [x] **Gate Closure Ritual v0** — gerar checklist diario read-only de gates/SLA/workflow runs pendentes, exposto em summary/API/UI/MCP/briefing/core readiness, sem mutar workflows ou sistemas externos
- [x] **AgentContext Daily Handoff v0** — gerar `AgentContext` diario para agentes a partir de briefing, gate closure, operating cadence, source health e guidance aberta, sem rodar agente ou auto-apply
- [x] **Design Partner Operating Pack v0** — documentar demo seed, runbooks, fronteiras de dados, narrativa reproduzivel e criterios de aceite para design partner readiness
- [x] **Operating Surface v0** — criar `/company-brain/operating` como superficie diaria com 5 cards operacionais, run cadence, daily handoff copy/download e timeline recente, mantendo `/company-brain` como construtor/admin
- [x] **Demo/Readiness Cleanup v0** — reduzir friccoes do pack com proposals internas v0.2, Source Health menos ruidoso, alias top-level de replay, reconhecimento do design-partner pack e campo canonico `artifactType`
- [x] **Operating Cycle Friction Closure v0** — corrigir briefing pos-cadence, `runs[].artifactId`, status agregado de Gate Closure/Operating Snapshot e semantica de Core Readiness antes de deployar o ciclo diario real
- [x] **Production Operating Loop v0** — runner recorrente interno no daemon para executar watchers read-only due/stale sem sessao interativa aberta, com env config, lock, provenance, API/UI/MCP e dogfood local
- [x] **AIOS-CLEAN-00 Product Surface Split** — fazer AIOS Operating ser a entrada principal, preservar runtime antigo em `/runtime` e agrupar Console/Terminal/Jobs/Schedules/Costs/Inbox/Settings como Runtime Admin
- [x] **AIOS-CLEAN-01 GitHub Pipeline Hygiene** — manter issues GitHub como fila limpa e sincronizada ao Company Brain
- [x] **AIOS-EXEC-01 Execution Command Center v0** — recomendar proximo WorkItem e gerar prompt acionavel
- [x] **AIOS-EXEC-02 WorkItem to GitHub Issue Flow** — criar issue GitHub governada a partir de WorkItem/Guidance (preview-only v0; executor real fica para cut separado, igual `github_label_proposal_v0` -> `github_label_executor_v0`)
- [ ] **AIOS-EXEC-03 Agent Session Launcher** — gerar handoff/prompt por WorkItem e agente alvo
- [ ] **AIOS-EXEC-04 Session Result Intake** — transformar resultado de sessao em Artifact/Signal/Finding/Guidance
- [ ] **AIOS-EXEC-05 Project Pipeline View** — mostrar pipeline por projeto/repo/gate/PR
- [x] **Watcher status em Source Health / Summary** — expor status basico de watchers, ultimas execucoes, erro, artifacts/signals/work items gerados e freshness em `/api/company-brain/summary` ou tela de Source Health
- [x] **Watcher manual/simulado v0** — criar watcher manual para PR/CI ou GitHub Issues que consiga registrar uma execucao sem webhook real
- [x] **Watcher output com provenance e policy** — garantir que uma execucao de watcher consiga gerar `Artifact`, `Signal` ou `WorkItem` com provenance, `action_policy`, `risk_class` e trilha auditavel antes de qualquer writeback. Implementado para `Artifact`, `Signal`, `WorkItem`, `AlignmentFinding` e `GuidanceItem`.
- [x] **Strategy layer** — cadastrar prioridades, tradeoffs, owners, criterios de sucesso e status. Implementado com priorities, goals/cadence, decisions e strategy tradeoffs.
- [x] **Decision v0** — registrar escolhas com racional, owner, status, source artifacts, priorities/goals, visibility e provenance
- [x] **Decision/Signal extractor v0** — transformar artifacts reais em candidatos de decision/signal com provenance e review pendente, sem auto-approve
- [x] **Decision candidate review v0** — aceitar/rejeitar/supersedar decisions propostas com provenance de review e sem writeback externo
- [x] **Signal -> Finding/Guidance extractor v0** — gerar alignment finding e guidance candidatos a partir de signal existente, com provenance e review pendente
- [x] **Review Cohesion v0** — unificar candidates de decision/signal/finding/guidance em fila derivada com next action, provenance e acoes internas sem writeback externo
- [x] **Writeback Governance v0** — definir politica A/B/C, criar fila `ExternalActionProposal`, gerar proposta a partir de guidance aceita, aprovar/rejeitar com HITL e audit trail completo sem executar writeback externo
- [x] **GitHub comment writeback v0** — postar somente comentario aprovado em issue/PR GitHub com preview, idempotency marker, HITL, audit trail e sem mutacoes de status/labels/assign/merge/deploy
- [x] **Slack thread reply writeback v0** — postar somente reply aprovado em thread Slack existente com preview, idempotency marker, HITL, audit trail e sem mensagem nova fora de thread, DM, edit/delete/reaction/pin/invite/topic/rename
- [x] **Writeback Safety Dashboard v0** — auditar em summary/API/UI/MCP writebacks completados, proposals prontas, falhas, rejeicoes, bloqueios e duplicacoes evitadas antes de acoes externas mais fortes
- [x] **Writeback Preview Gate v0** — exigir preview apos aprovacao antes de qualquer execute real GitHub/Slack, com bloqueio recuperavel e audit event quando alguem tenta executar cedo demais
- [x] **Writeback HITL Rationale v0** — exigir actor e rationale para approve/reject, com payloadHash/idempotencyKey no audit trail antes de qualquer execute real
- [x] **Retry Safety / Idempotent Execution Review v0** — revisar payload/destination/idempotency aprovados vs preview vs atual antes de execute, bloquear retries inseguros, exigir rationale para failed retry e expor status/flags derivados no Safety Dashboard/API/UI/MCP
- [x] **Writeback Policy Matrix v0** — versionar em docs a matriz A/B/C de destination/action types executaveis, preview-only e bloqueados antes de labels/status/assign
- [x] **GitHub label proposal v0 preview-only** — criar e prever propostas de label GitHub com target/labels/mode/audit sem endpoint de execute e sem chamar GitHub write API
- [x] **GitHub status/check proposal v0 preview-only** — criar e prever propostas de status/check GitHub para PR/CI com target, payloadHash, idempotency e risk rationale, sem endpoint de execute e sem chamar GitHub write API
- [x] **Writeback Audit Review v0** — expor audit review derivado na fila de safety com eventos, ator, approval/preview/execution timestamps, payloadHash, idempotency, external refs, erro e flags
- [x] **GitHub label executor real v0** — executar somente label add allowlisted, aprovado e previewado; ler labels atuais antes de write; fechar como completed_noop/already_completed quando o label ja existe
- [x] **Post-Writeback Audit Review v0** — distinguir label completado/noop, mutacao tentada e execution event na Safety Dashboard/API/UI/MCP sem novas mutacoes
- [x] **Writeback Negative-Path Review v0** — expor motivos e contadores para proposals bloqueadas de label/status/check, incluindo remove, multi-label, alvo fora da allowlist e preview-only
- [x] **Writeback Adapter Summary v0** — consolidar writeback safety por adapter com completed/noop/mutation/block/ready/failed em summary/API/UI/MCP
- [x] **Writeback Audit Trail Export v0** — exportar eventos de audit trail por adapter/proposal em API/MCP e mostrar ultimos eventos na UI/Summary
- [x] **Writeback HITL Runbook v0** — versionar checklist para qualquer novo executor externo com preflight, gates, dogfood, aprovacao e bloqueios
- [x] **Writeback Audit Search/Export v0** — ampliar filtros, CSV export e resumo por repo/canal no audit trail sem novas mutacoes
- [x] **Writeback Evidence Packet v0** — gerar pacote auditavel por proposal com guidance, approval, preview, execution, retry safety, refs externas, hashes e timeline
- [x] **Operating Loop Metrics v0** — medir tempo guidance/proposal/approval/preview/execution, taxas de outcomes, duplicacoes evitadas e stale approval/preview em summary/API/UI/MCP
- [x] **AIOS Briefing Writeback Safety v0** — incluir writeback safety no briefing com pendencias, falhas, execucoes recentes, bloqueios, stale review e metadata auditavel
- [x] **Adoption Dashboard Writeback Maturity v0** — refletir maturidade de writeback por source/projeto com stage, contadores, ultimo audit e gap de safety review
- [x] **Writeback Audit UI Filters/Export v0** — expor busca, filtros e CSV do audit trail na UI sem novas mutacoes
- [x] **Writeback Evidence Packet JSON Export v0** — exportar pacote auditavel por proposal como JSON pela API/UI
- [x] **Writeback Evidence Packet Index v0** — indexar packets exportaveis no Safety Dashboard com status, audit count, links e hash
- [x] **Writeback Evidence Integrity Gaps v0** — detectar gaps de links, audit events, hashes, idempotency, refs externas, stale review, rationale e provenance em Safety Dashboard/Evidence Packet/API/UI/MCP/briefing
- [x] **Evidence Remediation Suggestions v0** — sugerir correcoes read-only para gaps de evidence/provenance/audit com human review/new proposal flags e sem mutacao externa
- [x] **GitHub status executor real v0** — criar somente commit status allowlisted em repo privado interno com SHA/context/state aprovados, preview, Retry Safety, idempotencia, audit e reexecute `already_completed`
- [x] **Writeback target summary v0** — expor resumo read-only do alvo em audit review/evidence packet/index/UI para status, check, label, comment e Slack thread
- [x] **GitHub status writeback observability v0** — filtrar/exportar eventos de status, normalizar evidence de status GitHub e mostrar statusId/context/state/SHA/repo privado no audit/evidence/UI/briefing
- [x] **Writeback target observability v0** — rollups read-only por repo/canal/alvo com adapters, statuses, stale approval/preview, duplicates, mutations, repoPrivate e ultimo target no Safety Dashboard/Summary/UI/briefing
- [x] **Writeback proposal/target review v0** — visao read-only consolidada por proposal e target com safety review, hashes, refs, eventos, evidence completeness, remediation, GitHub status evidence, API/UI/MCP
- [x] **Evidence/provenance graph v0** — grafo read-only de source/artifact/evidence/workflow/guidance/proposal/target com API/UI/MCP e filtro por root
- [x] **Company Brain timeline v0** — timeline read-only por all/proposal/target/source com source sync, artifacts, watcher runs, evidence, proposals e audit events de writeback
- [x] **Saved audit views v0** — presets read-only para audit trail, proposal/target review, evidence graph e timeline com filtros, counts, export URLs, UI e MCP
- [x] **Writeback policy simulator v0** — matriz read-only de policy/risk/action com gates, preview-only, executor availability, blocked actions, API/UI/MCP
- [x] **Preview/replay simulator v0** — analise read-only de previews locais, idempotency, terminal state, retry safety e replay bloqueado para proposals existentes
- [x] **Markdown evidence packet export v0** — exportar evidence packet como Markdown auditavel por API/UI com eventos, hashes, refs, GitHub status evidence, gaps e audit trail
- [x] **AIOS briefing audit/readiness v0** — briefing operacional mostra proposal/target review, graph/timeline, saved views, policy simulator e preview/replay readiness
- [x] **Adoption Dashboard audit maturity v0** — calcular readiness auditavel por source/projeto com score, next action, targets, gaps, graph/timeline e preview/replay coverage
- [x] **MCP Markdown evidence export v0** — expor evidence packet Markdown via MCP read-only usando fetch textual, validado com cliente MCP local
- [x] **AIOS Core Operational Readiness v0** — consolidar status operacional do core em doc/API/UI/MCP, com modulos, gaps reais e proximo corte recomendado
- [ ] **Operating Architecture Kernel** — modelar camadas multi-area: source, artifact/event, graph, goal/cadence, workflow orchestration, agent runtime, governance, context/retrieval, writeback, audit e UI. Parcial: campos multi-area e gates/SLA/provenance existem no kernel Slice 1.
- [x] **Goal/Cadence Layer** — criar metas, milestones, metricas, due dates, review cadence e SLA status para priorities, work items, workflow runs e guidance
- [x] **Evidence Inbox v0** — tela/API para revisar artifacts, ligar a prioridades e marcar pendencias
- [x] **Strategy Map v0** — tela/API para visualizar prioridades, evidencias, decisoes, work items e gaps
- [x] **AIOS Adoption Dashboard v0** — mostrar quais projetos/frentes estao em closed loop, quais work items estao sem prioridade/meta e quais gates estao pendentes
- [x] **AIOS Briefing Watcher v0** — gerar pulso operacional interno a partir do Company Brain, com Artifact `aios_briefing`, ultimo briefing em summary/UI/MCP e Signals observe-only para gaps claros
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
- [x] **GitHub Issues sync adapter v0** — sincronizar issues reais do GitHub em modo read-only para `Source`, `Artifact` e `WorkItem` canonico com dedupe, links, source health e provenance
- [x] **GitHub PR/CI watcher v0** — observar PRs reais, commit statuses e check-runs em modo read-only, criando Artifact/WatcherRun/Signal com provenance e action policy
- [x] **GitHub notifications watcher v0** — observar notificacoes autenticadas do GitHub em modo read-only, criando Artifact/WatcherRun/Signal sem marcar como lidas
- [x] **Slack ingestao v0** — implementar read-only para canais/threads selecionados ou importer manual com envelope final equivalente. Implementado como importer manual e adapter real de canal Slack.
- [x] **Slack threads/incremental sync v0** — usar cursor incremental por source e importar replies de threads como artifacts read-only com provenance e metadata de thread
- [x] **MCP tools Company Brain** — expor create/read de artifacts, decisions, agent contexts, improvement proposals, work items, workflow runs, guidance e signals para agentes. Implementado para summary/briefing/review cohesion/source/artifact/local docs importer/GitHub issues sync adapter/decision/signal/alignment finding/guidance/agent context/improvement proposal/external action proposal/GitHub comment writeback/Slack thread reply writeback/writeback safety dashboard/work item/workflow run/watcher.
- [x] **Source health** — mostrar ultima ingestao, erros, volume e freshness por fonte
- [ ] **Boundary Juntos em Sala** — manter self-improving de escolas fora do core; promover aprendizados apenas como artifacts/signals/proposals com gates
- [x] **Demo Felhen v0.1** — demonstrar estrategia -> evidencia -> drift/guidance -> workflow run -> learning usando dogfood interno

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
