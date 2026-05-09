# AIOS-PILOT-03 First Supervised AgentRun

Date: 2026-05-08
Issue: `#139`
Milestone: `AIOS First Internal Pilot v1`

## Goal

Run the first supervised real AgentRun on the AIOS repo itself, tied to a
GitHub-backed WorkItem, with preview, actor/rationale, runner policy gates,
logs and patch packet evidence.

## Scope

Target WorkItem:

- id: `HHxoEZGAvnYU`
- external ref: `antonio-mello-ai/crewdock#139`
- title: `AIOS-PILOT-03: First real supervised AgentRun on AIOS repo`

Runner profile:

- `dogfood-semantic-doc-change`
- command: `bash`
- risk class: `A`
- auth mode: `none`
- repo: `antonio-mello-ai/crewdock`

No Claude/Codex real-agent secret was added. No external writeback, PR, merge or
deploy was performed by this AgentRun.

## Safety Window

Temporary CT165 env gates:

```text
AIOS_AGENT_RUNNER_ENABLED=true
AIOS_AGENT_WORKSPACE_ENABLED=true
AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=claude,codex,echo,true,git,bash
AIOS_AGENT_AUTODISPATCH_ENABLED=false
AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=false
```

The backup was restored after the successful run. Post-restore production
evidence:

- `runnerEnabled=false`
- `workspaceWritesEnabled=false`
- `autoDispatchEnabled=false`
- `prWritebackEnabled=false`
- runner/workspace allowlists empty
- `aios-daemon` active

## Failed Attempts And Fixes

The pilot exposed two real runner defects before the successful run:

1. AgentRun `XWpQylhZyvvQ` launched from the approved profile metadata but
   execution ignored the launcher command/args and fell back to
   `WORKFLOW.md` default `claude -p`. It was terminated with SIGTERM and
   produced session result artifact `DhCjLBpuY0KJ`.
2. PR `#145` fixed command resolution by making `execute` and `execute-async`
   honor `AgentRun.metadata.command` and `AgentRun.metadata.args`. Commit:
   `7d72b80`.
3. AgentRun `17M8Rkqe_Wz6` then used `bash` correctly, but failed with
   exit `128` because execution created an empty directory instead of preparing
   a git worktree. It produced session result artifact `hwC8oFSedYTl`.
4. PR `#146` fixed workspace preparation by forcing execution to call the
   existing `/agent-runs/:id/workspace/prepare` flow before spawning, and by
   blocking reuse of directories that are not registered git worktrees. Commit:
   `377e572`.

Both fixes were merged, built and deployed to CT165 before the final retry.

## Successful Run

Final AgentRun:

- id: `EkBKGo5bw2Uu`
- status: `completed`
- exit code: `0`
- command: `bash`
- policy decision: `allowed_real_execution`
- workspace:
  `/home/claude/.aios/agent-workspaces/antonio-mello-ai_crewdock/antonio-mello-ai_crewdock_139-ekbkgo5b`
- branch: `aios-antonio-mello-ai_crewdock_139-ekbkgo5b`
- session result artifact: `fA-89I2JRcaC`
- session result source: `fallback_stdout`

Local commit produced inside the prepared worktree:

- sha: `cb1b19acf0db4eb72671d348c929658934cda738`
- subject: `docs: add semantic aios dogfood note`
- changed file: `docs/action/aios-semantic-dogfood-HHxoEZGAvnYU.md`

Log evidence:

- log line count: `17`
- outcome: `completed`
- stdout recorded the commit summary and created file
- stderr empty

Patch packet:

- artifact: `laKzBb8ZWfgz`
- status: `clean`
- base ref: `main`
- changed files: `1`
- insertions: `9`
- deletions: `0`
- commits ahead of base: `1`
- validations:
  - `runner_exit_zero=passed`
  - `patch_content=passed`
  - `git_commit=passed`

## Acceptance Mapping

- AgentRun tied to a WorkItem and pilot target: yes, WorkItem
  `HHxoEZGAvnYU`, repo target `antonio-mello-ai/crewdock`.
- Preview captured before launch: yes, preview returned `canLaunch=true`,
  command `bash`, policy `allowed_real_execution`.
- Real execution has actor/rationale and passing policy gates: yes.
- Logs, terminal status and patch packet persisted: yes.
- No auto-dispatch broadening, auto-merge or deploy: yes.

## Next

`#140` should consume the produced patch packet through the PR proposal/review
loop:

1. Create or reuse a governed `github_pr_create` proposal from AgentRun
   `EkBKGo5bw2Uu`.
2. Review/approve the proposal explicitly.
3. Open/update a GitHub PR without auto-merge or deploy.
4. Ingest the AIOS-authored PR review evidence back into Company Brain.
5. Submit session result and close the WorkItem only after the review loop is
   reflected in the graph.
