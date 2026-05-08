# AIOS-RUN-36: Auto-dispatch to PR Proposal Chain v7

Date: 2026-05-08

Issue: `#117`

Branch: `aios-run-36-autodispatch-pr-proposal-chain`

## Scope

Close the gap between controlled auto-dispatch and PR governance:

`WorkItem -> AgentRunSuggestion -> AgentRun -> patch packet Artifact -> github_pr_create ExternalActionProposal`

No SQLite seeding was used in the dogfood. No PR was opened, merged or deployed by this cut.

## Implementation

- Added `POST /api/company-brain/agent-runs/:id/github-pr-proposal/chain`.
- Added MCP tool `chain_company_brain_agent_run_github_pr_proposal`.
- Extracted PR proposal preview into a shared helper used by both:
  - `/agent-runs/:id/github-pr-proposal/preview`;
  - `/agent-runs/:id/github-pr-proposal/chain`;
  - optional post-run auto-chain.
- Patch packet persistence is now idempotent by `packetSignature`.
- `PreviewGitHubPrProposalResponse` now includes optional `patchPacket`, `patchPacketArtifactId` and `provenanceLinks`.
- Added `AgentRunPrProposalChainResponse` for operator-visible chain evidence.
- Auto-dispatch now prepares a git worktree via `/workspace/prepare` before `/execute-async`.
- Added profile `dogfood-empty-commit`, which creates a local empty git commit in the prepared worktree and never writes externally.
- Added default-off env gate:
  - `AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_ENABLED=true`;
  - optional `AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_REPO_ALLOWLIST`, falling back to `AIOS_AGENT_AUTODISPATCH_REPO_ALLOWLIST`.
- Fixed fast-run log stream race: `ERR_STREAM_WRITE_AFTER_END` no longer crashes the daemon when a subprocess exits before stdout end handlers finish.
- Fixed repeated-tick idempotency: an active promoted suggestion with a non-failed/non-cancelled AgentRun suppresses a new suggestion for the same WorkItem.

## Dogfood

Local daemon:

```bash
AIOS_DB_PATH=/tmp/aios-run36-smoke.sqlite
AIOS_PORT=43193
AIOS_HOST=127.0.0.1
AIOS_AGENT_WORKSPACE_ENABLED=true
AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_ENABLED=true
AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=echo,true,git
AIOS_AGENT_AUTODISPATCH_ENABLED=true
AIOS_AGENT_AUTODISPATCH_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_AUTODISPATCH_WORKFLOW_ALLOWLIST=development-blueprint-v0
AIOS_AGENT_AUTODISPATCH_AREA_ALLOWLIST=development,platform
AIOS_AGENT_AUTODISPATCH_REQUIRE_RISK_A=true
AIOS_AGENT_AUTODISPATCH_MAX_CONCURRENCY=1
AIOS_AGENT_AUTODISPATCH_COOLDOWN_MS=0
AIOS_AGENT_AUTODISPATCH_PROFILE_ID=dogfood-empty-commit
AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_ENABLED=true
AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_REPO_ALLOWLIST=antonio-mello-ai/crewdock
```

Evidence:

- Source: `1_4BXDWh44ey`
- WorkItem: `JmuPjFTH_8zK`
- Suggestion: `_FvY15rlQ-P2`
- AgentRun: `JVxaDk1OJF7e`
- Workspace: `/Users/antoniomello/.aios/agent-workspaces/antonio-mello-ai_crewdock/aios-run-36-dogfood-1778269691-jvxadk1o`
- Branch: `aios-aios-run-36-dogfood-1778269691-jvxadk1o`
- Patch packet Artifact: `BM7C_N07MsKe`
- ExternalActionProposal: `2ngMDUvbNJGJ`
- Idempotency key: `aios-pr-proposal:JVxaDk1OJF7e:6de52f8c706ae790`
- Patch signature: `6de52f8c706ae790e90d22660a0fdd1089dbd4d8eb260d43483aa49c826129ba`

Observed final state:

- `AgentRun.status=completed`
- `proposal.actionType=github_pr_create`
- `proposal.approvalStatus=pending`
- `proposal.executionStatus=not_started`
- `payload.commitCount=1`
- `payload.changedFileCount=1`
- explicit chain re-run returned `status=reused`, `alreadyExisted=true`
- repeated Operating Cadence tick kept:
  - suggestions total: `active=1`, `superseded=0`
  - AgentRuns total: `1`
  - ExternalActionProposals total: `1`

AgentRun audit events:

- `agent_run_promoted_from_suggestion`
- `agent_run_workspace_created`
- `agent_run_real_execution_async_started`
- `agent_run_async_pid_recorded`
- `agent_run_auto_dispatched`
- `agent_run_real_execution_completed`
- `agent_run_session_result_intake`
- `agent_run_pr_proposal_previewed`
- `agent_run_pr_proposal_preview_reused`

## Validation

- `git diff --check`
- `npx turbo build --filter=@aios/shared --filter=@aios/daemon --filter=@aios/mcp-server`
- `npx turbo build`

## Merge and Deploy

- PR: `#122`
- Merge commit: `bed7848`
- Issue `#117`: closed
- CT165 fast-forwarded to `bed7848`
- CT165 build:
  `npx turbo build --filter=@aios/daemon --filter=@aios/mcp-server --force`
- `aios-daemon`: `active`
- `GET https://api.felhen.ai/api/health` -> 200
- Loopback route smoke on CT165:
  `POST /api/company-brain/agent-runs/not-found/github-pr-proposal/chain`
  -> 404 expected (`agent run not found`)
- Remote runner profile smoke with CF service token confirmed
  `dogfood-empty-commit` is present; production evaluation is blocked by
  `profile_command_not_allowlisted`, as expected while production remains
  default-off.
- Remote Operating Snapshot:
  `overallStatus=healthy`, `autoDispatchPolicy.config.enabled=false`.
- Production session_result submitted for WorkItem `27jBb179tDhs`:
  artifact `uPjeQTsZj_w0`, `prLinkRecorded=true`, `guidanceItemsCreated=1`.

## Boundaries

- No auto-merge.
- No deploy from the AgentRun.
- No customer repo.
- No new secret.
- No paid service.
- No external mutation during dogfood.
- Production remains default-off unless the explicit env gates are enabled.
