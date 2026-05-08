# AIOS-RUN-41 Human-approved AgentRun Launcher

Date: 2026-05-08
Issue: `#129 AIOS-RUN-41: Human-approved real AgentRun launcher v8`
Milestone: `AIOS Agent Execution v8`

## Goal

Create the governed bridge from a Company Brain `WorkItem` to a real-agent
`AgentRun`, without broad auto-dispatch. The operator must preview the target,
profile, command, workspace path, policy gates and write boundaries before an
AgentRun can be created.

## Delivered

- API preview endpoint:
  `POST /api/company-brain/agent-runs/launcher/preview`.
- API launch endpoint:
  `POST /api/company-brain/agent-runs/launcher/launch`.
- Shared response/request types:
  `PreviewAgentRunLaunchRequest`, `AgentRunLaunchPreview`,
  `LaunchAgentRunRequest`, `LaunchAgentRunResponse`.
- MCP tools:
  `preview_company_brain_agent_run_launcher` and
  `launch_company_brain_agent_run_from_work_item`.
- UI section in `/company-brain/agent-runs`: `Human-approved launcher`.
- Launcher checks:
  - WorkItem exists;
  - repo is covered by an active `PilotTarget`;
  - selected profile is allowed by the target;
  - selected `riskClass` is within target risk ceiling;
  - selected profile readiness is ready for the selected risk;
  - existing runner policy returns `allowed_real_execution`;
  - actor and rationale are present for launch.
- Launch creates a queued `AgentRun` with launcher metadata and audit trail.
  It does not execute the subprocess; execution remains handled by the existing
  supervised execute controls.

## Write Boundaries

The preview returns explicit expected boundaries:

- repo;
- workspace path;
- branch name;
- command and args;
- profile capabilities;
- allowed and redacted env keys;
- allowed filesystem root;
- external writeback is `false`;
- blocked external actions include auto-merge, auto-deploy, direct GitHub
  writeback, customer repos, billing and permissions.

## Dogfood

Default-off local daemon:

- DB: `/tmp/aios-run41-smoke.sqlite`;
- port: `43210`;
- selected profile: `claude-code-real`;
- result:
  - preview `canLaunch=false`;
  - policy decision `blocked_workspace`;
  - blockers include `runner_disabled`, `workspace_not_allowlisted`,
    `runner_repo_not_allowlisted`, profile disabled and missing workspace writes;
  - launch returned HTTP `400`;
  - no `AgentRun` was created.

Controlled opt-in local daemon:

- DB: `/tmp/aios-run41-ready-smoke.sqlite`;
- port: `43211`;
- env:
  - `AIOS_AGENT_RUNNER_ENABLED=true`;
  - `AIOS_AGENT_WORKSPACE_ENABLED=true`;
  - `AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock`;
  - `AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock`;
  - `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST='bash echo true git claude codex'`;
- selected profile: `dogfood-semantic-doc-change`;
- selected risk: `A`;
- result:
  - preview `canLaunch=true`;
  - policy decision `allowed_real_execution`;
  - launch outcome `queued`;
  - created AgentRun `TB4bszD1e6qX`;
  - runnerType `other`;
  - profile metadata `dogfood-semantic-doc-change`;
  - no subprocess was executed.

Both local daemons were stopped after smoke; ports `43210` and `43211` had no
remaining listeners.

## Validation

- `git diff --check` passed.
- `npx turbo build --filter=@aios/shared --filter=@aios/daemon --filter=@aios/mcp-server --filter=@aios/web`
  passed.
- `npx turbo build` passed.

## Production Deployment

- PR: `#134`.
- Merge commit: `2c30742 feat: add human approved agent run launcher`.
- CT165 daemon/MCP deployed at `2c30742`; `aios-daemon` active.
- Cloudflare Pages deploy:
  `https://2832ad3e.crewdock.pages.dev`.
- Production smoke:
  - `GET https://api.felhen.ai/api/health` -> `200`;
  - `POST /api/company-brain/agent-runs/launcher/preview` for WorkItem
    `v5QSUqfLBFp_`, profile `claude-code-real`, risk `B` returned
    `canLaunch=false`, policy `blocked_workspace`;
  - `POST /api/company-brain/agent-runs/launcher/launch` with the same payload
    returned HTTP `400`, outcome `blocked`, `agentRun=null`;
  - canonical UI `https://ai.felhen.ai/company-brain/agent-runs` -> `200`;
  - deployed preview `https://2832ad3e.crewdock.pages.dev/company-brain/agent-runs`
    -> `200`.
- Production Company Brain reconciliation:
  - session result artifact `akKlhzF2L0k5`;
  - WorkItem `v5QSUqfLBFp_` marked `done`;
  - internal status artifact `esh50QzgqWje`;
  - GitHub Issues sync `state=open` returned `issuesSeen=2`;
  - Next Work now recommends `#130 AIOS-RUN-42` with WorkItem
    `Qmr3m7dFDNss`.

## Constraints

- No customer repo added.
- No new secret.
- No paid service.
- No external writeback.
- No subprocess auto-execution.
- No auto-merge or auto-deploy.
