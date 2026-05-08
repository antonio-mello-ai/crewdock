# AIOS-RUN-34 GitHub PR Writeback Preflight

Date: 2026-05-08
Issue: `#115 AIOS-RUN-34: GitHub PR writeback preflight and auth smoke v7`
Branch: `aios-run-34-pr-writeback-preflight`

## Scope

Add a safe preflight before GitHub PR writeback claims readiness. The preflight
does not create a branch, PR, merge, deploy, or touch customer repos.

## Delivered

- API endpoint:
  `POST /api/company-brain/external-action-proposals/:id/github-pr/preflight`.
- MCP tool: `preflight_company_brain_github_pr_writeback`.
- Internal helper reused by `POST /external-action-proposals/:id/execute-pr`.
- Preflight gates:
  - proposal action type;
  - PR payload shape;
  - master switch `AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED`;
  - repo allowlist `AIOS_AGENT_GITHUB_PR_WRITEBACK_REPO_ALLOWLIST`;
  - existing token source (`GITHUB_TOKEN` or `GH_TOKEN`);
  - git push auth scheme (`x-access-token` URL form);
  - base branch visibility through GitHub API;
  - AgentRun workspace readiness;
  - optional safe push probe.
- Response explains token source, auth scheme, redacted remote URL pattern,
  repo allowlist, workspace readiness, base branch visibility, dry-run
  limitations, and whether a safe push probe is possible.
- Evidence is persisted as an internal `Artifact` and audit event
  `github_pr_writeback_preflight_checked`.
- Executor now runs preflight first and returns `preflight_blocked` when any
  required gate fails.

## Local Dogfood

Daemon:

```bash
AIOS_DB_PATH=/tmp/aios-run34-smoke.sqlite \
AIOS_PORT=43191 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED=false \
AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=true \
AIOS_AGENT_GITHUB_PR_WRITEBACK_REPO_ALLOWLIST=antonio-mello-ai/crewdock \
GITHUB_TOKEN="$(gh auth token)" \
npm --workspace @aios/daemon start
```

The local `better-sqlite3` native module initially had a Node ABI mismatch.
`npm rebuild better-sqlite3` fixed the local dependency build before the smoke.

Valid path:

- WorkItem: `lrGlaUZh_ivY`
- AgentRun: `Ka_Ucyfy3l9_`
- Proposal: `gEh-8kFUWGhh`
- Preflight artifact: `x_VjY1Om_PtD`
- repo: `antonio-mello-ai/crewdock`
- status: `ready`
- tokenSource: `GITHUB_TOKEN`
- authScheme: `api=bearer`, `gitPush=x-access-token-url`
- remoteUrlPattern:
  `https://x-access-token:[REDACTED]@github.com/antonio-mello-ai/crewdock.git`
- workspaceReady: `true`
- baseBranchVisible: `true`
- safePushProbePossible: `true`
- pushProbe: `attempted=true`, `status=passed`
- commandSummary:
  `git push --dry-run https://x-access-token:[REDACTED]@github.com/antonio-mello-ai/crewdock.git HEAD:refs/heads/aios-preflight/gEh-8kFUWGhh-1778266062761`
- failedGates: `[]`

Blocked config path:

- WorkItem: `av8vqHcN1O69`
- AgentRun: `8l32YnwQGIR9`
- Proposal: `9qjBaZqGE54f`
- Preflight artifact: `ph-Rjv3Mmwl9`
- repo: `openai/symphony`
- status: `blocked`
- HTTP status: `400`
- failedGates: `repo_allowlist`
- pushProbe: `attempted=false`, `status=skipped`
- executor after internal approval: HTTP `400`, error `preflight_blocked`

## Validation

- `npx turbo build --filter=@aios/shared --filter=@aios/daemon --filter=@aios/mcp-server`
  passed.
- `git diff --check` passed.
- `npx turbo build` passed.

## Merge And Deploy

- PR: `#120` (`https://github.com/antonio-mello-ai/crewdock/pull/120`)
- Merge commit: `3cbf02d`
- Issue `#115` closed by the merge.
- CT165 fast-forwarded to `3cbf02d`.
- CT165 build passed:
  `npx turbo build --filter=@aios/daemon --filter=@aios/mcp-server --force`.
- `aios-daemon` restarted and returned `active`.
- Public health: `GET https://api.felhen.ai/api/health` -> HTTP 200.
- Public operating snapshot with CF Access service token -> HTTP 200,
  `overallStatus=healthy`, 5 cards.
- CT165 loopback route smoke for the new preflight endpoint returned expected
  route-level response:
  `POST /api/company-brain/external-action-proposals/not-found/github-pr/preflight`
  -> HTTP 404 with `proposal not-found not found`.

## Constraints

- No PR creation.
- No merge.
- No deploy.
- No customer repo.
- No new secret or paid service.
- Push probe uses `git push --dry-run` to a temporary `aios-preflight` ref and
  does not create the ref.
