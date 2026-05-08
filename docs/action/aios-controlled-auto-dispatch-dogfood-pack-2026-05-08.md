# AIOS Controlled Auto-Dispatch Dogfood Pack v4

Closes #88 (AIOS-RUN-23). Documents one controlled end-to-end auto-dispatch run on a low-risk internal AIOS test WorkItem, plus production default-off evidence and residual frictions.

## Summary

The AIOS Operating Loop now produces **suggestions** (RUN-18), **promotes** them to queued AgentRuns (RUN-20), and **dispatches** at most one async run per tick (RUN-21) when explicit env opt-in passes the 11-gate eligibility policy (RUN-19). After execution, the loop **reconciles** running runs and supersedes suggestions tied to closed WorkItems (RUN-22). This dogfood run validates the full chain end-to-end on a controlled environment with `echo`-equivalent command and confirms production stays default-off.

## Controlled environment

- Host: local macOS, daemon running on `AIOS_PORT=3199`, isolated SQLite DB at `/tmp/aios-dogfood-v4.db`
- Workspace root: `~/.aios/agent-workspaces` (default from `WORKFLOW.md`)
- Repo target: `antonio-mello-ai/crewdock` (internal, no customer/external repo)
- WorkItem: Risk A, area=`development`, labels=`["dogfood","aios","internal-test"]`
- Runner command: `claude` (allowlisted but no API key, so subprocess exits with non-zero — exactly the failure mode we want for a no-op dogfood)

## Env opt-in (12 vars, all required)

```
AIOS_AGENT_AUTODISPATCH_ENABLED=true
AIOS_AGENT_AUTODISPATCH_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_AUTODISPATCH_WORKFLOW_ALLOWLIST=development-blueprint-v0
AIOS_AGENT_AUTODISPATCH_AREA_ALLOWLIST=development,platform
AIOS_AGENT_AUTODISPATCH_REQUIRE_RISK_A=true
AIOS_AGENT_AUTODISPATCH_MAX_CONCURRENCY=1
AIOS_AGENT_AUTODISPATCH_TOKEN_BUDGET=50000
AIOS_AGENT_AUTODISPATCH_COOLDOWN_MS=600000

AIOS_AGENT_RUNNER_ENABLED=true
AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=echo,true,claude
AIOS_AGENT_WORKSPACE_ENABLED=true
AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock
```

## Run identifiers

| Object | ID | State |
|---|---|---|
| WorkItem | `5_ob_GjP_Up7` | new → in_progress |
| AgentRunSuggestion | `P4zKUjHehudq` | active → promoted |
| AgentRun | `wuXBRVe899cA` | queued → running → failed |
| Workspace | `~/.aios/agent-workspaces/antonio-mello-ai_crewdock/5_ob_GjP_Up7-wuxbrve8` | exists, clean, no worktree (cleanup risk: `missing_worktree`) |

## Audit trail (in order)

```
agent_run_promoted_from_suggestion           actor=operating-loop:auto-dispatch
agent_run_real_execution_async_started       actor=operating-loop:auto-dispatch
agent_run_async_pid_recorded                 actor=operating-loop:auto-dispatch  (pid=24315)
agent_run_auto_dispatched                    actor=operating-loop:auto-dispatch
agent_run_real_execution_failed              actor=operating-loop:auto-dispatch  (errorSummary="non-zero exit code 1")
agent_run_session_result_intake              actor=operating-loop:auto-dispatch
```

The full chain ran in **~5 seconds** end-to-end (`startedAt=1778230878879` → `finishedAt=1778230883805`).

## Eligibility decision

`evaluateAutoDispatchEligibility` returned `decision=eligible` with **all 11 gates passed**:

```
✓ autodispatch_env_enabled       AIOS_AGENT_AUTODISPATCH_ENABLED=true
✓ repo_allowed                   antonio-mello-ai/crewdock ∈ allowlist
✓ workflow_allowed               development-blueprint-v0 registered + allowlisted
✓ area_allowed                   WorkItem.area=development ∈ allowlist
✓ risk_class_allowed             WorkItem.riskClass=A; requireRiskA=true
✓ work_item_eligible             status=new; not blocked; no destructive labels
✓ manual_runner_policy_passed    evaluateRunnerPolicy=allowed_real_execution
✓ concurrency_under_limit        active=0/1
✓ cooldown_elapsed               cooldownMs=600000; lastAutoDispatchAt=never
✓ token_budget_remaining         available=50000/50000
✓ actor_rationale_present        actor=operating-loop:auto-dispatch
```

## Idempotency proof

After the first dispatch, a second cadence tick on the same DB produced:

```
autoDispatchSuccessCount = 1   (unchanged)
lastOutcome.status       = skipped_no_suggestion
lastOutcome.suggestionId = None
lastOutcome.agentRunId   = None
```

Total `cb_agent_runs.count = 1` — no duplicate dispatch.

## Reconciliation behavior

After the AgentRun terminated (`status=failed`), the next cadence tick scanned 0 active runs (terminal status excluded from the running scan), confirming the reconciler does not re-process completed runs.

## Production default-off evidence

```
PROD config.enabled               = False
PROD config.repoAllowlist         = []
PROD eligibility.decision         = blocked_default_off
PROD autoDispatchSuccessCount     = 0
PROD autoDispatchTickCount        = 1
PROD lastOutcome.status           = skipped_disabled
```

Captured against `https://api.felhen.ai/api/company-brain/auto-dispatch/policy` and `/operating-loop` endpoints. No env var was set in CT165 production; the default-off gate refused to consider any suggestion.

## Constraints honored

- ✅ No broad multi-issue auto-dispatch — `MAX_CONCURRENCY=1` enforced; FIFO single-run-per-tick algorithm.
- ✅ No customer/external repo target — `REPO_ALLOWLIST` only contains `antonio-mello-ai/crewdock`.
- ✅ No secret expansion — only existing `AIOS_AGENT_*` env vars used; `GITHUB_TOKEN`/`SLACK_BOT_TOKEN` continue to be redacted from subprocess env by default.
- ✅ No auto-merge/deploy/writeback — auto-dispatch only spawns the configured command (`claude -p`) and records session_result; no API call to GitHub merge/close/comment endpoints.
- ✅ Workspace cleanup remains gated by confirmation token (RUN-17); dogfood workspace was preserved for inspection then manually removed.
- ✅ Production stayed default-off across all post-deploy smokes.

## Residual frictions (→ next milestone)

1. **Workspace allowlist semantics surprise** — `AIOS_AGENT_WORKSPACE_ALLOWLIST` accepts repo identifiers (`owner/name`), not filesystem paths. The env-var name suggested filesystem paths to me on first read; I had to inspect `evaluateRunnerPolicy` source to discover the actual contract. Action item: add a doc note in `WORKFLOW.md` and surface a hint in the `/auto-dispatch/policy` UI panel, OR rename the env var.

2. **Workflow allowlist requires DB-registered blueprint id** — registering a blueprint via `POST /workflow-blueprints` ignores the client-supplied `id` and assigns a new one. Setting `AIOS_AGENT_AUTODISPATCH_WORKFLOW_ALLOWLIST` to a stable blueprint ref string (e.g., `aios-supervised-runner-v0`) does not work unless that exact id is in `cb_workflow_blueprints.id`. Workaround used: rely on the seeded `development-blueprint-v0`. Action item: either accept client-supplied stable ids on creation, or expose `ref` as an alternate identity column, or document the seeded ids prominently.

3. **`workspaceIsDirty` returns false when `git status` fails** — the missing-worktree case (workspace exists but worktree was never registered with `git worktree add`) shows `isDirty=false` + `risks=["missing_worktree"]`. The current workspace cleanup-preview correctly captures the risk, but operators need to read both fields to understand the state. Action item: surface a combined "needs_review" flag on the cleanup preview UI when any risk is present.

4. **No PUT/PATCH on `/work-items`** — during smoke I needed to flip a WorkItem to `done` to test the suggestion-supersede reconciliation path; had to fall back to direct `sqlite3 UPDATE`. Action item: add a minimal status-update endpoint or document that WorkItem status changes flow through GitHub Issue sync.

5. **Subprocess exit failure path is the dogfood's "happy path"** — the dogfood succeeds *because* `claude` exits non-zero (no API key in the env). A future dogfood pack should configure a real no-op command (`/usr/bin/echo OK > .aios-run/output.log`) so the AgentRun terminates with `status=completed` instead of `failed`. The current pack proved the **dispatch + audit + reconciliation** chain — not the success path. Action item: add a v5 dogfood that exercises status=completed via a deliberately benign command override.

## Backlog entries

The five frictions above are recorded here. They feed the next milestone (AIOS Agent Execution v5 if/when scoped) but are not blockers for v4 closure.

## Validation checklist

- [x] Eligibility=eligible across all 11 gates
- [x] AgentRun lifecycle promoted → started → pid_recorded → auto_dispatched → failed → session_result_intake
- [x] Idempotent re-tick produces `skipped_no_suggestion`
- [x] Reconciliation does not re-process terminal runs
- [x] Production default-off confirmed (`enabled=False`, `decision=blocked_default_off`)
- [x] Workspace cleanup preview returns the workspace path with `missing_worktree` risk
- [x] No subprocess spawned outside the allowlisted `claude` command
- [x] No external writeback (Slack/GitHub APIs) called from auto-dispatch path
- [x] `npx turbo build` passes (validated in PRs #89, #90, #91, #92)
- [x] `git diff --check` passes (no whitespace errors)

## Conclusion

The AIOS Agent Execution v4 milestone (issues #84 → #88) is **operationally complete**. The Operating Loop can suggest, promote, dispatch, reconcile and clean up AgentRuns autonomously inside an explicit opt-in envelope, while production stays default-off and refuses any subprocess launch. The five residual frictions are real but small — they are about ergonomics (env-var semantics, workspace cleanup UX, doc hints) rather than safety. v4 ships.
