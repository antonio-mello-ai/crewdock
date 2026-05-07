# AIOS-EXEC-04 Session Result Intake v0 - 2026-05-07

## Escopo

Consumo da issue `#30 AIOS-EXEC-04: Session Result Intake` da milestone
`AIOS Execution Loop v0`. Permitir que humano, agent ou Symphony-compatible
runner submeta o resultado de uma sessao/run e que o Company Brain converta
em evidence + follow-up state, sem auto-close de WorkItem e sem writeback
externo.

## O que foi entregue

### Tipos (`packages/shared/src/types.ts`)

- `SessionResultRunnerType`: `claude_code` | `codex` | `symphony` | `manual` | `other`.
- `SessionResultOutcome`: `completed` | `pr_opened` | `awaiting_review` | `blocked` | `failed` | `cancelled`.
- `SessionResultValidationStatus`: `passed` | `failed` | `skipped` | `partial` | `unknown`.
- `SessionResultValidation`, `SessionResultBlocker`, `SessionResultNextStep`.
- `SubmitSessionResultRequest`, `SubmitSessionResultResponse`.

### Daemon (`packages/daemon/src/routes/company-brain.ts`)

Helpers:

- `ensureSessionResultsSource(area, visibility, timestamp)` — cria/encontra
  source default `aios:session-results` (`sourceType=runtime`) quando o
  WorkItem nao traz sourceId.
- `findWorkItemForSessionResult(workItemId, externalIssueRef)` — resolve
  por id direto ou por `external_id` match (ex: `antonio-mello-ai/crewdock#30`).
- `sessionResultSignalSource(outcome, validationStatus)` — escolhe
  `SignalSource` adequado (`qa` para validation failed, `error` para outcome
  failed, `feedback` por default).

Endpoint `POST /api/company-brain/session-results`:

- valida `summary`, `runnerType`, `outcome`;
- cria `Artifact` `session_result` com metadata rica (runner, outcome,
  branch, prUrl, workspaceRef, commits, changedFiles, validations,
  blockers, nextSteps, tokens, costUsd, agentSessionId/threadId, detail);
- provenance `company_brain:session_result_intake`;
- atualiza `WorkItem` quando referenciado:
  - `outcome=pr_opened` ou `awaiting_review` -> `status=review`
    (se status atual em `[new, triage, planned, in_progress]`);
  - `outcome=blocked` -> `status=blocked` + `blockedReason`;
  - `outcome=failed` -> `status=needs_human` + `blockedReason`;
  - `outcome=cancelled` ou `completed` -> nao mexe em status (HITL fecha);
  - linka `artifactId` se WorkItem ainda nao tem;
- gera `Signal` para cada blocker (`severity=warn` por default) e para cada
  validation `status=failed` (`severity=critical`, source `qa`); inclui um
  signal extra para `outcome=failed` quando nao ha validation failed
  explicita;
- gera `GuidanceItem` (`status=new`, `feedback_status=pending`) para cada
  nextStep, herdando `priorityId/goalId` do WorkItem quando existem.

Sem mutacao externa: nao chama GitHub/Slack, nao move issue, nao fecha
WorkItem automaticamente.

### MCP (`packages/mcp-server/src/index.ts`)

Tool `submit_company_brain_session_result` com schema Zod completo
(runnerType + outcome + summary obrigatorios; demais opcionais). Compatible
com Symphony/Codex run output sem mudar a API daemon.

### UI

Pendente. Acceptance "submitted without editing docs manually" e atendido
via API + MCP. Form HTML para humano cole o resultado vai como follow-up
(provavelmente uma rota nova `/company-brain/session-results/new` com form
basico chamando o endpoint).

## Smoke local

DB temporario `/tmp/aios-smoke-session-result.sqlite`, daemon em
`127.0.0.1:43196`, `AIOS_AUTH_DISABLED=true`.

Cenario A: PR aberto

```
POST /api/company-brain/demo/felhen-v0-1
-> WorkItem id=zbqRPo2eW9DS, status=in_progress

POST /api/company-brain/session-results
{
  "workItemId": "zbqRPo2eW9DS",
  "runnerType": "claude_code",
  "outcome": "pr_opened",
  "summary": "Implemented session result intake API and MCP tool.",
  "detail": "Full implementation with helpers and tests.",
  "branch": "aios-exec-04-session-result-intake",
  "prUrl": "https://github.com/antonio-mello-ai/crewdock/pull/42",
  "validations": [{"kind":"build","status":"passed"},{"kind":"git_diff_check","status":"passed"}],
  "nextSteps": [{"action":"Review PR #42 acceptance criteria","audience":"human","severity":"info"}],
  "tokensInput": 12000, "tokensOutput": 3500, "tokensTotal": 15500,
  "actor": "smoke-test"
}
->
artifact.id = "Fp9PO0E5CXtl"
artifact.artifactType = "session_result"
artifact.metadata.prUrl = "https://github.com/antonio-mello-ai/crewdock/pull/42"
artifact.metadata.commits = [{sha:"abc1234"}]
artifact.metadata.validations = [...passed]
signalsCreated = []  (nenhum blocker, nenhuma validation failed)
guidanceItemsCreated = 1  (Review PR #42)
workItem.status = "review"  (mudou de in_progress)
workItemUpdated = true
prLinkRecorded = true
```

Cenario B: failure

```
POST /api/company-brain/session-results
{
  "workItemId": "zbqRPo2eW9DS",
  "runnerType": "codex",
  "outcome": "failed",
  "summary": "Build failed; missing dependency.",
  "validations": [{"kind":"build","status":"failed","notes":"npm install error"}],
  "blockers": [{"kind":"dependency","description":"package not found","severity":"critical"}],
  "actor": "smoke-test"
}
->
artifact.id = "UCn0TPYc1dgv"
signalsCreated = 2  (1 blocker + 1 validation_failed)
guidanceItemsCreated = 0
workItem.status = "needs_human"
workItem.blockedReason = "Build failed; missing dependency."
workItemUpdated = true
```

## Validacao

- `git diff --check` clean.
- `npx turbo build` 4/4 successful.
- Smoke local cobriu pr_opened e failed; ambos retornaram shape esperado e
  atualizaram WorkItem corretamente.
- Endpoint nao chama GitHub/Slack; nao loga `GITHUB_TOKEN` em audit; nao
  cria proposta de writeback externo automaticamente.

## Acceptance Criteria

- [x] A session/run summary can be submitted without editing docs manually
  (via API ou MCP `submit_company_brain_session_result`).
- [x] Result becomes an Artifact linked to the relevant WorkItem (`metadata.workItemId`,
  `provenance.sourceId`, e `WorkItem.artifactId` quando vazio).
- [x] PR/CI/commit references are captured when provided
  (`metadata.prUrl/commits/changedFiles/branch/validations`).
- [x] Follow-up guidance can be reviewed, accepted or rejected (cria
  `GuidanceItem` com `status=new`, `feedback_status=pending`; o flow
  existente de Guidance v0 cobre review/accept/reject/done).
- [x] Intake shape compatible com future Symphony/Codex runner outputs
  (campos paralelos a `Live Session` + `Run Attempt` do spec Symphony:
  `agentSessionId`, `agentThreadId`, `tokens*`, `workspaceRef`, `branch`,
  `prUrl`, `commits`, `changedFiles`, `validations`, `blockers`).
- [x] `git diff --check`, `npx turbo build` e dogfood passam.

## Constraints

- [x] Sem mutacao externa de issue/PR.
- [x] Sem auto-close de WorkItems.
- [x] Sem dependencia de Linear ou outro tracker pago.

## Decisoes / friccoes

- **Decisao**: nao escrever `WorkItem.externalUrl` com PR. O `externalUrl`
  ja aponta para a issue; PR fica em `Artifact.metadata.prUrl` e em
  `provenance.notes`. Linkar PR ao `WorkItem` direto exigiria campo novo
  (`workItem.prUrl`?) que cabe em uma sessao separada quando UI consumir.
- **Decisao**: status mapping non-destructive (`pr_opened` -> `review`
  apenas se status atual em `[new, triage, planned, in_progress]`). Evita
  baixar de `done`/`deployed`/`monitoring` quando ja foi fechado.
- **Decisao**: source default `aios:session-results` quando WorkItem nao
  tem source. Mantem provenance auditavel mesmo para sessoes ad-hoc.
- **Decisao**: outcomes `completed` e `cancelled` nao mexem em status do
  WorkItem. Usuario fecha WorkItem manualmente apos review.
- **Friccao**: `SignalEntityType` no shared nao tem `work_item` ou
  `artifact` como opcoes. Usei `job` (que ja existe e e a mais proxima
  semantica de "uma execucao agent"). Em sessao futura vale revisar o
  enum para adicionar `work_item` explicito.
- **Friccao**: `Signal.workItemId` e `signal.entityId` carregam mesma
  info quando o entityType e job e a session aponta para WorkItem. OK por
  ora; o entityId continua util para signals que nao tem WorkItem
  associado.
- **Friccao**: UI form nao foi entregue nesta sessao por escolha de
  velocidade. Acceptance criteria primario (intake sem editar docs) e
  satisfeito via API/MCP. Follow-up natural e adicionar
  `/company-brain/session-results/new` com form simples.

## Production smoke

Pendente ate o PR ser mergeado e o daemon CT165 deployar a nova rota.
Plano:

- `POST https://api.felhen.ai/api/company-brain/session-results` com
  payload de smoke -> deve retornar `Artifact` `session_result`.
- `GET https://api.felhen.ai/api/company-brain/operating-snapshot` ->
  Source `AIOS Session Results` aparece em Source Health quando o
  `Felhen Demo v0.1` nao foi seedado em producao.
- `mcp__aios__submit_company_brain_session_result` resolvendo via MCP
  com workItemId real espelhado de `#29` para registrar o resultado
  desta sessao.

## Proximos passos

- UI form em `/company-brain/session-results/new` (paste manual).
- GET endpoint para listar artifacts session_result (ja acessivel via
  `cb_summary` filtrando por artifactType, mas dedicado seria melhor UX).
- Quando AIOS-EXEC-03 v2 (orchestrator + agent runner) chegar, fazer o
  agent runner emitir o session result automaticamente apos cada attempt
  (linka WorkItem + WorkflowRun + AgentRun).
