# AIOS-PILOT-02 Controlled Runner Enablement Window

Date: 2026-05-08
Issue: `#138`
Milestone: `AIOS First Internal Pilot v1`

## Goal

Prove that production runner/workspace gates can be opened narrowly for the
AIOS internal repo, observed through readiness, and then returned to
default-off with the kill switch.

## Preflight

Production readiness before the window:

- `runnerEnabled=false`
- `workspaceWritesEnabled=false`
- `autoDispatchEnabled=false`
- `runnerRepoAllowlist=[]`
- `workspaceAllowlist=[]`
- `realAgentReady=0`
- `realAgentBlocked=2`

Real Claude/Codex profiles were not enabled because production has no visible
`ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in:

- `/home/claude/aios-runtime/.env.prod`
- `/home/claude/.env`
- `/etc/environment`

No new secret was added. `codex` is also not on the CT165 PATH. `claude` is on
PATH at `/usr/bin/claude`, but the configured real profile still requires
`ANTHROPIC_API_KEY`.

Selected profile for this controlled window:

- `dogfood-semantic-doc-change`
- command: `bash`
- auth mode: `none`
- repo: `antonio-mello-ai/crewdock`
- risk class checked: `A`

This validates the runner window mechanics without introducing a new secret.

## Enablement Window

Backup created on CT165:

`/home/claude/aios-runtime/.env.prod.before-aios-pilot-02-20260509020149`

Temporary env gates:

```text
AIOS_AGENT_RUNNER_ENABLED=true
AIOS_AGENT_WORKSPACE_ENABLED=true
AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=claude,codex,echo,true,git,bash
AIOS_AGENT_AUTODISPATCH_ENABLED=false
AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=false
```

Daemon restart result:

- `aios-daemon` active

Readiness during the window:

- `runnerEnabled=true`
- `workspaceWritesEnabled=true`
- `autoDispatchEnabled=false`
- `runnerRepoAllowlist=[antonio-mello-ai/crewdock]`
- `workspaceAllowlist=[antonio-mello-ai/crewdock]`
- `ready=4`
- `blocked=2`
- `dogfood-semantic-doc-change.status=ready`
- `dogfood-semantic-doc-change.blockReasons=[]`
- real Claude/Codex profiles remained blocked by profile/auth/command gates

## Kill Switch / Restore

Restored the backup:

```text
cp .env.prod.before-aios-pilot-02-20260509020149 .env.prod
systemctl restart aios-daemon
```

Post-restore verification:

- `aios-daemon` active
- `runnerEnabled=false`
- `workspaceWritesEnabled=false`
- `autoDispatchEnabled=false`
- `prWritebackEnabled=false`
- `runnerRepoAllowlist=[]`
- `workspaceAllowlist=[]`
- first-project readiness remains `warn`
- `7/9 ready`
- `2 warn`
- `0 blocked`
- `pendingAiosPrReviews=0`

## Acceptance Mapping

- Env gates and allowlists were set only for `antonio-mello-ai/crewdock`: yes.
- Kill-switch command was verified before enabling and used after: yes.
- Runner/profile readiness moved to ready for the selected profile: yes,
  `dogfood-semantic-doc-change`.
- Gates were disabled again after the pilot window: yes.
- No broad auto-dispatch, customer repo, deploy, merge or billing/permission
  action: yes.

## Next

`#139` should run the first supervised AgentRun. Because no Claude/Codex secret
exists in production, the next safe step is either:

- run `dogfood-semantic-doc-change` as the first real subprocess AgentRun; or
- explicitly provide/approve the missing real-agent auth before attempting a
  Claude/Codex profile.
