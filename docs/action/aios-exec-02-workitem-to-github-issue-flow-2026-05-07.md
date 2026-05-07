# AIOS-EXEC-02 WorkItem to GitHub Issue Flow v0 - 2026-05-07

## Escopo

Consumo end-to-end da issue `#28 AIOS-EXEC-02: WorkItem to GitHub Issue Flow`
da milestone `AIOS Execution Loop v0`. Permitir transformar `WorkItem` do
Company Brain em draft de GitHub Issue governado por
`ExternalActionProposal`, com preview, audit trail e idempotency.

Entregue em **modo preview-only** (v0), seguindo o padrao historico
`github_label_proposal_v0` -> `github_label_executor_v0`. Executor real (que
chama a GitHub Issues API) fica para um corte separado:

- requer allowlist nova (`AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST`)
- requer `GITHUB_TOKEN` ja existente em `.env.prod` (mesmo do
  `github_comment` writeback)
- requer dogfood real (criar uma issue de proxy primeiro)
- requer deploy de CT165 + `.env.prod` update

Esta sessao recebeu instrucao explicita do usuario para parar antes de
mutacao externa nova e antes de deploy. v0 preview-only atende:

- "A WorkItem can produce a preview GitHub Issue payload" (Acceptance #1)
- "Idempotency prevents duplicate issues" (Acceptance #4) — via hash
  determinista por `repo+workItemId+title` no proposal e marker
  `<!-- aios-issue-create proposal_id=... idempotency_key=... -->` no body
- "ExternalActionProposal/audit trail/evidence packet" (Scope #5) — via tabela
  existente `cb_external_action_proposals` com auditTrail apendado
- "Preview before creation" (Scope #3) — via endpoint dedicado de dry-run
- "Require HITL approval before external write" (Scope #4) — proposal nasce
  como `approvalStatus=pending`, `executionStatus=blocked`

Acceptance "Approved proposal can create the issue in the allowlisted repo"
e "Created issue URL is linked back to the WorkItem/provenance" ficam para
o cut do executor real.

## O que foi entregue

### Tipos (`packages/shared/src/types.ts`)

- `ExternalActionKind` ganhou `github_issue_create`.
- Novos: `GitHubIssueCreateTarget`, `GitHubIssueCreateProposalPreviewResponse`,
  `GenerateGitHubIssueCreateProposalRequest`.

### Daemon (`packages/daemon/src/routes/company-brain.ts`)

Helpers novos:

- `isGitHubIssueCreateAction(actionType)`.
- `gitHubIssueCreateMarker(proposal)` — produz
  `<!-- aios-issue-create proposal_id=<base64url> idempotency_key=<base64url> -->`.
- `gitHubIssueCreatePayloadLabels(proposal)` — extrai labels do payload com
  dedupe.
- `gitHubIssueCreateTarget(proposal)` — parseia repo + milestone.
- `gitHubIssueCreateAllowlist()` + `isGitHubIssueCreateRepoAllowlisted(repo)`
  — leem `AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST` e validam repo. Default empty
  bloqueia execucao real ate ser configurado.
- `buildGitHubIssueCreateProposalPreview(proposal)` — preview-only puro:
  monta target, title, body com marker, labels, payload hash, riskRationale,
  e flags de execution. Em v0 sempre devolve `executionBlocked=true` e
  `executionBlockReason="github_issue_create_executor_not_implemented_v0"`
  como base, agregando `requires_risk_b/writeback_allowed/approval` e
  `repo_not_allowlisted` quando aplicavel.
- `validateGitHubIssueCreateProposalPreview(proposal)` — valida shape antes
  de chamar o builder.
- `buildGitHubIssueCreatePayloadFromWorkItem(workItem, options)` — gera
  title/body/labels/milestone a partir do WorkItem. Body inclui `## Context`,
  `## Description`, `## Acceptance Criteria` (parseado do body do WorkItem) e
  `## Provenance` (workItemId, sourceId, artifactId, priorityId, goalId).
  Idempotency key via SHA-256(`repo|workItemId|title`)[:16]:
  `aios:issue_create:<repo>:<workItemId>:<hash>`.
- `previewEventForProposal` reconhece `github_issue_create_previewed`.

Endpoints novos:

- `POST /api/company-brain/external-action-proposals/from-work-item/github-issue-create`
  cria a proposal a partir de WorkItem. Reusa por idempotency key se ja existir
  (`{ proposal, reused: true }`).
- `POST /api/company-brain/external-action-proposals/:id/github-issue-create/preview`
  faz dry-run. Apende `github_issue_create_previewed` ao audit trail e
  retorna `GitHubIssueCreateProposalPreviewResponse`.

### MCP (`packages/mcp-server/src/index.ts`)

- `create_company_brain_github_issue_create_proposal` — gera proposal a partir
  de workItemId + repo + (opcional) title/body/labels/milestone/rationale.
- `preview_company_brain_github_issue_create_proposal` — dry-run da proposal.

### Docs

- `docs/writeback-policy-matrix.md` lista o novo `github_issue_create` como
  preview-only com executor pendente.
- `docs/aios-issues-runbook.md` ganha secao explicando o flow WorkItem ->
  GitHub Issue (preview-only v0) e atualiza a Mutation policy.
- `docs/backlog.md` marca AIOS-EXEC-02 como done e adiciona linha de status.

## Smoke local

DB temporario `/tmp/aios-smoke-issue-create.sqlite`, daemon em
`127.0.0.1:43195`, `AIOS_AUTH_DISABLED=true`,
`AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST=""`.

Cenario com seed Felhen Demo v0.1:

```
POST /api/company-brain/external-action-proposals/from-work-item/github-issue-create
{
  "workItemId": "WTafhrhnSYbv",
  "repo": "antonio-mello-ai/crewdock",
  "labels": ["aios", "company-brain"],
  "milestoneTitle": "AIOS Execution Loop v0"
}
->
proposal.id = "v0HUaICmexGK"
proposal.actionType = "github_issue_create"
proposal.riskClass = "B"
proposal.actionPolicy = "request_human"
proposal.approvalStatus = "pending"
proposal.executionStatus = "blocked"
proposal.idempotencyKey = "aios:issue_create:antonio-mello-ai/crewdock:WTafhrhnSYbv:7a382807d5234589"
proposal.payload.body = "## Context\nGenerated from Company Brain WorkItem `WTafhrhnSYbv` (platform, status=in_progress).\n\n## Description\n...\n\n## Provenance\n- WorkItem: WTafhrhnSYbv\n- Source: UR8zW_fOWR7W\n- Artifact: Az2SMNE-gkHq\n- Priority: T1ug4n5Hc3Ee\n- Goal: IKgLpgMDx8Sd"
proposal.payload.labels = ["demo","company-brain","closed-loop","aios"]
proposal.auditTrail[0].event = "proposal_created"
```

```
POST /api/company-brain/external-action-proposals/v0HUaICmexGK/github-issue-create/preview
{ "actor": "smoke-test" }
->
status = "preview_only"
executionBlocked = true
executionBlockReason = "github_issue_create_requires_writeback_allowed"
target.repo = "antonio-mello-ai/crewdock"
target.milestoneTitle = "AIOS Execution Loop v0"
title = "Felhen Demo v0.1 closed-loop work item"
body inclui marker "<!-- aios-issue-create proposal_id=djBIVWFJQ21leEdL idempotency_key=YWlvczppc3N1ZV9jcmVhdGU... -->"
payloadHash = "6658af011bef8872286d987a3bf1556f4fe54452b307d199f9a29f227113876a"
sourceWorkItemId = "WTafhrhnSYbv"
auditTrail.length = 2  (proposal_created + github_issue_create_previewed)
policySummary = "GitHub issue create proposal v0 is preview-only..."
```

```
POST /api/company-brain/external-action-proposals/from-work-item/github-issue-create  (re-run)
->
data.reused = true
data.proposal.id = "v0HUaICmexGK"  (mesma proposal, idempotency funcionou)
```

## Validacao

- `git diff --check` clean.
- `npx turbo build` 4/4 successful.
- Daemon roda sem erro de schema apos correcao de campos (`policySummary`,
  `approvalRequired`, `rationale`, `requestedBy`, `rollbackRef` notNull).

## Decisoes / friccoes

- **Decisao**: cortar em `preview-only v0`, separando do `executor v1`,
  identico ao precedente `github_label`. Atende ao constraint do usuario
  ("pare antes de mutacao externa nova") sem perder os Acceptance Criteria
  internos (preview, idempotency, HITL gate, audit trail, evidence).
- **Decisao**: idempotency key e por `repo+workItemId+title` em vez de
  somente `repo+workItemId`. Permite que o operador re-titule a issue
  manualmente (uma decisao de produto) sem trombar com a proposal antiga,
  mantendo determinismo. O marker no body cobre o segundo nivel de dedupe
  no executor real (procurar issue existente com mesma marker substring
  antes de criar nova).
- **Decisao**: parse de `## Acceptance Criteria` do WorkItem reaproveita
  `parseAcceptanceCriteria()` introduzido em AIOS-EXEC-01 v0.
- **Friccao**: schema do `cb_external_action_proposals` exige
  `policySummary` notNull e `guidanceItemId` notNull. Para WorkItem que nao
  tem guidance, gravar empty string (`""`). Funciona, mas o tipo shared
  declara `guidanceItemId: string` (nao opcional), divergindo do uso real
  com `null` no review queue. Vale alinhar tipos vs schema em proximo
  housekeeping.
- **Friccao**: nao implementei UI nesta sessao. A criacao/preview ficam via
  API/MCP. UI fica para o cut do executor real, junto com botao "Approve"
  na pagina `/company-brain`. O usuario disse "pode seguir sem parar para
  UI", entao o gap e voluntario, nao bloqueio.

## Production smoke

Fica pendente ate deploy do PR e ate `AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST`
ser configurado em `.env.prod`. Mesmo apos deploy, executar real continua
bloqueado em v0; production smoke fica limitado a:

- `POST https://api.felhen.ai/api/company-brain/external-action-proposals/from-work-item/github-issue-create`
  retorna proposal com `executionStatus=blocked`.
- `POST .../<id>/github-issue-create/preview` retorna `status=preview_only`,
  `executionBlocked=true`.

## Proximos passos

- Sessao para o executor real (`aios-exec-02-github-issue-create-executor`):
  allowlist via env var, GitHub API call, dedupe via marker no body,
  Retry Safety, audit `github_issue_create_completed` / `_failed` /
  `_completed_noop`, link `externalUrl` de volta ao WorkItem provenance.
- UI em `/company-brain`: botao "Generate GitHub Issue" no WorkItem detail
  + tela de aprovacao da proposal.
- Apos executor: integrar com Adoption Dashboard como writeback maturity
  novo (igual ao label/comment hoje).
