# AIOS-RUN-35 GitHub PR Proposal Governance UI

Date: 2026-05-08
Issue: `#116 AIOS-RUN-35: GitHub PR proposal governance UI v7`
Branch: `aios-run-35-pr-proposal-governance`

## Scope

Make `github_pr_create` ExternalActionProposal records reviewable by a human
operator without direct DB writes. The UI must expose the PR payload, patch
packet context, WorkItem/AgentRun refs, validation summary, policy status and
gated preflight/execute controls.

## Delivered

- Web hooks:
  - `usePreflightCompanyBrainGitHubPrWriteback`;
  - `useExecuteCompanyBrainGitHubPrWriteback`.
- Preflight hook preserves 400 responses that include structured `data`, so
  blocked preflight gates remain visible to the UI.
- Company Brain Safety Dashboard proposal list now renders first-class
  `github_pr_create` details:
  - repo, source branch and base branch;
  - WorkItem and AgentRun ids;
  - patch packet artifact and signature;
  - title and PR body preview;
  - diff stat, commit count and validation summary;
  - approval/execution/policy/preflight status badges;
  - latest preflight gates when available.
- PR proposal review controls now require actor + rationale for
  `github_pr_create` approval/rejection/preflight/execute.
- `Preflight PR` and `Open PR` controls are visible for PR proposals. Execution
  remains gated by approval plus the existing backend policy/preflight gates.
- Existing proposal types keep their prior controls and behavior.

## Local Dogfood

Daemon:

```bash
AIOS_DB_PATH=/tmp/aios-run35-smoke.sqlite \
AIOS_PORT=43192 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
AIOS_CORS_ORIGINS=http://localhost:3100 \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED=false \
AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=true \
AIOS_AGENT_GITHUB_PR_WRITEBACK_REPO_ALLOWLIST=antonio-mello-ai/crewdock \
GITHUB_TOKEN="$(gh auth token)" \
npm --workspace @aios/daemon start
```

API governance path, no SQLite:

- Approved proposal:
  - WorkItem `FZ61LXKmy4BA`
  - AgentRun `LQNejrEenoFm`
  - Proposal `FVu4gopIQZVf`
  - `PUT /external-action-proposals/:id` with actor/rationale returned
    `approvalStatus=approved`, `approvedBy=codex:run35-smoke`,
    `executionStatus=not_started`, audit last event `approved`.
  - Preflight returned `status=ready`, artifact `fkFsMuTGCYSO`,
    `pushProbe=passed`.
- Rejected proposal:
  - WorkItem `Qb_h9I83CObT`
  - AgentRun `NhDB2sZ-UdQX`
  - Proposal `Jogid6M8WCyt`
  - `PUT /external-action-proposals/:id` with actor/rationale returned
    `approvalStatus=rejected`, `executionStatus=cancelled`, audit last event
    `rejected`.

Playwright UI smoke:

- `NEXT_PUBLIC_DAEMON_URL=http://127.0.0.1:43192 npm --workspace @aios/web run dev`
- Opened `http://localhost:3100/company-brain`.
- Verified page text contains `github_pr_create`, `Preflight PR`, `Open PR` and
  `patch packet`.
- Clean browser session after CORS correction reported 0 console errors.

## Validation

- `git diff --check` passed.
- `npx turbo build --filter=@aios/web --filter=@aios/shared` passed.
- `npx turbo build` passed.

## Constraints

- No auto-merge.
- No deploy from the executor.
- No customer repo.
- No new secret or paid service.
- No PR was opened by this issue dogfood.
