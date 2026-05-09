# AIOS-ERP-02 ERP Issue Sync and First WorkItem Selection

Date: 2026-05-08
Issue: `#155`
Milestone: `AIOS ERP Pilot Execution v1`

## Goal

Bring the ERP GitHub issue queue into Company Brain and select the first
low-risk WorkItem for the cross-project AIOS pilot.

## ERP Source Sync

Synced read-only:

- repo: `antonio-mello-ai/erp-desmanches`
- state: `open`
- area: `development`
- owner: `Antonio`
- sourceId: `4po23mTIe1o1`
- issuesSeen: `3`
- workItemsCreated: `3`
- lastIssueNumbers: `[109, 108, 99]`

No ERP issue was closed, relabeled, assigned or mutated.

## Candidates

### Selected

`antonio-mello-ai/erp-desmanches#108`

- title: `MIG-00 — Discovery de exportabilidade IBR/Mercado Livre para onboarding`
- WorkItem: `cRBiAu_EMtgU`
- Artifact: `uHbMq2DuRrMH`
- labels include `risk:class-a`, `type:docs`, `type:data`,
  `domain:migration`, `priority:p1`
- stated risk: Classe A
- scope: discovery/documentation
- no product code, no production DB, no automated external calls

### Deferred

`antonio-mello-ai/erp-desmanches#109`

- title: `MIG-01 — Arquitetura de staging para importacao de ERPs legados`
- WorkItem: `JNXOeZz7eG8A`
- Artifact: `6lEG5z9UNmXP`
- stated risk: Classe B
- reason deferred: architecture/base-data decision; safer after MIG-00
  discovery clarifies source fields and boundaries.

`antonio-mello-ai/erp-desmanches#99`

- title: `DEMO-DATA-01 — Recriar seed/demo canônico para v0.31+`
- WorkItem: `KKm2D9oJgUu4`
- Artifact: `qDs8RFH97S4o`
- stated risk: Class B by labels
- reason deferred: touches demo seed/data and may imply runtime/deploy
  validation; not the safest first cross-project dogfood.

## Decision

Decision record:

- id: `UtUclapR7EL5`
- title: `First ERP AIOS pilot WorkItem: MIG-00 exportability discovery`
- status: `accepted`
- selected WorkItem: `cRBiAu_EMtgU`
- selected external issue: `antonio-mello-ai/erp-desmanches#108`
- source artifacts: `uHbMq2DuRrMH`, `6lEG5z9UNmXP`, `qDs8RFH97S4o`

Rationale:

`#108` is the safest first target because it is explicitly Classe A,
docs/discovery-only, has clear acceptance criteria and reduces onboarding risk
without touching ERP runtime, production data or marketplace integrations.

## Boundaries

Allowed next step:

- supervised dogfood AgentRun against ERP WorkItem `cRBiAu_EMtgU`;
- profile: `erp-dogfood-semantic-doc-change`;
- output: reviewable docs/action evidence file in ERP repo;
- no external writeback until PR proposal/preflight issue `#157`.

Still blocked:

- auto-dispatch;
- auto-merge;
- deploy;
- ERP production DB access;
- marketplace APIs;
- customer data export;
- billing;
- permissions;
- email;
- notification-read;
- closing/relabeling ERP issues from AIOS.

## Acceptance Mapping

- ERP GitHub Issues source healthy in Company Brain: yes.
- Candidate WorkItems visible with external refs and labels: yes.
- First pilot WorkItem selected and documented: yes, ERP `#108`.
- No runner launch, no PR writeback, no ERP code mutation: yes.
- `git diff --check` for docs changes: required before PR.

## Next

`#156` should open a short controlled runner/workspace env window scoped to
`antonio-mello-ai/erp-desmanches`, preview/launch exactly one supervised
AgentRun against `cRBiAu_EMtgU`, collect patch packet/session_result, then
restore default-off.
