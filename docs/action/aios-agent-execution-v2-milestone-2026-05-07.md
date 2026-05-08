# AIOS Agent Execution v2 Milestone

Date: 2026-05-07

## Context

`AIOS Agent Execution v1` is closed. It delivered AgentRun schema/lifecycle,
WORKFLOW.md loading, workspace preparation, dry-run orchestration, Session
Result UI, registry-driven Operating Map and evaluation-driven
ImprovementProposal records.

The next useful cut is not more read-only dashboarding. It is a supervised
real runner: one manual AgentRun can execute in an isolated workspace with
policy gates, logs, cancellation, result intake and dogfood evidence. Broad
auto-dispatch remains out of scope.

## GitHub Milestone

- Milestone: `AIOS Agent Execution v2`
- GitHub milestone number: `5`
- Repo: `antonio-mello-ai/crewdock`

## Issues

- `#62 AIOS-RUN-08: Runner policy and execution gates v2`
- `#63 AIOS-RUN-09: Manual real subprocess executor v2`
- `#64 AIOS-RUN-10: AgentRun logs, heartbeat, timeout and cancel v2`
- `#65 AIOS-RUN-11: Runner session result auto-intake v2`
- `#66 AIOS-RUN-12: Workspace cleanup and quarantine gate v2`
- `#67 AIOS-RUN-13: Agent Runs execution console v2`
- `#68 AIOS-RUN-14: Supervised runner dogfood pack v2`

## Execution Contract

The implementation window can proceed issue-by-issue through `#62 -> #68`.

Allowed without stopping:

- docs and runbooks;
- internal schema/API/MCP/UI;
- policy read/preview gates;
- manual execution behind env and allowlists;
- log/heartbeat/timeout/cancel;
- session result intake;
- workspace cleanup preview and quarantine;
- controlled dogfood with explicit actor/rationale.

Stop before:

- broad auto-dispatch;
- new secrets or permissions;
- new paid services;
- external writeback outside the existing policy system;
- auto-merge or deploy;
- destructive workspace cleanup without explicit confirmation.

## Sync Bug Found

Opening `#62` to `#68` exposed a GitHub adapter issue. The REST endpoint
`/repos/{owner}/{repo}/issues` defaults to issues assigned to the authenticated
user unless `filter=all` is passed. Because the new issues were not assigned,
the Company Brain sync saw `issuesSeen=0` even though GitHub had open issues.

Fix applied:

- `fetchGitHubIssues()` now passes `filter: "all"`.
- `WORKFLOW.md` now points at `AIOS Agent Execution v2`.
- `docs/aios-issues-runbook.md` documents the adapter requirement.

## Next Handoff Prompt

```text
Nova milestone pronta: AIOS Agent Execution v2.

Estado:
- Milestone AIOS Agent Execution v1 está 100% concluída.
- Nova milestone tem issues #62 a #68.
- WORKFLOW.md aponta para AIOS Agent Execution v2.
- O GitHub Issues adapter foi corrigido para usar filter=all, então issues sem assignee entram no Company Brain.
- Comece de origin/main atualizado.

Siga em modo contínuo issue-by-issue:
#62 -> #63 -> #64 -> #65 -> #66 -> #67 -> #68.

Contrato:
- Para cada issue: branch de origin/main, implementação, validação, PR com Closes #NN, QA/review, merge, deploy se necessário para dogfood, session result, sync Company Brain, próxima issue.
- Pode seguir sem parar em docs, API/MCP/UI internas, policy gates, logs, cancelamento, workspace quarantine e dogfood controlado.
- Pode implementar execução real manual apenas atrás de env flag/allowlist/actor+rationale e sem entregar GitHub token ao subprocess por default.
- Pare antes de auto-dispatch amplo, novo segredo/permissão, serviço pago, writeback externo fora das policies, auto-merge/deploy ou cleanup destrutivo sem confirmação explícita.

Comece por #62.
```
