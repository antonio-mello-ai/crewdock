# AIOS Agent Execution v4 Milestone

Date: 2026-05-08

## Context

`AIOS Agent Execution v3` closed the background-capable supervised runner:

- async AgentRun spawn with PID/SIGTERM/SSE logs;
- per-run workspace isolation keyed by AgentRun id;
- idempotent `git worktree remove` with before/after snapshot;
- Operating Loop queued-run suggestions in observe-only mode.

The next milestone introduces controlled auto-dispatch. This is not broad
multi-issue autonomy. It is one auditable dispatch path with explicit policy,
allowlists, concurrency caps, reconciliation and dogfood evidence.

## GitHub Milestone

- Milestone: `AIOS Agent Execution v4`
- GitHub milestone number: `7`
- Repo: `antonio-mello-ai/crewdock`

## Issues

- `#84 AIOS-RUN-19: Auto-dispatch governance and eligibility policy v4`
- `#85 AIOS-RUN-20: Promote Operating Loop suggestion to queued AgentRun v4`
- `#86 AIOS-RUN-21: Operating Loop single-run auto-dispatch v4`
- `#87 AIOS-RUN-22: AgentRun reconciliation, stall recovery and tracker refresh v4`
- `#88 AIOS-RUN-23: Controlled auto-dispatch dogfood pack v4`

## Execution Contract

The implementation window can proceed issue-by-issue through `#84 -> #88`.

Allowed without stopping:

- docs and runbooks;
- internal schema/API/MCP/UI;
- auto-dispatch policy evaluation;
- suggestion promotion to queued AgentRun;
- single-run Operating Loop dispatch behind explicit env/allowlists;
- reconciliation/stall recovery/tracker refresh;
- controlled dogfood.

Stop before:

- broad multi-issue auto-dispatch;
- new secrets or permissions;
- new paid services;
- external writeback outside the existing policy system;
- auto-merge or deploy;
- cleanup outside the AIOS workspace root.

## Production Evidence

Before opening v4, production `next-work` was empty after v3 closure.

After opening v4 and waiting for GitHub list consistency:

- sync `state=open` returned `issuesSeen=5`;
- `workItemsCreated=5`;
- `lastIssueNumbers=[88,87,86,85,84]`;
- `GET /api/company-brain/next-work` recommends
  `#84 AIOS-RUN-19: Auto-dispatch governance and eligibility policy v4`
  with `candidatesConsidered=5`.

## Next Handoff Prompt

```text
Nova milestone pronta: AIOS Agent Execution v4.

Estado:
- Milestone AIOS Agent Execution v3 está 100% concluída.
- Nova milestone tem issues #84 a #88.
- WORKFLOW.md aponta para AIOS Agent Execution v4.
- Company Brain já foi sincronizado em produção.
- Next Work recomenda #84 AIOS-RUN-19: Auto-dispatch governance and eligibility policy v4.
- Comece de origin/main atualizado.

Siga em modo contínuo issue-by-issue:
#84 -> #85 -> #86 -> #87 -> #88.

Contrato:
- Para cada issue: branch de origin/main, implementação, validação, PR com Closes #NN, QA/review, merge, deploy se necessário para dogfood, session result, sync Company Brain, próxima issue.
- Pode seguir sem parar em docs, API/MCP/UI internas, auto-dispatch policy, suggestion promotion, single-run dispatch, reconciliation/stall recovery e dogfood controlado.
- Pare antes de broad auto-dispatch, novo segredo/permissão, serviço pago, writeback externo fora das policies, auto-merge/deploy ou cleanup fora do workspace root.

Comece por #84.
```
