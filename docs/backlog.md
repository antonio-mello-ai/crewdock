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

Proximo corte planejado: melhorias read-only/audit/export/observability para status writeback e evidence packets; parar antes de qualquer nova mutacao externa, novo alvo, check-run real, assign/unassign, notification-read, close/reopen, merge, deploy ou repo/canal publico.

- [x] **Company Brain schema v0** — adicionar objetos horizontais no daemon: `Source`, `Artifact`, `StrategicPriority`, `Decision`, `Signal`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `AlignmentFinding`, `GuidanceItem`, `AgentContext` e `ImprovementProposal`
- [x] **Source registry + raw artifact store** — guardar artifacts com `source`, `raw_ref`, author, timestamp, hash, visibility e provenance
- [x] **Watcher / Operating Loop Layer v0** — adicionar `Watcher` e `WatcherRun` no schema/tipos/API, com `source_ids`, `trigger_type`, `schedule`, `scope_query`, `target_workflow_blueprint_id`, `risk_class`, `action_policy`, `status`, `last_run_at`, `next_run_at`, `failure_policy` e `output_policy`
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
