# AIOS Writeback HITL Runbook

Status: v0, 2026-05-06.

Use this checklist before proposing or implementing any new external writeback
executor. It is intentionally stricter than the current implementation surface.

## Current Executable Surface

- GitHub issue/PR comment: executable after approval, preview, idempotency and
  Retry Safety.
- Slack existing thread reply: executable after approval, preview, idempotency
  and Retry Safety.
- GitHub label add: executable only for allowlisted Risk B targets and labels,
  one existing repo label, `mode=add`, current-label read before write.

Everything else stays blocked or preview-only unless this runbook, the policy
matrix and code are explicitly updated in the same slice.

## Preflight Checklist

Before code changes:

1. Name the exact destination, action type, target object and allowed payload.
2. Classify `riskClass` as A, B, C or unknown.
3. Confirm `actionPolicy` required for execution.
4. Confirm whether the target is internal, private, customer-visible or public.
5. Confirm whether the action changes lifecycle, ownership, access, delivery,
   deployment, billing, inbox state or public state.
6. Confirm required credential scopes and whether new scopes are needed.
7. Define idempotency strategy before write code exists.
8. Define dry-run/preview response before write code exists.
9. Define audit events for preview, success, noop, duplicate avoided, blocked,
   retry required and failure.
10. Define rollback/no-rollback posture.

Stop if the action is destructive, status-changing, access-changing,
public/customer-facing, requires new credentials/scopes, or is Risk C/unknown.

## Required Implementation Gates

Any new executor must require:

1. `ExternalActionProposal` only.
2. `approvalStatus=approved`.
3. HITL actor and rationale in the approval audit snapshot.
4. `riskClass=B`.
5. `actionPolicy=writeback_allowed`.
6. Fresh preview after approval.
7. Payload hash, destination ref and idempotency key matching approval and
   preview snapshots.
8. Retry Safety `ready_to_execute`, or `retryable_failed` with fresh human retry
   rationale.
9. No automatic retry for POST/write calls.
10. Terminal `completed`/`executed` proposals returning `already_completed`
    without writing again.
11. Existing-state read before write when the platform supports it.
12. Noop path when desired state already exists.
13. Full audit trail with actor, request, summarized response, external id/url,
    idempotency key and error summary.

## Dogfood Checklist

Dogfood must happen in a temporary DB first:

1. Create or reuse accepted `GuidanceItem`.
2. Create `ExternalActionProposal` with explicit idempotency key.
3. Approve with human actor and rationale.
4. Run preview after approval.
5. Confirm Safety Dashboard status before execute.
6. Validate at least one blocked negative path.
7. Prefer noop/idempotency path before any real mutation.
8. If a real mutation is required, use one approved controlled target only.
9. Re-run execute and verify `already_completed` or duplicate prevention.
10. Verify `audit-trail` export and adapter summary.
11. Run `git diff --check`.
12. Run `npx turbo build`.
13. Update `docs/backlog.md` and the session handoff before commit.

## Approval Template

Use this shape for HITL approval notes:

```text
Approved for <adapter/action> dogfood on <target> only.
RiskClass=B, actionPolicy=writeback_allowed.
Preview is required after this approval.
Expected outcome: <noop/write/blocked negative path>.
Explicitly not approved: close/reopen, assign, merge, deploy, notification-read,
DM, Slack top-level message, edit/delete, permissions or billing changes.
```

## Blocked Until Separate Policy

- GitHub close/reopen, assign, unassign, merge, deploy, release, branch
  protection or notification-read.
- GitHub check-run real writeback and GitHub status writeback outside the
  explicit private repo/SHA/context/state allowlist.
- Slack top-level message, DM, edit, delete, reaction, pin, invite, kick, topic,
  rename or channel creation.
- Email, billing, permissions, customer systems, production infra or ads
  writeback.
