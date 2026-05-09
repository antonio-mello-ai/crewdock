# AIOS-ERP-05 pilot evaluation and promotion decision

Date: 2026-05-08

## Control issue

- AIOS issue: `#158`
- WorkItem: `myNiJnr9FvNy`
- Milestone: `AIOS ERP Pilot Execution v1`

## Pilot evidence packet

Target:

- PilotTarget: `pilot-target-erp-desmanches`
- repo: `antonio-mello-ai/erp-desmanches`
- profile: `erp-dogfood-semantic-doc-change`
- risk ceiling: `A`

ERP WorkItem:

- ERP issue: `antonio-mello-ai/erp-desmanches#108`
- WorkItem: `cRBiAu_EMtgU`
- source artifact: `uHbMq2DuRrMH`

AgentRun:

- AgentRun: `R0oAMnjT_LRn`
- status: `completed`
- session result artifact: `5yhvhp33ljwX`
- workspace remote:
  `https://github.com/antonio-mello-ai/erp-desmanches.git`
- merge-base with ERP `origin/main`:
  `39a76ce3934cd66afb288450976d140e2a84f1dc`

Patch packet:

- artifact: `IdVCz3a5xRtZ`
- status: `clean`
- changed file: `docs/action/aios-erp-dogfood-cRBiAu_EMtgU.md`
- diff: `1 file changed, 9 insertions, 0 deletions`
- validations: `runner_exit_zero`, `patch_content`, `git_commit`

Proposal and PR:

- ExternalActionProposal: `rBGhT13JpqFZ`
- preflight artifact: `p_csBdBPD-Ir`
- executionStatus: `executed`
- PR: `https://github.com/antonio-mello-ai/erp-desmanches/pull/111`
- re-execute: `alreadyExecuted=true`

Review intake:

- review artifact: `fiSgAWeEcRjx`
- review signal: `HDFwwBOcRuXZ`
- review status: `awaiting_human_review`

Final session result:

- artifact: `R_G44DAsa3Qz`
- outcome: `pr_opened`
- guidance created: `2`

AgentRun evaluation:

- evaluation artifact: `QREyO3yZk9ie`
- primaryKind: `success`
- confidence: `0.85`
- validationsFailed: `0`
- blockers: `0`
- nextStepCount: `2`

## Decision

Decision record:

- id: `JDG7za-20CJw`
- title:
  `ERP pilot promotion decision: harden supervised dogfood before real implementation runs`
- status: `accepted`

Decision:

AIOS is promoted from **registration-only** to **supervised dogfood PR flow** for
ERP. AIOS is **not** promoted yet to real ERP implementation AgentRuns.

Rationale:

- The cross-project loop worked end-to-end:
  WorkItem -> AgentRun -> patch packet -> approved PR proposal -> ERP PR ->
  review intake -> session result -> evaluation.
- Human review of ERP PR `#111` is still pending.
- The first failed PR attempt left a bad remote branch that needs governed
  cleanup, not automatic deletion.
- The writeback evidence packet for `github_pr_create` still reports false
  critical gaps because the generic audit review does not yet recognize PR
  preflight and execution events as preview/execution snapshots.

## Risks and frictions

1. `github_pr_create` evidence packet false positives
   - Observed on proposal `rBGhT13JpqFZ`.
   - Flags included `missing_preview_event` and `missing_execution_event`
     despite ready preflight and executed PR writeback.
   - Next action: issue `#165`.

2. Failed pre-fix remote branch
   - Branch:
     `aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq`
   - No PR attached.
   - Next action: issue `#166`.

3. Human review still pending
   - ERP PR `#111` is intentionally awaiting human review.
   - Next action: issue `#167`.

4. Real implementation promotion criteria not defined yet
   - The successful run was docs-only dogfood.
   - Next action: issue `#168`.

## Follow-up milestone

Created milestone:

- `AIOS ERP Pilot Hardening v2`
- number: `14`

Created issues:

- `#165` AIOS-ERP-HARD-01: PR evidence packet audit mapping
- `#166` AIOS-ERP-HARD-02: Governed cleanup path for failed ERP branch
- `#167` AIOS-ERP-HARD-03: Human review loop for ERP PR #111
- `#168` AIOS-ERP-HARD-04: Promotion criteria for real ERP AgentRuns

## Production closeout

- `#154`, `#155`, `#156`, `#157` are closed.
- `#158` closes with the PR that adds this evidence.
- Production default-off verified after the writeback window:
  no runner/workspace/autodispatch/PR-writeback env gates remained enabled.
- CT165 daemon active.
- `GET https://api.felhen.ai/api/health` returned `200`.

## Acceptance

- Evidence packet references target, WorkItem, AgentRun, patch packet,
  proposal/PR, session_result and review intake: yes, via this action doc and
  linked Company Brain records.
- Risks/frictions documented with next actions: yes.
- WorkItems in the milestone are closed or carried forward: yes.
- Production default-off verified at the end: yes.
