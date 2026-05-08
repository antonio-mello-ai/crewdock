# AIOS Agent Execution v7 Milestone

Date: 2026-05-08

## Context

`AIOS Agent Execution v6` closed the first PR-shaped loop:

- runner profile registry;
- patch/validation packet collection;
- PR proposal preview;
- approved GitHub PR writeback;
- first AIOS-authored PR opened on `antonio-mello-ai/crewdock`.

The first PR, `#113`, remains open for human review. v7 hardens the PR loop so
the next dogfood does not require SQLite approval or manual AgentRun seeding and
can carry a small semantic change rather than a marker-only diff.

## GitHub Milestone

- Milestone: `AIOS Agent Execution v7`
- GitHub milestone number: `10`
- Repo: `antonio-mello-ai/crewdock`

## Issues

- `#115 AIOS-RUN-34: GitHub PR writeback preflight and auth smoke v7`
- `#116 AIOS-RUN-35: GitHub PR proposal governance UI v7`
- `#117 AIOS-RUN-36: Auto-dispatch to PR proposal chain v7`
- `#118 AIOS-RUN-37: Same-PR iteration loop for AgentRuns v7`
- `#119 AIOS-RUN-38: Semantic AIOS-authored PR dogfood pack v7`

## Execution Contract

The implementation window can proceed issue-by-issue through `#115 -> #119`.

Allowed without stopping:

- docs and runbooks;
- internal schema/API/MCP/UI;
- PR writeback preflight and pushability smoke;
- governance UI/API for `github_pr_create` proposals;
- controlled auto-dispatch-to-PR proposal chain;
- same-PR iteration for AIOS-authored PRs;
- semantic dogfood PR in `antonio-mello-ai/crewdock`.

Stop before:

- auto-merge or deploy;
- customer or external repos;
- new secrets or permissions;
- new paid services;
- broad multi-issue auto-dispatch;
- external writeback outside the existing policy system.

## Production Evidence

Before opening v7, production `next-work` was empty after v6 closure. PR `#113`
remains open and awaiting human review.

After opening v7, updating CT165 to `4e5082d` and syncing GitHub Issues:

- sync `state=open` returned `issuesSeen=5`;
- `workItemsCreated=5`;
- `lastIssueNumbers=[119,118,117,116,115]`;
- `GET /api/company-brain/workflow-loader` returned
  `activeMilestone=AIOS Agent Execution v7`, `isValid=true`;
- `GET /api/company-brain/next-work` recommends
  `#115 AIOS-RUN-34: GitHub PR writeback preflight and auth smoke v7`
  with `candidatesConsidered=5`.

## Next Handoff Prompt

```text
Nova milestone pronta: AIOS Agent Execution v7.

Estado:
- Milestone AIOS Agent Execution v6 está 100% concluída.
- Primeiro PR AIOS-authored está aberto: #113.
- Nova milestone tem issues #115 a #119.
- WORKFLOW.md aponta para AIOS Agent Execution v7.
- Company Brain já foi sincronizado em produção.
- Next Work recomenda #115 AIOS-RUN-34: GitHub PR writeback preflight and auth smoke v7.
- Comece de origin/main atualizado.

Siga em modo contínuo issue-by-issue:
#115 -> #116 -> #117 -> #118 -> #119.

Contrato:
- Para cada issue: branch de origin/main, implementação, validação, PR com Closes #NN, QA/review, merge, deploy se necessário para dogfood, session result, sync Company Brain, próxima issue.
- Pode seguir sem parar em docs, API/MCP/UI internas, PR writeback preflight, governance UI para github_pr_create, chain auto-dispatch -> PR proposal, same-PR iteration e dogfood semântico controlado.
- Pare antes de auto-merge/deploy, customer repo, novo segredo/permissão, serviço pago ou broad multi-issue auto-dispatch.

Comece por #115.
```
