# AIOS-ERP-HARD-01 PR evidence packet audit mapping

Date: 2026-05-08

## Issue

- GitHub issue: `#165`
- PR: `#170`
- Commit: `919bb32`
- WorkItem: `-V-wwngBMVSF`

## Problem

The evidence packet for ERP PR proposal `rBGhT13JpqFZ` incorrectly reported
critical gaps:

- `missing_preview_event`
- `missing_execution_event`

The proposal had a ready PR preflight and a successful PR execute, but the
generic writeback audit review did not map `github_pr_create` events into the
same preview/execution model used by comments, labels, statuses, issues and
Slack replies.

## Fix

- `github_pr_create` now maps preview to
  `github_pr_writeback_preflight_checked`.
- PR execute events are recognized as writeback execution audit events:
  - `external_action_proposal_executed`
  - `external_action_proposal_executed_idempotent`
  - `external_action_proposal_executed_pr_iteration`
- Future PR preflight audit events persist a request snapshot with:
  - `payloadHash`
  - `destinationRef`
  - `idempotencyKey`
- Existing PR preflight events without the new snapshot can still be reviewed:
  for `github_pr_create`, the evidence packet derives the preflight snapshot
  from the current approved payload when a valid preflight event exists after
  approval.

## Validation

Local validation:

- `git diff --check` passed.
- `npx turbo build --filter=@aios/daemon --force` passed.

Production deploy:

- CT165 deployed at `919bb32`.
- `aios-daemon` active.
- `GET https://api.felhen.ai/api/health` returned `200`.

Production smoke against proposal `rBGhT13JpqFZ`:

- `previewEvent`: `github_pr_writeback_preflight_checked`
- `previewAt`: `1778298198367`
- `executionEvent`: `external_action_proposal_executed`
- `executionEventAt`: `1778298200966`
- `payloadHashApproved`, `payloadHashPreview` and `payloadHashCurrent` match.
- `destinationRefApproved`, `destinationRefPreview` and
  `destinationRefCurrent` match.
- `idempotencyKeyApproved`, `idempotencyKeyPreview` and
  `idempotencyKeyCurrent` match.
- critical gaps: `[]`
- remaining non-critical gaps:
  - `missing_guidance_link`
  - `missing_signal_or_finding_link`

## Residual

The evidence packet still reports `status=blocked` because proposal
`rBGhT13JpqFZ` has `riskClass=unknown`. That is not the false preview/execution
gap fixed by this issue. Risk classification policy can be revisited in a
separate hardening issue if needed.
