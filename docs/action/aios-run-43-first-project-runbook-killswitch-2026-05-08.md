# AIOS-RUN-43 First-Project Operating Runbook and Kill-Switch Pack

Date: 2026-05-08
Issue: `#131`
Branch: `aios-run-43-first-project-runbook-killswitch`

## Goal

Close the last AIOS Agent Execution v8 gap before using AIOS on a real
internal project: make the first-project operating contract discoverable from
repo docs, API, MCP and UI without relying on chat history.

## Scope

- Add canonical runbook `docs/aios-first-project-operating-runbook.md`.
- Expose a compact read-only first-project readiness checklist.
- Link runner readiness, pilot target registry, AIOS-authored PR review intake,
  operating snapshot and production default-off evidence.
- Add the checklist to `/company-brain/agent-runs`.
- Keep this cut read-only: no new executor, no new external mutation, no new
  secret, no auto-dispatch change.

## Acceptance Mapping

- Exact safe startup, env gates, kill switches, allowed repos/actions and stop
  conditions: covered by the runbook.
- UI/API compact checklist: `GET /api/company-brain/first-project-readiness`
  and `/company-brain/agent-runs`.
- Checklist links to runner readiness, pilot target registry, pending AIOS PRs
  and operating snapshot: covered by API payload and UI cards.
- Production default-off evidence remains visible: checklist includes runner,
  workspace, auto-dispatch and PR writeback gates.
- No new executor or external mutation: only read-only aggregation and docs.

## Validation Plan

- `git diff --check`
- `npx turbo build`
- Local daemon smoke for:
  - `/api/company-brain/first-project-readiness?repo=antonio-mello-ai/crewdock&area=development&riskClass=B`
  - `/company-brain/agent-runs`
- Production smoke after merge/deploy.

## Production Evidence

Pending.

## Local Evidence

Validation passed:

- `git diff --check`
- `npx turbo build --filter=@aios/shared --filter=@aios/daemon --filter=@aios/mcp-server --filter=@aios/web`

Local daemon smoke:

- DB: `/tmp/aios-run43-smoke.sqlite`
- Port: `43213`
- Endpoint:
  `/api/company-brain/first-project-readiness?repo=antonio-mello-ai/crewdock&area=development&riskClass=B`
- Result:
  - `overallStatus=warn`
  - `summary="First-project readiness is warn: 6/9 ready, 3 warn, 0 blocked. Production default-off preserved."`
  - `pendingAiosPrReviews=0`
  - `pilotTargets=1`
  - `launchReadyPilotTargets=0`
  - `realAgentReadyProfiles=0`
  - `runnerEnabled=false`
  - `workspaceWritesEnabled=false`
  - `autoDispatchEnabled=false`
  - `prWritebackEnabled=false`

The warn state is expected in a temp DB/default-off environment: no real-agent
profile is enabled and manual launch remains blocked until explicit env opt-in.
