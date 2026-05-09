# AIOS-ERP-01 ERP-safe Dogfood Profile and Target Readiness

Date: 2026-05-08
Issue: `#154`
Milestone: `AIOS ERP Pilot Execution v1`

## Goal

Make `pilot-target-erp-desmanches` eligible for a controlled low-risk dogfood
launch without enabling real-agent secrets, auto-dispatch, auto-merge, deploy,
ERP production database access or marketplace mutations.

## Problem Found

The second target was registered correctly in `#142`, but target readiness was
still anchored only on `real_agent` profiles. That made a dogfood-only pilot
look structurally blocked with `no_real_agent_profile_allowed`, even though the
next safe step is a no-secret dogfood run.

## Runtime Changes

- Added runner profile `erp-dogfood-semantic-doc-change`.
  - Category: `dogfood`.
  - Command: `bash`.
  - Auth: none.
  - Allowed repo: `antonio-mello-ai/erp-desmanches`.
  - Area: `development`.
  - Risk ceiling: `A`.
  - Output: committed `docs/action/aios-erp-dogfood-<workItem>.md`.
- Changed `PilotTargetReadiness` to evaluate launchable profiles:
  - `dogfood`;
  - `real_agent`.
- Kept `noop` profiles out of PilotTarget launch readiness.
- Added `PATCH /api/company-brain/pilot-targets/:id`.
  - Requires `actor`.
  - Requires `rationale`.
  - Validates runner profile ids and workflow blueprint id.
  - Updates boundaries/status/metadata without changing target repo.
- Added shared type `UpdatePilotTargetRequest`.
- Updated `WORKFLOW.md` profile table.

## Local Smoke

Temp daemon:

- DB: `/tmp/aios-erp-profile-smoke.sqlite`
- port: `43221`
- auth disabled locally

Validated:

- `erp-dogfood-semantic-doc-change` appears in runner profile readiness for
  `antonio-mello-ai/erp-desmanches`;
- `POST /pilot-targets` accepts a test ERP target;
- `PATCH /pilot-targets/test-erp` updates allowed profiles to
  `erp-dogfood-semantic-doc-change`;
- readiness no longer includes `no_real_agent_profile_allowed`;
- readiness remains blocked by env gates while production/default-off settings
  are absent, as expected.

Default-off block reasons after patch:

- `no_ready_launchable_profile`
- `erp-dogfood-semantic-doc-change:runner_enabled`
- `erp-dogfood-semantic-doc-change:workspace_writes_enabled`
- `erp-dogfood-semantic-doc-change:command_allowlisted`
- `erp-dogfood-semantic-doc-change:runner_repo_allowlisted`

## Production Follow-up

After merge/deploy, update the real target:

- id: `pilot-target-erp-desmanches`
- allowed profile: `erp-dogfood-semantic-doc-change`

Expected production state after update:

- target remains `active`;
- target remains default-off blocked until a controlled env window;
- the block should be env/policy-based, not missing-profile-based;
- no AgentRun starts in this issue.

## Boundaries

Still blocked:

- broad auto-dispatch;
- auto-merge;
- deploy;
- ERP production DB access;
- marketplace APIs;
- customer data export;
- billing;
- permissions;
- email;
- notification-read;
- new paid services;
- new secrets.

## Next

`#155` should sync the ERP issue queue read-only and select the first low-risk
ERP WorkItem for the controlled dogfood run.
