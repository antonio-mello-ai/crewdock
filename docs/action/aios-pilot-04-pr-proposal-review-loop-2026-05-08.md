# AIOS-PILOT-04 PR Proposal Review Loop

Date: 2026-05-08
Issue: `#140`
Milestone: `AIOS First Internal Pilot v1`

## Goal

Turn the successful AIOS-PILOT-03 AgentRun patch packet into a governed
GitHub PR proposal, execute the approved PR writeback only for the internal
AIOS repo, ingest the AIOS-authored PR review evidence back into Company Brain,
and leave the PR open for human review.

## Input

- Source WorkItem: `HHxoEZGAvnYU`
  (`antonio-mello-ai/crewdock#139`)
- AgentRun: `EkBKGo5bw2Uu`
- Profile: `dogfood-semantic-doc-change`
- Original patch packet artifact: `laKzBb8ZWfgz`
- Produced file:
  `docs/action/aios-semantic-dogfood-HHxoEZGAvnYU.md`

## Stale Proposal Rejected

The first generated proposal exposed a real base-drift issue:

- proposal: `ejPNK9QR3SMk`
- status: rejected/cancelled
- reason: `main` advanced after AgentRun `EkBKGo5bw2Uu`, so the patch packet
  included unrelated stale deletions/modifications.

The workspace was rebased on current `origin/main` before any writeback:

- branch: `aios-antonio-mello-ai_crewdock_139-ekbkgo5b`
- new head: `4c2ba45960064821c940d2d4b8150c1e099bfbbe`
- final diff: 1 file, +9/-0

## Governed Proposal

Clean proposal:

- proposal: `1KkrgaOa9-C7`
- action type: `github_pr_create`
- approval status: `approved`
- execution status after writeback: `executed`
- destination:
  `antonio-mello-ai/crewdock:aios-antonio-mello-ai_crewdock_139-ekbkgo5b->main`
- patch packet artifact: `-bG8gz07f6ZV`
- title: `feat(aios): docs: add supervised AIOS semantic dogfood note`

Patch packet after rebase:

- status: `clean`
- base ref: `main`
- changed files: `1`
- insertions: `9`
- deletions: `0`
- commits ahead: `1`
- changed file: `docs/action/aios-semantic-dogfood-HHxoEZGAvnYU.md`

## PR Writeback Window

Temporary CT165 env:

```text
AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=true
AIOS_AGENT_GITHUB_PR_WRITEBACK_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_AUTODISPATCH_ENABLED=false
```

Preflight:

- artifact: `Xb2kcaEFlk2p`
- status: `ready`
- repo: `antonio-mello-ai/crewdock`
- token source: `GITHUB_TOKEN`
- auth scheme: API `bearer`, git push `x-access-token-url`
- workspace ready: yes
- base branch visible: yes
- push probe: attempted and passed
- failed gates: none

The proposal was approved by `codex` with HITL rationale before execution.

## GitHub PR

Execution result:

- PR: `#149`
- URL: `https://github.com/antonio-mello-ai/crewdock/pull/149`
- state: `OPEN`
- base: `main`
- head: `aios-antonio-mello-ai_crewdock_139-ekbkgo5b`
- mergeable: `MERGEABLE`
- AIOS marker present:
  `proposalId=1KkrgaOa9-C7`, `agentRunId=EkBKGo5bw2Uu`,
  signature `00723b854b1e`

Idempotency check after restoring default-off:

- re-execute returned `alreadyExecuted=true`
- PR number reused: `149`
- no duplicate PR or push

## Review Intake

Production sync:

- endpoint: `POST /api/company-brain/adapters/github/aios-pr-reviews/sync`
- `pullRequestsSeen=64`
- `aiosPullRequestsSeen=6`
- `pendingHumanReviewCount=1`
- `artifactsCreated=1`
- `artifactsUpdated=5`
- `signalsCreated=1`

PR `#149` intake:

- review status: `awaiting_human_review`
- WorkItem link: `HHxoEZGAvnYU`
- marker AgentRun: `EkBKGo5bw2Uu`
- marker proposal: `1KkrgaOa9-C7`
- patch packet artifact: `-bG8gz07f6ZV`
- review artifact: `Apby2Blmg6Lr`
- signal: `4Wwa0PHg8XlZ`

## Restore

The CT165 backup was restored after PR creation:

- `runnerEnabled=false`
- `workspaceWritesEnabled=false`
- `autoDispatchEnabled=false`
- `prWritebackEnabled=false`
- runner/workspace allowlists empty
- `aios-daemon` active

## Acceptance Mapping

- ExternalActionProposal has preview, approval, idempotency marker and audit
  trail: yes, proposal `1KkrgaOa9-C7`.
- GitHub PR is created or reused only for `antonio-mello-ai/crewdock`: yes,
  PR `#149`.
- AIOS PR review intake links PR to WorkItem, AgentRun, proposal and patch
  packet: yes, via marker + intake artifact.
- session_result is submitted and WorkItem status reconciled: handled by the
  closing session result for `#140`.
- No merge/deploy/customer repo: yes. PR `#149` remains open for human review.

## Next

`#141` should decide the next internal project target after this AIOS pilot,
using the evidence from:

- `#139` first supervised AgentRun;
- `#140` governed PR proposal/writeback/review intake;
- open PR `#149` awaiting human review.
