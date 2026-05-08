---
tracker:
  kind: github
  repo: antonio-mello-ai/crewdock
  active_milestone: AIOS Agent Execution v7
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

## Auto-dispatch env vars

Auto-dispatch is **default-off** in production. Opt-in requires the following env vars (all checked via `evaluateAutoDispatchEligibility`). Each gate response now carries `envRefs`, `expectedFormat`, `exampleValue` and `docsLink` to make config errors fixable without reading source.

| Env var | Format | Example | Notes |
|---|---|---|---|
| `AIOS_AGENT_AUTODISPATCH_ENABLED` | boolean string | `true` | Master switch. Unset or anything other than `"true"` keeps auto-dispatch blocked. |
| `AIOS_AGENT_AUTODISPATCH_REPO_ALLOWLIST` | CSV of `owner/name` | `antonio-mello-ai/crewdock` | GitHub repo identifiers, **not** filesystem paths. Must include `WORKFLOW.md` `tracker.repo`. |
| `AIOS_AGENT_AUTODISPATCH_WORKFLOW_ALLOWLIST` | CSV of blueprint ids | `development-blueprint-v0` | Must match `cb_workflow_blueprints.id` exactly. Use `POST /workflow-blueprints` with body `{ "id": "<stable-id>", ... }` to create a blueprint with a stable, allowlist-friendly id (regex `/^[a-z0-9][a-z0-9._-]{1,62}$/`). Omitting `id` falls back to a generated nanoid (legacy behavior). |
| `AIOS_AGENT_AUTODISPATCH_AREA_ALLOWLIST` | CSV of `CompanyBrainArea` | `development,platform` | Allowed values: `strategy`, `development`, `operations`, `product`, `marketing`, `sales`, `finance`, `people`, `customer`, `platform`. |
| `AIOS_AGENT_AUTODISPATCH_REQUIRE_RISK_A` | boolean string | `true` | When `true` (default), only Risk A WorkItems are eligible. Set `false` to allow Risk B with documented rationale. |
| `AIOS_AGENT_AUTODISPATCH_MAX_CONCURRENCY` | int | `1` | Max active runs at any time across the daemon. Defaults to 1; the loop also enforces single-run-per-tick. |
| `AIOS_AGENT_AUTODISPATCH_TOKEN_BUDGET` | int | `100000` | Tokens spent in the cooldown window. Auto-dispatch refuses when window budget is exhausted. |
| `AIOS_AGENT_AUTODISPATCH_COOLDOWN_MS` | int (ms) | `900000` | Minimum gap between auto-dispatches; also defines the budget window. |
| `AIOS_AGENT_AUTODISPATCH_MAX_RUNTIME_MS` | int (ms) | `600000` | Per-run timeout. Reconciler marks runs `failed` when exceeded. |
| `AIOS_AGENT_AUTODISPATCH_DEFAULT_ACTOR` | string | `operating-loop:auto-dispatch` | Audit actor for promote + execute-async calls. |
| `AIOS_AGENT_AUTODISPATCH_DEFAULT_RATIONALE` | string | `Auto-dispatched by Operating Loop after eligibility evaluation` | Default rationale recorded on AgentRun. |
| `AIOS_AGENT_AUTODISPATCH_COMMAND_OVERRIDE` | string (optional) | `echo` | When set, auto-dispatch passes this binary as `commandOverride` to `/execute-async` instead of `WORKFLOW.md` `agent.command`. Must still be present in `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST`. Useful for dogfood smoke runs with benign commands. |
| `AIOS_AGENT_AUTODISPATCH_PROFILE_ID` | runner profile id (optional) | `noop-echo` | Selects a typed runner profile from the registry (`GET /runner-profiles`). Takes precedence over `COMMAND_OVERRIDE`. Profile's `command`/`args` thread through to `/execute-async`. Eligibility additionally checks the profile is enabled and that repo/area/risk are within profile bounds. |
| `AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_ENABLED` | boolean string | `true` | Optional v7 chain gate. When true, a successfully completed auto-dispatched AgentRun can create/reuse a preview-only `github_pr_create` proposal from its patch packet. Default-OFF. |
| `AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_REPO_ALLOWLIST` | CSV of `owner/name` | `antonio-mello-ai/crewdock` | Optional repo allowlist for auto-created PR proposals. Falls back to `AIOS_AGENT_AUTODISPATCH_REPO_ALLOWLIST` when unset. |
| `AIOS_AGENT_RUNNER_PROFILE_CLAUDE_CODE_ENABLED` | boolean string (optional) | `false` | Toggles the `claude-code-real` runner profile. Default-OFF. |
| `AIOS_AGENT_RUNNER_PROFILE_CODEX_CLI_ENABLED` | boolean string (optional) | `false` | Toggles the `codex-cli-real` runner profile. Default-OFF. |

## Runner profile registry

Built-in profiles queryable via `GET /runner-profiles?repo=...&area=...&riskClass=...`:

| id | category | command | defaultEnabled | risk ceiling | capabilities |
|---|---|---|---|---|---|
| `noop-echo` | noop | `echo aios-noop-runner-heartbeat` | true | A | `no_op` |
| `dogfood-true` | dogfood | `true` | true | A | `no_op` |
| `dogfood-empty-commit` | dogfood | `git -c user.name=AIOS Dogfood -c user.email=aios@example.invalid commit --allow-empty -m "aios dogfood empty commit"` | true | A | `git_commit` |
| `dogfood-semantic-doc-change` | dogfood | `bash -lc ... docs/action/aios-semantic-dogfood-<workItem>.md` | true | A | `git_commit` |
| `claude-code-real` | real_agent | `claude -p` | false | B | `shell_command`, `code_edit`, `git_commit`, `github_pr_open`, `test_runner` |
| `codex-cli-real` | real_agent | `codex` | false | B | same as `claude-code-real` |

Real-agent profiles are explicitly OFF by default. Each carries an `enabledEnvVar` the operator must set to `true` before the profile becomes selectable. The eligibility evaluator chains the runner profile gate after all other auto-dispatch gates so policy hints stay specific.

## GitHub PR writeback env vars (AIOS-RUN-32)

The approved-PR executor (`POST /external-action-proposals/:id/execute-pr`) is **default-off** and requires:

| Env var | Format | Notes |
|---|---|---|
| `AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED` | boolean string | Master switch. Unset or anything other than `"true"` blocks all PR writeback. |
| `AIOS_AGENT_GITHUB_PR_WRITEBACK_REPO_ALLOWLIST` | CSV of `owner/name` | Repos allowed to receive AIOS-authored PRs. Example: `antonio-mello-ai/crewdock`. |
| `GITHUB_TOKEN` or `GH_TOKEN` | string | Existing daemon token. **No new secret introduced** — must be the same token already in use for GitHub Issues sync. |

The PR body always carries an invisible `<!-- aios:proposalId=...:agentRunId=...:sig=... -->` marker so re-executing the same proposal is idempotent (the executor lists open/closed PRs filtered by `head=<owner>:<branch>` and reuses the existing one when the marker matches).

## Manual runner env vars

Auto-dispatch chains `evaluateRunnerPolicy(intent=real_execution)`, so the manual runner env vars must also be set:

| Env var | Format | Example | Notes |
|---|---|---|---|
| `AIOS_AGENT_RUNNER_ENABLED` | boolean string | `true` | Master switch for any real subprocess (manual or auto). |
| `AIOS_AGENT_RUNNER_REPO_ALLOWLIST` | CSV of `owner/name` | `antonio-mello-ai/crewdock` | Mirrors auto-dispatch repo allowlist. |
| `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST` | CSV of binaries | `claude,echo,true` | Must include `WORKFLOW.md` `agent.command` (e.g., `claude`). Defaults to `claude,codex,echo,true`. |
| `AIOS_AGENT_WORKSPACE_ENABLED` | boolean string | `true` | Enables workspace prepare/cleanup endpoints. |
| `AIOS_AGENT_WORKSPACE_ALLOWLIST` | **CSV of `owner/name`** | `antonio-mello-ai/crewdock` | **Repo identifiers, NOT filesystem paths.** The workspace path itself is derived from `WORKFLOW.md` `workspace.root` (default `~/.aios/agent-workspaces`); this allowlist controls which repos can use that root. |

The workspace path is computed as `${workspace.root}/${owner_repo}/${workItemKey}-${runId.slice(0,8)}`. The cleanup gate (#78) refuses to remove anything outside `workspace.root`.

## Failed gate response shape

```ts
interface AutoDispatchGate {
  key: string;
  title: string;
  status: "passed" | "failed" | "warn";
  detail: string;
  remediation?: string;
  envRefs?: string[];        // env vars that need to be fixed
  expectedFormat?: string;   // human-readable contract
  exampleValue?: string;     // ready-to-paste value
  docsLink?: string;         // pointer to deeper docs
}
```

The console renders `envRefs` and `exampleValue` inline so an operator can fix config without re-reading source.
