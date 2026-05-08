# AIOS Agent Execution v3 Milestone

Date: 2026-05-08

## Context

`AIOS Agent Execution v2` closed the supervised real runner loop:

- policy gates with environment-driven opt-in;
- real subprocess executor with secret redaction;
- log capture, heartbeat, cancel and timeout sweep;
- session result auto-intake;
- workspace cleanup preview/quarantine/remove gates;
- `/company-brain/agent-runs` execution console;
- supervised runner dogfood pack.

The dogfood pack exposed four concrete follow-ups. The next milestone turns
the runner from request-blocking into background-capable while keeping broad
auto-dispatch out of scope.

## GitHub Milestone

- Milestone: `AIOS Agent Execution v3`
- GitHub milestone number: `6`
- Repo: `antonio-mello-ai/crewdock`

## Issues

- `#76 AIOS-RUN-15: Async AgentRun spawn with PID, SIGTERM and SSE logs v3`
- `#77 AIOS-RUN-16: Per-run workspace isolation keyed by AgentRun id v3`
- `#78 AIOS-RUN-17: Git worktree remove after cleanup gate v3`
- `#79 AIOS-RUN-18: Operating Loop queued-run suggester without auto-dispatch v3`

## Execution Contract

The implementation window can proceed issue-by-issue through `#76 -> #79`.

Allowed without stopping:

- docs and runbooks;
- internal schema/API/MCP/UI;
- async subprocess lifecycle;
- PID/executionRef persistence;
- SIGTERM cancellation;
- SSE or equivalent log streaming;
- workspace per-run routing;
- safe `git worktree remove` after policy gates;
- observe-only Operating Loop suggestions.

Stop before:

- broad auto-dispatch;
- new secrets or permissions;
- new paid services;
- external writeback outside the existing policy system;
- auto-merge or deploy;
- cleanup outside the AIOS workspace root.

## Production Evidence

Before opening v3, production was reconciled with `state=all`:

- `issuesSeen=50`;
- `workItemsUpdated=50`;
- `Next Work` returned empty state.

After opening v3 and waiting for GitHub list consistency:

- sync `state=open` returned `issuesSeen=4`;
- `workItemsCreated=4`;
- `lastIssueNumbers=[79,78,77,76]`;
- `GET /api/company-brain/next-work` recommends
  `#76 AIOS-RUN-15: Async AgentRun spawn with PID, SIGTERM and SSE logs v3`
  with `candidatesConsidered=4`.

## Next Handoff Prompt

```text
Nova milestone pronta: AIOS Agent Execution v3.

Estado:
- Milestone AIOS Agent Execution v2 está 100% concluída.
- Nova milestone tem issues #76 a #79.
- WORKFLOW.md aponta para AIOS Agent Execution v3.
- Company Brain já foi sincronizado em produção.
- Next Work recomenda #76 AIOS-RUN-15: Async AgentRun spawn with PID, SIGTERM and SSE logs v3.
- Comece de origin/main atualizado.

Siga em modo contínuo issue-by-issue:
#76 -> #77 -> #78 -> #79.

Contrato:
- Para cada issue: branch de origin/main, implementação, validação, PR com Closes #NN, QA/review, merge, deploy se necessário para dogfood, session result, sync Company Brain, próxima issue.
- Pode seguir sem parar em docs, API/MCP/UI internas, async spawn, PID/executionRef, SIGTERM, SSE/log streaming, workspace per-run, git worktree remove gated e Operating Loop suggester observe-only.
- Pare antes de auto-dispatch amplo, novo segredo/permissão, serviço pago, writeback externo fora das policies, auto-merge/deploy ou cleanup fora do workspace root.

Comece por #76.
```
