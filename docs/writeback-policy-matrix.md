# AIOS Writeback Policy Matrix

Status: v0, 2026-05-06.

This document is the repo-level policy boundary for `ExternalActionProposal`.
It translates `risk_class`, `action_policy`, destination, action type, HITL,
preview and retry requirements into what the AIOS runtime may prepare or
execute.

## Baseline Rules

- Every external action starts as `ExternalActionProposal`.
- External execution is allowed only when `approvalStatus=approved`.
- External execution is allowed only after an adapter preview/dry-run recorded
  after approval.
- GitHub and Slack write adapters must pass Retry Safety review before execute:
  payload hash, destination ref and idempotency key must match approval and
  preview snapshots.
- GET/read operations may retry automatically. POST/write operations must not
  retry automatically.
- Manual retry of a failed write requires a fresh human rationale.
- `completed` and `already_completed` proposals never execute again.
- `blocked`, `cancelled` and rejected proposals require a new proposal.
- Idempotency marker reuse must be recorded as duplicate prevention, not as a
  new write.
- For private internal GitHub repositories on an explicit allowlist, non-
  destructive Class B routing or feedback metadata may be prepared for future
  executors when approval, preview, HITL rationale, retry safety, idempotency
  and audit trail are all enforced. This does not apply to customer/external
  repos.
- Audit trail must include actor, rationale, request snapshot, response
  summary, idempotency key, external id/url when available, and error summary on
  failure.

## Risk Class Policy

| risk_class | Meaning | Allowed action_policy | Execution posture |
| --- | --- | --- | --- |
| A | Internal action, draft, private note, or non-mutating preparation. | `observe_only`, `create_artifacts`, `create_work_items`, `request_human` for internal draft. | No external writeback. May create internal artifacts, work items, drafts or proposals. |
| B | Low-risk external response or allowlisted routing/feedback metadata that does not change access, deployment, release or public lifecycle. | `request_human`, then `writeback_allowed` only after explicit approval. | May execute only implemented allowlisted adapters after HITL, preview, idempotency and retry-safety gates. Current executors are comment/reply/label-add/private commit-status. Other internal GitHub metadata actions require their own executor before execution. |
| C | Destructive, state-changing, public, sensitive, access-changing or operationally irreversible action. | None in v0. | Blocked. Requires a future reinforced approval model and explicit implementation. |
| unknown | Unclassified action. | None. | Blocked until reclassified. |

## Destination And Action Matrix

| destination_type | action_type | risk_class | Current status | Notes |
| --- | --- | --- | --- | --- |
| `internal` | `draft` | A | Allowed as internal proposal/draft only. | No external adapter call. |
| `github` | `comment` / `github_comment` | B | Executable. | Issue/PR comments only; requires `GITHUB_TOKEN`/`GH_TOKEN`, approval, preview, idempotency marker and Retry Safety review. |
| `slack` | `thread_reply` / `slack_thread_reply` | B | Executable. | Existing thread replies only; requires `SLACK_BOT_TOKEN`, approval, preview, idempotency marker and Retry Safety review. |
| `github` | `label` / `github_label` | B only for allowlisted low-risk add; C otherwise | Executable for allowlisted add v0. | One existing repo label only; requires approval, preview, Retry Safety, allowlist and current-label read. Remove/set/create-label remain blocked. |
| `github` | `github_status` | B only for private internal allowlisted commit/SHA/context/state; C otherwise | Executable for allowlisted commit status v0. | Commit status only; requires approval, preview, Retry Safety, explicit SHA, repo-private verification, allowlist, idempotency and audit. v0 supports only `state=success` and context `aios/dogfood-status`. |
| `github` | `github_check` | B for private internal allowlisted repos; C otherwise | Preview-only proposal implemented; executor not implemented. | Check-run creation remains blocked until a separate executor and dogfood target are approved. |
| `github` | `github_issue_create` | B for allowlisted internal repos; C otherwise | Executable for allowlisted create v0. | New issue creation from a Company Brain WorkItem. Requires `AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST`, `GITHUB_TOKEN`/`GH_TOKEN`, HITL approval, preview-after-approval, Retry Safety, marker-based idempotency dedupe and audit. Completed execution links `externalUrl` back to the WorkItem. Closing, reopening, editing, assigning or merging existing issues remain out of scope. |
| `github` | `assign` / `unassign` | B for private internal allowlisted repos; C otherwise | No executor yet. | May become non-destructive routing metadata only for internal repos with explicit allowlist, approval, preview, idempotency and audit. Customer/external repos remain blocked. |
| `github` | `close` / `reopen` | C | Blocked. | Changes lifecycle state. |
| `github` | `merge` | C | Blocked. | Code integration action. |
| `github` | `deploy` | C | Blocked. | Production/runtime action. |
| `github` | `mark_notification_read` | B for Felhen-owned allowlisted inbox; C otherwise | No executor yet. | May be allowed only for the authenticated AIOS/Felhen-owned inbox with explicit allowlist, audit and idempotency. Customer/external inboxes remain blocked. |
| `slack` | top-level message | B or C depending channel | Blocked in v0. | Not a thread reply; must be separately designed. |
| `slack` | DM | C | Blocked. | Direct/private outreach. |
| `slack` | edit / delete | C | Blocked. | Mutates existing human-authored content. |
| `slack` | reaction | B or C depending context | Blocked in v0. | Can create social signal; needs separate policy. |
| `slack` | pin / unpin | C | Blocked. | Changes channel information architecture. |
| `slack` | invite / kick | C | Blocked. | Access-changing action. |
| `slack` | topic / rename | C | Blocked. | Public workspace/channel metadata mutation. |
| `unknown` | any | unknown | Blocked. | Must be classified before proposal creation. |

## Required Gates By Executable Adapter

GitHub issue/PR comment:

1. `destinationType=github`.
2. `actionType=comment` or `github_comment`.
3. `riskClass=B`.
4. `actionPolicy=writeback_allowed`.
5. `approvalStatus=approved` with actor and rationale.
6. `executionStatus=not_started`, `dry_run` or retryable `failed`.
7. `destinationRef` validates as issue/PR URL, `owner/repo#number` or
   compatible repo issue ref.
8. `payload.body` is non-empty.
9. `idempotencyKey` is present.
10. Preview exists after approval.
11. Retry Safety review returns `ready_to_execute`, or `retryable_failed` with
    `retryRationale`.
12. Existing marker is checked before POST; marker reuse completes without a
    duplicate comment.

Slack thread reply:

1. `destinationType=slack`.
2. `actionType=thread_reply` or `slack_thread_reply`.
3. `riskClass=B`.
4. `actionPolicy=writeback_allowed`.
5. `approvalStatus=approved` with actor and rationale.
6. `executionStatus=not_started`, `dry_run` or retryable `failed`.
7. `destinationRef` validates as thread permalink, `slack://channel/threadTs`,
   `channelId:threadTs` or `channelId/threadTs`.
8. Destination is not a DM.
9. `payload.body` is non-empty.
10. `idempotencyKey` is present.
11. Preview exists after approval.
12. Retry Safety review returns `ready_to_execute`, or `retryable_failed` with
    `retryRationale`.
13. Existing thread is read and marker is checked before POST; marker reuse
    completes without a duplicate reply.

GitHub label add:

1. `destinationType=github`.
2. `actionType=label` or `github_label`.
3. `riskClass=B`.
4. `actionPolicy=writeback_allowed`.
5. `approvalStatus=approved` with actor and rationale.
6. `executionStatus=not_started`, `dry_run` or retryable `failed`.
7. `destinationRef` validates as issue/PR URL, `owner/repo#number` or
   compatible repo issue ref.
8. `payload.labels` resolves to exactly one label.
9. `payload.mode=add`.
10. `idempotencyKey` is present.
11. Target and label are allowlisted by `AIOS_GITHUB_LABEL_WRITEBACK_ALLOWLIST`.
    The v0 default is the dogfood target
    `antonio-mello-ai/crewdock#3=enhancement`.
12. Preview exists after approval.
13. Retry Safety review returns `ready_to_execute`, or `retryable_failed` with
    `retryRationale`.
14. Before any write, current issue/PR labels are read.
15. If the approved label is already present, execution completes as
    `completed_noop` without calling the GitHub label write API.
16. If the label is missing, the adapter verifies the repo label already exists
    before adding it. It must not create new labels.
17. Completed proposals return `already_completed` on replay and never write
    again.

GitHub commit status:

1. `destinationType=github`.
2. `actionType=github_status`.
3. `riskClass=B`.
4. `actionPolicy=writeback_allowed`.
5. `approvalStatus=approved` with actor and rationale.
6. `executionStatus=not_started`, `dry_run` or retryable `failed`.
7. `payload.repo` is `owner/repo`.
8. `payload.sha` is a full 40-character commit SHA.
9. `payload.context` is the approved context. v0 supports only
   `aios/dogfood-status`.
10. `payload.state` is the approved state. v0 supports only `success`.
11. `idempotencyKey` is present.
12. Target repo, SHA, context and state are allowlisted by
    `AIOS_GITHUB_STATUS_WRITEBACK_ALLOWLIST`. The v0 default is the dogfood
    target
    `antonio-mello-ai/felhen@b9e1057f44988555227ae8031cd48325fb6efc71=aios/dogfood-status:success`.
13. Preview exists after approval.
14. Retry Safety review returns `ready_to_execute`, or `retryable_failed` with
    `retryRationale`.
15. Before any write, the adapter verifies the repository is private and reads
    existing commit statuses.
16. If a compatible status already exists, execution completes as
    `completed_noop` without calling the GitHub status write API.
17. Completed proposals return `already_completed` on replay and never write
    again.

Future allowlisted GitHub metadata executors:

1. Applies only to private internal GitHub repositories or Felhen-owned
   notification inboxes on an explicit allowlist.
2. Applies only to non-destructive Class B actions not already implemented:
   check feedback, assign/unassign routing, or mark-notification-read for the
   owned inbox.
3. Requires the same HITL, preview-after-approval, payload/destination/
   idempotency review, stale-review blocking, manual retry rationale and audit
   trail used by existing executors.
4. Must start with preview-only support and dogfood in a controlled target
   before any real executor is added.
5. Must not close/reopen, merge, deploy, delete, change permissions, change
   branch protection, mutate secrets or touch customer/external repos.

## Preview-Only Candidates

Preview-only candidates may create and review `ExternalActionProposal` records,
but must not call write APIs:

- GitHub check-run proposal until its internal allowlisted executor exists.
- GitHub status proposals outside the private repo/SHA/context/state allowlist
  or outside the implemented `success` commit-status path.
- GitHub assignee proposal until its internal allowlisted executor exists.
- GitHub mark-notification-read proposal until its owned-inbox executor exists.
- GitHub label proposals outside the v0 allowlist, with `mode=remove/set`, or
  with more than one label.
- Slack top-level announcement draft.

Each preview-only candidate must include:

- target object and normalized destination ref;
- payload diff;
- risk class rationale;
- blocked/executable status;
- required approvals for any future executor;
- idempotency key;
- rollback or no-rollback explanation;
- audit event proving no external mutation occurred.

## Explicitly Out Of Scope Until A Future Policy Version

- GitHub close/reopen, merge, deploy, branch protection, release, environment
  mutations, and notification-read outside the owned allowlist.
- Slack DM, edit, delete, reaction, pin, invite, kick, topic, rename, channel
  creation or workspace admin actions.
- Automatic execution from `GuidanceItem`, `Signal`, `AlignmentFinding`,
  `Decision` or `ImprovementProposal` without an approved
  `ExternalActionProposal`.
- Any writeback to ERP, customer systems, billing, production infra, email or
  ads platforms.
