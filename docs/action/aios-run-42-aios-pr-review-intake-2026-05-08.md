# AIOS-RUN-42 AIOS-authored PR review intake v8

Date: 2026-05-08
Issue: https://github.com/antonio-mello-ai/crewdock/issues/130
Branch: `aios-run-42-aios-pr-review-intake`

## Goal

Close the review loop for AIOS-authored pull requests without adding any GitHub
mutation. The intake reads PR review state and comments, normalizes them into
Company Brain evidence, and shows pending human review directly on the Operating
surface.

## Implementation

- Added shared types for `AiosAuthoredPrReviewItem`,
  `SyncAiosPrReviewsRequest`, `SyncAiosPrReviewsResponse` and
  `ListAiosPrReviewIntakeResponse`.
- Added read-only GitHub adapter:
  `POST /api/company-brain/adapters/github/aios-pr-reviews/sync`.
- Added read-only intake endpoint:
  `GET /api/company-brain/aios-pr-review-intake`.
- Added MCP tools:
  `sync_company_brain_aios_pr_reviews` and
  `get_company_brain_aios_pr_review_intake`.
- Added Operating Surface block `AIOS-authored PR review`, including pending
  PRs, review state, approval/change/comment counts and a manual read-only sync
  button.

## Policy boundary

This cut does not add merge, close, deploy, label, assignment, notification-read
or any other GitHub writeback executor. It only reads GitHub PR/review/comment
state and creates internal Company Brain artifacts/signals/links.

## Local dogfood

Temporary DB: `/tmp/aios-run42-smoke.sqlite`

Command shape:

```sh
AIOS_AUTH_DISABLED=true \
AIOS_DB_PATH=/tmp/aios-run42-smoke.sqlite \
AIOS_PORT=43212 \
AIOS_HOST=127.0.0.1 \
GITHUB_TOKEN=$GITHUB_TOKEN \
node packages/daemon/dist/index.js
```

Sync result:

```json
{
  "pullRequestsSeen": 3,
  "aiosPullRequestsSeen": 3,
  "pendingHumanReviewCount": 3,
  "artifactsCreated": 3,
  "signalsCreated": 3,
  "pr125": {
    "number": 125,
    "reviewStatus": "awaiting_human_review",
    "workItemId": "bqA5AghugOJn",
    "patchPacketArtifactId": "kn6hZSKvfl0C",
    "artifactId": "Jz1HRi9Pkvyb",
    "signalId": "5PB6FpRyqdIn",
    "proposalId": "1VrS7duqMhpF",
    "agentRunId": "fJAlfYi8SmPi"
  }
}
```

Intake result:

```json
{
  "total": 3,
  "awaiting": 3,
  "changes": 0,
  "pr125": {
    "number": 125,
    "reviewStatus": "awaiting_human_review",
    "workItemId": "bqA5AghugOJn",
    "artifactId": "Jz1HRi9Pkvyb",
    "signalId": "5PB6FpRyqdIn",
    "proposalId": "1VrS7duqMhpF",
    "agentRunId": "fJAlfYi8SmPi"
  }
}
```

## Validation

- `git diff --check` passed.
- `npx turbo build --filter=@aios/shared --filter=@aios/daemon --filter=@aios/mcp-server --filter=@aios/web` passed.
- `npx turbo build --filter=@aios/daemon` passed after marker selection fix.

## Next

- Open PR with `Closes #130`.
- After merge/deploy, run production sync against `antonio-mello-ai/crewdock`
  and confirm PR `#125` appears in `/company-brain/operating`.
