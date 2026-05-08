# AIOS-RUN-39 Runner Readiness Matrix

Date: 2026-05-08
Issue: `#127 AIOS-RUN-39: Real agent profile readiness matrix v8`
Milestone: `AIOS Agent Execution v8`

## Goal

Make real-agent launch readiness visible before enabling Claude/Codex profiles
on an internal project. The cut is read-only: it inspects environment and policy
state but never launches a subprocess.

## Delivered

- Shared types for `RunnerProfileReadinessMatrix`,
  `RunnerProfileReadinessItem`, command presence, auth readiness and readiness
  gates.
- Daemon endpoint:
  `GET /api/company-brain/runner-profile-readiness?repo=...&area=...&riskClass=...`.
- MCP tool: `get_company_brain_runner_profile_readiness`.
- Agent Runs UI section: `Runner profile readiness`, grouped by `noop`,
  `dogfood` and `real_agent`.
- `WORKFLOW.md` active milestone updated to `AIOS Agent Execution v8`.
- `docs/aios-issues-runbook.md` active milestone updated to v8.

## Readiness Contract

The matrix evaluates:

- command presence via PATH lookup only;
- command allowlist;
- runner repo allowlist;
- workspace allowlist;
- profile repo/area/risk gates;
- auth mode and required env refs;
- profile defaultEnabled / enabled env var;
- runner and workspace master switches;
- auto-dispatch default-off posture;
- recommended next action per profile.

No command is executed while building the matrix.

## Local Dogfood

Default-off local daemon:

- DB: `/tmp/aios-run39-smoke.sqlite`;
- port: `43197`;
- query:
  `/api/company-brain/runner-profile-readiness?repo=antonio-mello-ai/crewdock&area=development&riskClass=B`;
- result:
  - `total=6`;
  - `blocked=6`;
  - `realAgentReady=0`;
  - `realAgentBlocked=2`;
  - primary blockers: `runner_enabled`, `workspace_writes_enabled`,
    `runner_repo_allowlisted`, profile env gates for real agents.

Controlled opt-in local daemon:

- DB: `/tmp/aios-run39-ready-smoke.sqlite`;
- port: `43198`;
- env:
  - `AIOS_AGENT_RUNNER_ENABLED=true`;
  - `AIOS_AGENT_WORKSPACE_ENABLED=true`;
  - `AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock`;
  - `AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock`;
  - `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST="echo true git bash claude codex"`;
  - `AIOS_AGENT_RUNNER_PROFILE_CLAUDE_CODE_ENABLED=true`;
  - `AIOS_AGENT_RUNNER_PROFILE_CODEX_CLI_ENABLED=true`;
- query with `riskClass=A`;
- result:
  - `total=6`;
  - `ready=6`;
  - `blocked=0`;
  - `realAgentReady=2`;
  - `realAgentBlocked=0`.

Both daemons were stopped after smoke; ports `43197` and `43198` had no
remaining listeners.

## Validation

- `npx turbo build --filter=@aios/shared --filter=@aios/daemon --filter=@aios/mcp-server --filter=@aios/web`
  passed.

Full validation before merge should still run:

- `git diff --check`;
- `npx turbo build`.

## Constraints

- No subprocess launch.
- No new secret.
- No paid service.
- No external writeback.
- No auto-merge.
- No deploy performed by this feature.
