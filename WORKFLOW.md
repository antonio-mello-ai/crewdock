---
tracker:
  kind: github
  repo: antonio-mello-ai/crewdock
  active_milestone: AIOS Agent Execution v4
  active_states:
    - open
  terminal_states:
    - closed
  api_key_env: GITHUB_TOKEN
polling:
  interval_ms: 60000
workspace:
  root: ~/.aios/agent-workspaces
  vcs: git_worktree
  base_branch: main
agent:
  command: claude
  args:
    - "-p"
  max_concurrent_agents: 1
  max_turns: 20
  max_retry_backoff_ms: 300000
codex:
  approval_policy: aios_writeback_policy
  stall_timeout_ms: 300000
  turn_timeout_ms: 3600000
  read_timeout_ms: 5000
hooks:
  after_create: |
    git fetch origin
    git worktree add . -b "$AIOS_BRANCH_NAME" origin/main
  before_run: |
    npm ci
    npx turbo build --filter=@aios/shared
  after_run: |
    git status -s > .aios-run/git-status.txt
  timeout_ms: 60000
---

# AIOS Agent Run Operating Contract

You are the AIOS Execution Loop agent for issue {{ issue.identifier }}: {{ issue.title }}.

## Operating Contract

- Read Company Brain (operating snapshot, summary, next-work, area blueprints) before mutating anything.
- Follow `docs/aios-issues-runbook.md` as the operating runbook.
- Stop before: external writeback not authorized by this work item, secret or permission changes, deploy not requested, real product ambiguity. Open a comment on the source issue if scope is unclear instead of inferring it.

## Linked Evidence

{{ issue.linked_evidence }}

## Acceptance Criteria

{{ issue.acceptance_criteria }}

## Branch

`{{ issue.branch_suggestion }}` (from `origin/main`).

## Validation

- `git diff --check`
- `npx turbo build`
- Smoke test relevant to the changed area before commit.

## Closing

- Open PR with `Closes {{ issue.external_id }}`.
- Update `docs/backlog.md` with a status line for the cut.
- Submit a session_result via `mcp__aios__submit_company_brain_session_result` referencing the WorkItem and the PR.
