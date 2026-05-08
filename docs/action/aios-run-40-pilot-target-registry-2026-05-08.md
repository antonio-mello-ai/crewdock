# AIOS-RUN-40 Pilot Target Registry

Date: 2026-05-08
Issue: `#128 AIOS-RUN-40: Internal project pilot target registry v8`
Milestone: `AIOS Agent Execution v8`

## Goal

Move the first real-agent pilot from ad hoc env/chat context into a governed
Company Brain registry. This lets future launcher and auto-dispatch gates ask
"which project target is approved?" before deciding whether a real agent can
run.

## Delivered

- New `cb_pilot_targets` table and shared `PilotTarget` types.
- Seeded target `pilot-target-aios-crewdock`:
  - project: `AIOS / CrewDock`;
  - repo: `antonio-mello-ai/crewdock`;
  - area: `development`;
  - default blueprint: `development-blueprint-v0`;
  - allowed profiles:
    `dogfood-semantic-doc-change`, `claude-code-real`, `codex-cli-real`;
  - risk ceiling: `B`;
  - owner: `Antonio`;
  - status: `active`;
  - metadata marks `customerRepo=false` and `autoDispatchDefaultOff=true`.
- API endpoint: `GET /api/company-brain/pilot-targets`.
- MCP tool: `list_company_brain_pilot_targets`.
- UI section in `/company-brain/agent-runs`: `Pilot targets`.

## Readiness Contract

Each target embeds a filtered runner readiness matrix using only its allowed
profiles. A target is `readyForManualLaunch=true` only when:

- target status is `active`;
- at least one allowed `real_agent` profile is ready;
- the inherited runner readiness gates pass for the repo/area/risk ceiling.

Auto-dispatch remains default-off and is not enabled by this registry.

## Local Dogfood

Default-off local daemon:

- DB: `/tmp/aios-run40-smoke.sqlite`;
- port: `43199`;
- result:
  - `total=1`;
  - `active=1`;
  - `readyForManualLaunch=0`;
  - `blocked=1`;
  - blocked real profiles: `claude-code-real`, `codex-cli-real`;
  - blockers include runner/workspace/profile/repo gates.

Controlled opt-in local daemon:

- DB: `/tmp/aios-run40-ready-smoke.sqlite`;
- port: `43200`;
- env:
  - `AIOS_AGENT_RUNNER_ENABLED=true`;
  - `AIOS_AGENT_WORKSPACE_ENABLED=true`;
  - `AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock`;
  - `AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock`;
  - `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST="echo true git bash claude codex"`;
  - `AIOS_AGENT_RUNNER_PROFILE_CLAUDE_CODE_ENABLED=true`;
  - `AIOS_AGENT_RUNNER_PROFILE_CODEX_CLI_ENABLED=true`;
- result:
  - `readyForManualLaunch=1`;
  - readiness `status=ready`;
  - ready profiles: `claude-code-real`, `codex-cli-real`;
  - `blockedProfileIds=[]`;
  - recommended next action keeps auto-dispatch default-off.

Both daemons were stopped after smoke; ports `43199` and `43200` had no
remaining listeners.

## Validation

- `git diff --check` passed.
- `npx turbo build --filter=@aios/shared --filter=@aios/daemon --filter=@aios/mcp-server --filter=@aios/web`
  passed.
- `npx turbo build` passed.

## Production Deployment

- PR: `#133`.
- Merge commit: `5efe8a0 feat: add pilot target registry (#133)`.
- CT165 daemon/MCP deployed at `5efe8a0`; `aios-daemon` active.
- Cloudflare Pages deploy:
  `https://3a699129.crewdock.pages.dev`.
- Production smoke:
  - `GET https://api.felhen.ai/api/health` -> `200`;
  - `GET /api/company-brain/pilot-targets?repo=antonio-mello-ai/crewdock`
    returned `total=1`, `active=1`, `readyForManualLaunch=0`, `blocked=1`;
  - canonical UI `https://ai.felhen.ai/company-brain/agent-runs` -> `200`;
  - deployed preview `https://3a699129.crewdock.pages.dev/company-brain/agent-runs`
    -> `200`.
- Production Company Brain reconciliation:
  - session result artifact `fzEHlY3Cnm1H`;
  - WorkItem `M7fupGPuVrxN` marked `done`;
  - internal status artifact `CWi3XLPVFgiH`;
  - GitHub Issues sync `state=open` returned `issuesSeen=3`;
  - Next Work now recommends `#129 AIOS-RUN-41` with WorkItem
    `v5QSUqfLBFp_`.

## Constraints

- No customer repo added.
- No subprocess launch.
- No new secret.
- No paid service.
- No external writeback.
- No auto-merge or deploy performed by the feature itself.
