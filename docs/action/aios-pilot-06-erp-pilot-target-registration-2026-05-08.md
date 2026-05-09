# AIOS-PILOT-06 ERP PilotTarget Registration

Date: 2026-05-08
Issue: `#142`
Milestone: `AIOS First Internal Pilot v1`

## Goal

Register the second internal pilot target with explicit repo, profile, risk,
writeback and stop-condition boundaries. Do not launch a real AgentRun.

## Runtime Change

Added an audited API path for future target registration:

- `POST /api/company-brain/pilot-targets`
- shared type: `CreatePilotTargetRequest`
- validates:
  - `repo` in `owner/name` form;
  - stable id format;
  - status;
  - risk ceiling;
  - runner profile ids;
  - workflow blueprint id.
- returns target readiness immediately after registration.

PR:

- `#152`
- commit: `754d1fe`
- deploy: CT165 daemon updated and active
- validation: `git diff --check`,
  `npx turbo build --filter=@aios/shared --filter=@aios/daemon --force`,
  CT165 `npx turbo build --filter=@aios/daemon --force`, public health `200`

## Registered Target

Target:

- id: `pilot-target-erp-desmanches`
- project: `ERP Desmanches`
- repo: `antonio-mello-ai/erp-desmanches`
- area: `development`
- default workflow blueprint: `development-blueprint-v0`
- allowed profiles: `dogfood-semantic-doc-change`
- risk ceiling: `A`
- owner: `Antonio`
- status: `active`
- decision: `VPM0j_Ygp9va`

Readiness:

- status: `blocked`
- `readyForManualLaunch=false`
- block reasons:
  - `no_real_agent_profile_allowed`
  - `no_ready_real_agent_profile`
- recommended action:
  `Add at least one allowed real-agent profile and satisfy its readiness gates.`

This is intentional for registration: the target exists and is visible, but no
real AgentRun is launch-ready until a future issue explicitly approves real
agent profiles/secrets.

## Boundaries

Allowed actions:

- readiness review
- manual AgentRun preview
- human-approved AgentRun
- GitHub PR create proposal

Blocked actions:

- auto-dispatch
- auto-merge
- auto-deploy
- production DB write
- marketplace mutation
- customer data export
- billing
- permissions
- email
- notification-read

Required connectors:

- GitHub Issues
- GitHub PR/CI
- git worktree

Not required for this target registration:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- ERP production database credentials
- Mercado Livre token
- Shopee token
- deploy token

Stop conditions:

- PR `#149` review finds a problem in the AIOS-authored PR loop.
- Runner asks for secrets outside the target boundary.
- Patch packet includes unrelated files or stale base drift.
- Work item requires production DB, marketplace API, deploy, billing,
  permissions or customer-impacting mutation.
- PR proposal preflight is not ready.

## Acceptance Mapping

- PilotTarget exists and is visible in API/UI data: yes,
  `pilot-target-erp-desmanches`.
- Readiness checklist exposes blocked/warn/ready state: yes, currently
  `blocked`.
- Boundaries cover repo, commands, profiles, workspace, writeback and stop
  conditions: yes, in target metadata and this evidence packet.
- No real AgentRun starts as part of this issue: yes.

## Next

Before running ERP work through AIOS:

1. Review/resolve PR `#149` or explicitly accept it as pending human-review
   evidence.
2. Decide whether the first ERP run remains `dogfood`/no-secret or enables a
   real agent profile.
3. Open a new milestone for ERP pilot execution with a single low-risk WorkItem
   and explicit env window.
