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
- Audit trail must include actor, rationale, request snapshot, response
  summary, idempotency key, external id/url when available, and error summary on
  failure.

## Risk Class Policy

| risk_class | Meaning | Allowed action_policy | Execution posture |
| --- | --- | --- | --- |
| A | Internal action, draft, private note, or non-mutating preparation. | `observe_only`, `create_artifacts`, `create_work_items`, `request_human` for internal draft. | No external writeback. May create internal artifacts, work items, drafts or proposals. |
| B | Low-risk external response that does not change state, access, ownership, deployment or public lifecycle. | `request_human`, then `writeback_allowed` only after explicit approval. | May execute only allowlisted comment/reply adapters after HITL, preview, idempotency and retry-safety gates. |
| C | Destructive, state-changing, public, sensitive, access-changing or operationally irreversible action. | None in v0. | Blocked. Requires a future reinforced approval model and explicit implementation. |
| unknown | Unclassified action. | None. | Blocked until reclassified. |

## Destination And Action Matrix

| destination_type | action_type | risk_class | Current status | Notes |
| --- | --- | --- | --- | --- |
| `internal` | `draft` | A | Allowed as internal proposal/draft only. | No external adapter call. |
| `github` | `comment` / `github_comment` | B | Executable. | Issue/PR comments only; requires `GITHUB_TOKEN`/`GH_TOKEN`, approval, preview, idempotency marker and Retry Safety review. |
| `slack` | `thread_reply` / `slack_thread_reply` | B | Executable. | Existing thread replies only; requires `SLACK_BOT_TOKEN`, approval, preview, idempotency marker and Retry Safety review. |
| `github` | `label` / `github_label` | B or C depending label semantics | Preview-only proposal implemented. | No execution in v0. Shows target labels and risk classification before any future write. |
| `github` | `github_status` / `github_check` | B | Preview-only proposal implemented. | No execution in v0. Shows repo, PR/SHA, context/name, proposed state/conclusion and risk rationale before any future write. |
| `github` | `assign` / `unassign` | C | Blocked. | Changes ownership and routing. |
| `github` | `close` / `reopen` | C | Blocked. | Changes lifecycle state. |
| `github` | `merge` | C | Blocked. | Code integration action. |
| `github` | `deploy` | C | Blocked. | Production/runtime action. |
| `github` | `mark_notification_read` | C | Blocked. | Mutates human inbox state. |
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

## Preview-Only Candidates

Preview-only candidates may create and review `ExternalActionProposal` records,
but must not call write APIs:

- GitHub label proposal v0. Implemented as preview-only.
- GitHub status/check conclusion proposal. Implemented as preview-only.
- GitHub assignee proposal.
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

- GitHub close/reopen, merge, deploy, branch protection, release, environment or
  notification-read mutations.
- Slack DM, edit, delete, reaction, pin, invite, kick, topic, rename, channel
  creation or workspace admin actions.
- Automatic execution from `GuidanceItem`, `Signal`, `AlignmentFinding`,
  `Decision` or `ImprovementProposal` without an approved
  `ExternalActionProposal`.
- Any writeback to ERP, customer systems, billing, production infra, email or
  ads platforms.
