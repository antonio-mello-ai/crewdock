# AIOS-EXEC-02 WorkItem to GitHub Issue Flow v0 - 2026-05-07

## Escopo

Consumo end-to-end da issue `#28 AIOS-EXEC-02: WorkItem to GitHub Issue Flow`
da milestone `AIOS Execution Loop v0`.

O corte transforma um `WorkItem` do Company Brain em GitHub Issue por um fluxo
governado:

1. gerar `ExternalActionProposal` a partir do WorkItem;
2. fazer preview/dry-run com body, labels, milestone, provenance e marker de
   idempotencia;
3. exigir HITL approval com rationale;
4. exigir preview posterior a aprovacao;
5. executar somente em repo allowlisted por `AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST`;
6. antes de criar, buscar issue existente com o marker no body;
7. criar uma unica issue via GitHub API quando nao existir duplicata;
8. gravar audit trail/evidence packet e linkar `externalUrl` de volta ao
   WorkItem.

Continua fora do escopo: auto-create sem aprovacao, close/reopen, assign,
merge, deploy, edicao de issue existente e qualquer repo fora da allowlist.

## Entregue

### Tipos

- `ExternalActionKind` inclui `github_issue_create`.
- Novos tipos: `GitHubIssueCreateTarget`,
  `GitHubIssueCreateProposalPreviewResponse`,
  `GitHubIssueCreateWritebackResponse` e
  `GenerateGitHubIssueCreateProposalRequest`.
- `WritebackAdapterKey` inclui `github_issue_create` para audit/export/filter.

### Daemon

- Helpers de payload/target/marker/labels/allowlist:
  `gitHubIssueCreateMarker`, `gitHubIssueCreateTarget`,
  `gitHubIssueCreatePayloadLabels`, `gitHubIssueCreateAllowlist` e
  `isGitHubIssueCreateRepoAllowlisted`.
- `buildGitHubIssueCreatePayloadFromWorkItem()` monta title/body/labels/
  milestone/provenance e idempotency key
  `aios:issue_create:<repo>:<workItemId>:<hash>`.
- `buildGitHubIssueCreateProposalPreview()` devolve `dry_run` quando Risk B,
  `writeback_allowed`, approved e repo allowlisted estao satisfeitos; caso
  contrario devolve `preview_only` com `executionBlockReason`.
- Executor real em
  `POST /api/company-brain/external-action-proposals/:id/github-issue-create/execute`.
- Execucao usa Retry Safety, preview-after-approval, allowlist, `GITHUB_TOKEN`,
  dedupe por marker, audit events `github_issue_created`,
  `github_issue_create_reused`, `_failed`, `_execution_blocked` e
  `_retry_required`.
- Ao completar, atualiza a proposal com `externalId/externalUrl` e o WorkItem
  com `externalProvider=github`, `externalId`, `externalUrl` e provenance notes.

### MCP/UI/Docs

- MCP tools:
  `create_company_brain_github_issue_create_proposal`,
  `preview_company_brain_github_issue_create_proposal` e
  `execute_company_brain_github_issue_create_writeback`.
- UI `/company-brain` mostra action/filter `github_issue_create` e botoes
  `Preview issue` / `Create issue` para proposals aprovadas e prontas.
- `docs/writeback-policy-matrix.md` e `docs/aios-issues-runbook.md` atualizados
  para tratar `github_issue_create` como executor governado, nao preview-only.

## Smoke local

DB temporario em `/tmp/aios-smoke-issue-create.sqlite`, daemon local com:

```sh
AIOS_AUTH_DISABLED=true
AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST=antonio-mello-ai/crewdock
GITHUB_TOKEN=$(gh auth token)
```

Cenario validado em `antonio-mello-ai/crewdock`:

- WorkItem interno `3MWgWZlUHMfC` criado para dogfood.
- Proposal criada via
  `POST /api/company-brain/external-action-proposals/from-work-item/github-issue-create`
  com `riskClass=B` e `actionPolicy=writeback_allowed`.
- Preview antes da aprovacao retornou `preview_only`.
- Aprovacao HITL com actor e rationale.
- Preview posterior a aprovacao retornou `dry_run`, `executionBlocked=false`.
- Execute criou issue real `antonio-mello-ai/crewdock#36`:
  `https://github.com/antonio-mello-ai/crewdock/issues/36`.
- Re-execute retornou `already_completed`, sem duplicar nem chamar outro POST.
- Re-criar a mesma proposal retornou `reused=true`.
- WorkItem recebeu
  `externalUrl=https://github.com/antonio-mello-ai/crewdock/issues/36`.
- Readback GitHub confirmou `markerPresent=true`.
- A issue dogfood foi fechada manualmente apos validacao para nao poluir a fila
  aberta, preservando a evidencia no historico.

Resumo do smoke:

```json
{
  "workItemId": "3MWgWZlUHMfC",
  "proposalId": "FodIAu8UJyn1",
  "preApproval": { "status": "preview_only", "blocked": true },
  "postApproval": { "status": "dry_run", "blocked": false },
  "execute": {
    "status": "completed",
    "externalId": "antonio-mello-ai/crewdock#36",
    "externalUrl": "https://github.com/antonio-mello-ai/crewdock/issues/36"
  },
  "reexecuteStatus": "already_completed",
  "recreatedProposalReused": true,
  "workItemExternalUrl": "https://github.com/antonio-mello-ai/crewdock/issues/36"
}
```

## Validacao

- `git diff --check`.
- `npx turbo build`.
- Dogfood real em repo GitHub privado/allowlisted.

## Deploy / production smoke

PR #35 foi mergeado em `main` no commit `0f555e0` e a issue #28 foi fechada
automaticamente pelo `Closes #28`.

Deploy realizado em 2026-05-07:

- CT165 fast-forward ate `0f555e0`.
- `.env.prod` no CT165 configurado com
  `AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST=antonio-mello-ai/crewdock`.
- `npx turbo build --filter=@aios/daemon --force` passou no CT165.
- `systemctl restart aios-daemon`; servico ficou `active`.
- Cloudflare Pages publicado:
  `https://b0569eb8.crewdock.pages.dev`.
- `GET https://api.felhen.ai/api/health` -> `200`.
- `GET https://api.felhen.ai/api/company-brain/operating-snapshot` com service
  token -> `200`, `overallStatus=healthy`, `summary="5/5 operating cards ready;
  0 attention; 0 critical; 0 errors; 0 missing."`.
- `POST https://api.felhen.ai/api/company-brain/external-action-proposals/does-not-exist/github-issue-create/preview`
  com service token -> `400 preview_failed: external action proposal not found`,
  confirmando que a rota nova esta publicada sem mutacao.
- `GET https://ai.felhen.ai/company-brain/operating` com service token -> `200`.
- `GET https://ai.felhen.ai/company-brain` com service token -> `200`.
- Sync read-only de GitHub Issues em producao reconciliou o fechamento do #28:
  `issuesSeen=32`, `workItemsCreated=25`, `workItemsUpdated=7`.
- `GET https://api.felhen.ai/api/company-brain/next-work` com service token
  agora recomenda `#29 AIOS-EXEC-03: Symphony-compatible Agent Runner`, com 3
  candidatos ativos.

Residual intencional: producao tem allowlist, mas nao foi encontrado
`GITHUB_TOKEN`/`GH_TOKEN` no `.env.prod` nem no unit do systemd. Portanto o
executor esta publicado e governado, mas execucao real em producao ainda exige
instalar explicitamente um token GitHub apropriado; sem token, a API falha antes
de qualquer write externo.

## Decisoes

- O executor cria apenas issue nova. Nao fecha, reabre, edita, assina, faz
  merge ou deploy.
- Label inexistente no repo falha no execute; o AIOS nao cria label
  automaticamente.
- Milestone por `milestoneNumber` e suportado no create API. `milestoneTitle`
  fica como preview/provenance quando nao ha numero.
- Idempotency tem duas camadas: proposal key por `repo+workItemId+title` e
  marker no body para dedupe no GitHub antes do POST.
