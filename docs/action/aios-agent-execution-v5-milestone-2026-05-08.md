# AIOS Agent Execution v5 Milestone

Date: 2026-05-08

## Context

`AIOS Agent Execution v4` closed controlled auto-dispatch:

- policy governance with 11 gates;
- idempotent promotion from suggestion to queued AgentRun;
- Operating Loop single-run auto-dispatch;
- reconciliation, stall recovery and tracker refresh;
- controlled dogfood evidence.

The v4 dogfood proved the dispatch + audit + reconciliation chain, but it also
exposed five operational frictions. v5 is a hardening milestone before any move
toward broader autonomy.

## GitHub Milestone

- Milestone: `AIOS Agent Execution v5`
- GitHub milestone number: `8`
- Repo: `antonio-mello-ai/crewdock`

## Issues

- `#94 AIOS-RUN-24: Auto-dispatch config clarity and policy hints v5`
- `#95 AIOS-RUN-25: Stable WorkflowBlueprint identity for auto-dispatch v5`
- `#96 AIOS-RUN-26: Workspace cleanup risk review UX v5`
- `#97 AIOS-RUN-27: Internal WorkItem status update path v5`
- `#98 AIOS-RUN-28: Successful controlled auto-dispatch dogfood pack v5`

## Execution Contract

The implementation window can proceed issue-by-issue through `#94 -> #98`.

Allowed without stopping:

- docs and runbooks;
- internal schema/API/MCP/UI;
- auto-dispatch policy hints and config clarity;
- stable WorkflowBlueprint identity for allowlists;
- cleanup preview/review UX;
- internal audited WorkItem status update;
- controlled no-op auto-dispatch dogfood that reaches `completed`.

Stop before:

- broad multi-issue auto-dispatch;
- new secrets or permissions;
- new paid services;
- external writeback outside the existing policy system;
- auto-merge or deploy;
- cleanup outside the AIOS workspace root.

## Production Evidence

Before opening v5, production `next-work` was empty after v4 closure.

After opening v5, updating CT165 to `75f4ec4` and syncing GitHub Issues:

- sync `state=open` returned `issuesSeen=5`;
- `workItemsCreated=5`;
- `lastIssueNumbers=[98,97,96,95,94]`;
- `GET /api/company-brain/workflow-loader` returned
  `activeMilestone=AIOS Agent Execution v5`, `isValid=true`;
- `GET /api/company-brain/next-work` recommends
  `#94 AIOS-RUN-24: Auto-dispatch config clarity and policy hints v5`
  with `candidatesConsidered=5`.

## Next Handoff Prompt

```text
Nova milestone pronta: AIOS Agent Execution v5.

Estado:
- Milestone AIOS Agent Execution v4 está 100% concluída.
- Nova milestone tem issues #94 a #98.
- WORKFLOW.md aponta para AIOS Agent Execution v5.
- Company Brain já foi sincronizado em produção.
- Next Work recomenda #94 AIOS-RUN-24: Auto-dispatch config clarity and policy hints v5.
- Comece de origin/main atualizado.

Siga em modo contínuo issue-by-issue:
#94 -> #95 -> #96 -> #97 -> #98.

Contrato:
- Para cada issue: branch de origin/main, implementação, validação, PR com Closes #NN, QA/review, merge, deploy se necessário para dogfood, session result, sync Company Brain, próxima issue.
- Pode seguir sem parar em docs, API/MCP/UI internas, policy hints, stable blueprint identity, cleanup review UX, update interno auditado de WorkItem e dogfood controlado com comando benigno.
- Pare antes de broad multi-issue auto-dispatch, novo segredo/permissão, serviço pago, writeback externo fora das policies, auto-merge/deploy ou cleanup fora do workspace root.

Comece por #94.
```
