# AIOS-RUN-37: Same-PR Iteration Loop v7

Date: 2026-05-08

Issue: `#118`

Branch: `aios-run-37-same-pr-iteration`

## Scope

Let follow-up `AgentRun`s for the same `WorkItem` update the existing
AIOS-authored PR instead of opening duplicate PRs.

The cut keeps the existing boundaries:

- no auto-merge;
- no deploy from an AgentRun;
- no customer repo;
- no new secret or paid service;
- GitHub mutation only through approved `ExternalActionProposal`.

## Implementation

- `GitHubPrProposalPayload` now carries an optional `iteration` plan.
- `AgentRunPatchPacket` now records:
  - `attempt`;
  - `previousPrUrl`;
  - `validationDelta`.
- PR proposal preview/chain now computes whether the run should:
  - `open_new_pr`; or
  - `update_existing_pr`.
- Same-PR iteration gates require:
  - same repo;
  - same base branch;
  - existing PR number;
  - open and non-merged PR;
  - AIOS marker in existing PR body;
  - expected head branch and base branch.
- The PR body preview includes the iteration decision, existing PR URL
  when present, attempt, previous PR URL and validation delta.
- The PR executor supports `update_existing_pr`:
  - verifies the same gates again before mutation;
  - fetches the current remote PR branch;
  - pushes `HEAD` to the existing AIOS branch with `--force-with-lease`
    pinned to the fetched SHA;
  - patches the existing PR body with the new proposal marker and an
    `aios-iteration` audit marker;
  - records `external_action_proposal_executed_pr_iteration`.
- Re-execute remains idempotent: a completed proposal returns the same PR
  URL/number without pushing or patching again.

## Dogfood

Local daemon:

```bash
AIOS_DB_PATH=/tmp/aios-run37-smoke.sqlite
AIOS_PORT=43194
AIOS_HOST=127.0.0.1
AIOS_AGENT_WORKSPACE_ENABLED=true
AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_ENABLED=true
AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=echo,true,git,bash
AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=true
AIOS_AGENT_GITHUB_PR_WRITEBACK_REPO_ALLOWLIST=antonio-mello-ai/crewdock
GITHUB_TOKEN=$(gh auth token)
```

The run used the existing GitHub auth token already available locally.
No new secret was created.

Evidence:

- Source: `g__8xi4wJGs7`
- WorkItem: `3kZlbq_GoAqN`
- PR: `#123`
  (`https://github.com/antonio-mello-ai/crewdock/pull/123`)

Iteration 1:

- AgentRun: `hKdYpEQI6Y-E`
- ExternalActionProposal: `AIkkvT0ACws7`
- decision: `open_new_pr`
- PR number: `123`
- PR URL: `https://github.com/antonio-mello-ai/crewdock/pull/123`
- patch packet Artifact: `qHIXaF-8RPre`
- `previousPrUrl=null`

Iteration 2:

- AgentRun: `-JXEVkzaQJLs`
- ExternalActionProposal: `XKvb2kKKDcCC`
- decision: `update_existing_pr`
- PR number: `123`
- PR URL: `https://github.com/antonio-mello-ai/crewdock/pull/123`
- patch packet Artifact: `u4OHaz6_d1Cw`
- `previousPrUrl=https://github.com/antonio-mello-ai/crewdock/pull/123`
- audit event: `external_action_proposal_executed_pr_iteration`

Observed final state:

- proposal count for WorkItem: `2`
- unique PR URLs for WorkItem: `1`
- PR `#123` state: `OPEN`
- base: `main`
- head: `aios-aios-run-37-dogfood-1778271293-hkdypeqi`
- marker count in PR body: `2`
- `aios-iteration` marker present: `true`
- re-chain of iteration 2 returned `status=reused`, `alreadyExisted=true`
- re-execute of iteration 2 returned `alreadyExecuted=true`

## Validation

- `npx turbo build --filter=@aios/shared --filter=@aios/daemon`
- dogfood API cycle above
- `git diff --check`
- `npx turbo build`

## Merge and Deploy

- PR: `#124`
- Merge commit: `e1b6caa`
- Issue `#118`: closed
- CT165 fast-forwarded to `e1b6caa`
- CT165 build:
  `npx turbo build --filter=@aios/daemon --filter=@aios/mcp-server --force`
- `aios-daemon`: `active`
- `GET https://api.felhen.ai/api/health` -> 200
- Loopback route smoke on CT165:
  `POST /api/company-brain/agent-runs/not-found/github-pr-proposal/chain`
  -> 404 expected (`agent run not found`)
- Remote Operating Snapshot with CF service token:
  `overallStatus=healthy`, `autoDispatchPolicy.config.enabled=false`
- Production session_result submitted for WorkItem `kGQMOtwSiViJ`:
  artifact `gyjEFhkwdCVP`, `workItemUpdated=true`,
  `prLinkRecorded=true`, `guidanceItemsCreated=1`

## Boundaries

- PR `#123` is intentionally left open for human review.
- No auto-merge was attempted.
- No deploy was attempted from the AgentRun.
- No customer repo was touched.
- No broad multi-issue auto-dispatch was enabled.
