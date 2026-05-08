# AIOS Agent Execution v6 Milestone

Date: 2026-05-08

## Context

`AIOS Agent Execution v5` closed controlled auto-dispatch hardening:

- auto-dispatch config clarity and policy hints;
- stable WorkflowBlueprint identity;
- workspace cleanup review UX;
- internal audited WorkItem status updates;
- successful dogfood with a benign command reaching `status=completed`.

The next milestone moves from a benign completed run to the first PR-shaped
loop in the internal AIOS repo. This still is not broad multi-issue autonomy.

## GitHub Milestone

- Milestone: `AIOS Agent Execution v6`
- GitHub milestone number: `9`
- Repo: `antonio-mello-ai/crewdock`

## Issues

- `#104 AIOS-RUN-29: Agent runner profile registry v6`
- `#105 AIOS-RUN-30: AgentRun patch and validation collector v6`
- `#106 AIOS-RUN-31: AgentRun to GitHub PR proposal preview v6`
- `#107 AIOS-RUN-32: Approved GitHub PR writeback executor v6`
- `#108 AIOS-RUN-33: First AIOS-authored PR dogfood pack v6`

## Execution Contract

The implementation window can proceed issue-by-issue through `#104 -> #108`.

Allowed without stopping:

- docs and runbooks;
- internal schema/API/MCP/UI;
- runner profile registry and policy evaluation;
- patch/validation packet collection from isolated workspaces;
- preview-only PR proposal creation;
- approved GitHub PR creation for `antonio-mello-ai/crewdock` using existing
  writeback governance and idempotency;
- controlled dogfood of a first AIOS-authored PR.

Stop before:

- broad multi-issue auto-dispatch;
- customer or external repos;
- new secrets or permissions;
- new paid services;
- external writeback outside the existing policy system;
- auto-merge or deploy;
- cleanup outside the AIOS workspace root.

## Production Evidence

Before opening v6, production `next-work` was empty after v5 closure.

After opening v6, updating CT165 to `e470a22` and syncing GitHub Issues:

- sync `state=open` returned `issuesSeen=5`;
- `workItemsCreated=5`;
- `lastIssueNumbers=[108,107,106,105,104]`;
- `GET /api/company-brain/workflow-loader` returned
  `activeMilestone=AIOS Agent Execution v6`, `isValid=true`;
- `GET /api/company-brain/next-work` recommends
  `#104 AIOS-RUN-29: Agent runner profile registry v6`
  with `candidatesConsidered=5`.

## Next Handoff Prompt

```text
Nova milestone pronta: AIOS Agent Execution v6.

Estado:
- Milestone AIOS Agent Execution v5 está 100% concluída.
- Nova milestone tem issues #104 a #108.
- WORKFLOW.md aponta para AIOS Agent Execution v6.
- Company Brain já foi sincronizado em produção.
- Next Work recomenda #104 AIOS-RUN-29: Agent runner profile registry v6.
- Comece de origin/main atualizado.

Siga em modo contínuo issue-by-issue:
#104 -> #105 -> #106 -> #107 -> #108.

Contrato:
- Para cada issue: branch de origin/main, implementação, validação, PR com Closes #NN, QA/review, merge, deploy se necessário para dogfood, session result, sync Company Brain, próxima issue.
- Pode seguir sem parar em docs, API/MCP/UI internas, runner profiles, patch/validation packet, PR proposal preview, approved GitHub PR writeback para antonio-mello-ai/crewdock e dogfood controlado de primeiro PR AIOS-authored.
- Pare antes de broad multi-issue auto-dispatch, customer repo, novo segredo/permissão, serviço pago, auto-merge/deploy ou writeback externo fora das policies.

Comece por #104.
```
