# AIOS-ERP-03 First Supervised ERP AgentRun Dogfood

Date: 2026-05-08
Issue: `#156`
Milestone: `AIOS ERP Pilot Execution v1`

## Goal

Run exactly one supervised AIOS AgentRun against
`antonio-mello-ai/erp-desmanches`, using the ERP-safe no-secret dogfood
profile selected in `#154` and the first ERP pilot WorkItem selected in `#155`.

## Inputs

Control issue:

- `antonio-mello-ai/crewdock#156`
- WorkItem `xwDx1iYzTmaV`

Target WorkItem:

- `antonio-mello-ai/erp-desmanches#108`
- WorkItem `cRBiAu_EMtgU`
- title `MIG-00 - Discovery de exportabilidade IBR/Mercado Livre para onboarding`
- selected by Decision `UtUclapR7EL5`

Pilot target:

- id `pilot-target-erp-desmanches`
- repo `antonio-mello-ai/erp-desmanches`
- allowed profile `erp-dogfood-semantic-doc-change`
- risk ceiling `A`

## Default-off Preflight

Before opening the env window, launcher preview returned:

- `canLaunch=false`
- command `bash`
- policy `blocked_workspace`
- workspace preview
  `/home/claude/.aios/agent-workspaces/antonio-mello-ai_erp-desmanches/antonio-mello-ai_erp-desmanches_108-preview`
- block reasons included:
  - `profile_not_ready`
  - `runner_disabled`
  - `workspace_not_allowlisted`
  - `runner_repo_not_allowlisted`
  - `command_not_allowlisted`

This confirmed production was blocked by default.

## Controlled Env Window

CT165 backup:

- `/home/claude/.aios/env-backups/.env.prod.before-aios-erp-03-20260509031635`

Temporary env:

- `AIOS_AGENT_RUNNER_ENABLED=true`
- `AIOS_AGENT_WORKSPACE_ENABLED=true`
- `AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/erp-desmanches`
- `AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/erp-desmanches`
- `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=claude,codex,echo,true,git,bash`
- `AIOS_AGENT_AUTODISPATCH_ENABLED=false`
- `AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=false`

Launcher preview during window:

- `canLaunch=true`
- command `bash`
- policy `allowed_real_execution`
- block reasons `[]`

## AgentRun

Created:

- AgentRun `bDRnbqzQLjdV`
- outcome `queued`
- repo `antonio-mello-ai/erp-desmanches`
- profile `erp-dogfood-semantic-doc-change`

Executed:

- outcome `completed`
- status `completed`
- exitCode `0`
- command `bash`
- policy `allowed_real_execution`
- workspace
  `/home/claude/.aios/agent-workspaces/antonio-mello-ai_erp-desmanches/antonio-mello-ai_erp-desmanches_108-bdrnbqzq`
- branch `aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq`
- session result artifact `RBzKJvgipEcl`
- session result source `fallback_stdout`

Commit created in the ERP worktree:

- `6d77644f6ff97a564e29be1c9f1bd2127699e3d3`
- subject `docs: add ERP AIOS dogfood note`
- file `docs/action/aios-erp-dogfood-cRBiAu_EMtgU.md`
- diff `1 file changed, 9 insertions`

## Patch Packet

Persisted patch packet:

- artifact `aobJKGHnCyx0`
- status `clean`
- diffStat `1 file changed, +9/-0`
- changed file:
  - `docs/action/aios-erp-dogfood-cRBiAu_EMtgU.md`
- validations:
  - `runner_exit_zero=passed`
  - `patch_content=passed`
  - `git_commit=passed`

## Restore

Immediately after execution, the env backup was restored and `aios-daemon`
restarted.

Post-restore state:

- daemon active;
- `/api/health` returned `ok`;
- `pilot-target-erp-desmanches` readiness returned `blocked`;
- `readyForManualLaunch=false`;
- block reasons are default-off env gates:
  - `no_ready_launchable_profile`
  - `erp-dogfood-semantic-doc-change:runner_enabled`
  - `erp-dogfood-semantic-doc-change:workspace_writes_enabled`
  - `erp-dogfood-semantic-doc-change:command_allowlisted`
  - `erp-dogfood-semantic-doc-change:runner_repo_allowlisted`

## Boundaries Held

- One run only.
- No auto-dispatch.
- No PR writeback.
- No push.
- No auto-merge.
- No deploy.
- No ERP production DB.
- No marketplace API.
- No customer data export.
- No new secret.
- No paid service.

## Next

`#157` should convert patch packet `aobJKGHnCyx0` into a governed
`github_pr_create` proposal for `antonio-mello-ai/erp-desmanches`, run PR
preflight, and open the first AIOS-authored ERP PR only if the proposal is
approved and ready.
