# AIOS Controlled Auto-Dispatch Dogfood Pack v5

Closes #98 (AIOS-RUN-28). Documents one controlled end-to-end auto-dispatch run that reaches `status=completed` using the new `AIOS_AGENT_AUTODISPATCH_COMMAND_OVERRIDE=echo` path, exercises the full v4+v5 chain (suggestion → eligibility → promote → execute-async → session_result → reconciliation), and confirms production stays default-off.

## What changed vs v4

The v4 dogfood (#88) ran the chain end-to-end but `claude` exited non-zero (no API key), so the AgentRun ended `status=failed`. v5 introduces `AIOS_AGENT_AUTODISPATCH_COMMAND_OVERRIDE` so dogfood smokes can substitute a benign binary (`echo`, `true`) for the real agent command without modifying `WORKFLOW.md`. The override threads into both the chained `evaluateRunnerPolicy` (so the manual policy gate accepts it) and the `execute-async` body (so the subprocess actually runs the override).

This dogfood proves:

1. The **completed path** for auto-dispatch (status=completed, not failed).
2. The **command override** mechanism (#98 itself).
3. The **reconciliation** path triggered by the **internal status update endpoint** (#97).
4. The **stable workflow blueprint id** seeded with the system (#95).
5. The **policy hints** (#94) returned by the policy preview during setup.

## Controlled environment

- Host: local macOS, daemon `AIOS_PORT=3199`, isolated SQLite DB at `/tmp/aios-run28-smoke.db`.
- Workspace root: `~/.aios/agent-workspaces` (default from `WORKFLOW.md`).
- Repo target: `antonio-mello-ai/crewdock` (internal).
- WorkItem: Risk A, area=`development`, labels=`["dogfood","aios","v5","internal-test"]`.
- Runner command: **`echo`** via the new override (`WORKFLOW.md` `agent.command=claude` was untouched).

## Env opt-in (12 vars, all required for full eligibility)

```
AIOS_AGENT_AUTODISPATCH_ENABLED=true
AIOS_AGENT_AUTODISPATCH_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_AUTODISPATCH_WORKFLOW_ALLOWLIST=development-blueprint-v0
AIOS_AGENT_AUTODISPATCH_AREA_ALLOWLIST=development,platform
AIOS_AGENT_AUTODISPATCH_REQUIRE_RISK_A=true
AIOS_AGENT_AUTODISPATCH_MAX_CONCURRENCY=1
AIOS_AGENT_AUTODISPATCH_TOKEN_BUDGET=50000
AIOS_AGENT_AUTODISPATCH_COOLDOWN_MS=600000
AIOS_AGENT_AUTODISPATCH_COMMAND_OVERRIDE=echo

AIOS_AGENT_RUNNER_ENABLED=true
AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=echo,true
AIOS_AGENT_WORKSPACE_ENABLED=true
AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock
```

## Run identifiers

| Object | ID | State |
|---|---|---|
| WorkItem | `cgWHgooT1UCC` | new → done (via #97 PATCH) |
| AgentRunSuggestion #1 | `Dt-QiJke0Rf2` | active → superseded |
| AgentRun #1 | `KNbHJQJ-rUPx` | queued → running → **completed** |
| AgentRunSuggestion #2 | `IN8S68qiLi2W` | active → superseded |
| AgentRun #2 | `frfUkNpMq8gv` | queued → running → **completed** |
| Status update Artifact | `2HcJmFNXw0XC` | session_result, internal-only |

Both AgentRuns reached `status=completed` with `errorSummary=None`. Run 1 finished in **~110 ms** end-to-end (`startedAt=1778240686356 → finishedAt=1778240686466`).

## Audit trail (Run 1)

```
agent_run_promoted_from_suggestion           actor=operating-loop:auto-dispatch
agent_run_real_execution_async_started       actor=operating-loop:auto-dispatch
agent_run_async_pid_recorded                 actor=operating-loop:auto-dispatch
agent_run_auto_dispatched                    actor=operating-loop:auto-dispatch
agent_run_real_execution_completed           actor=operating-loop:auto-dispatch
agent_run_session_result_intake              actor=operating-loop:auto-dispatch
```

The terminal event is now `agent_run_real_execution_completed` (not `_failed`). This is the **first dogfood to validate the success branch end-to-end.**

## Eligibility decision

`evaluateAutoDispatchEligibility` returned `decision=eligible` with all 11 gates passed. The chained `evaluateRunnerPolicy` received the override via `commandOverride: "echo"` and returned `allowed_real_execution`.

## Two dispatches per WorkItem (signature evolution)

After the first AgentRun completed, the auto-dispatch tick produced a **second** suggestion (signature `665cfa68` vs the first `1a90007e`) and dispatched a **second** AgentRun (`frfUkNpMq8gv`). Both reached `status=completed`.

This is the suggester's signature contract working as designed: when WorkItem state changes (the first AgentRun's `session_result` intake updates WorkItem metadata or status), the signature advances, a new suggestion is generated, and a new dispatch becomes eligible. **Idempotency is per-signature, not per-WorkItem.**

The dispatch chain self-terminated as soon as the operator marked the WorkItem as `done`:

1. `PATCH /work-items/cgWHgooT1UCC/status` with `{actor, rationale, status: "done"}` (the new #97 endpoint, replacing the v4 SQLite workaround).
2. Audit Artifact `2HcJmFNXw0XC` created with `previousStatus=new`, `newStatus=done`, `internalOverride=false` (this WorkItem was internal, not GitHub-sourced).
3. Next cadence tick → reconciliation finding `kind=suggestion_superseded_done_work_item` for the latest active suggestion.
4. Result: 2 superseded suggestions, 2 completed AgentRuns, 0 active suggestions, 0 active AgentRuns.

## Production default-off evidence

```
PROD config.enabled               = False
PROD config.commandOverride       = null
PROD eligibilityPreview.decision  = blocked_default_off
PROD lastOutcome.status           = skipped_disabled
```

Captured against `https://api.felhen.ai/api/company-brain/auto-dispatch/policy` and `/operating-loop`. No env var was set in CT165 production. The new `commandOverride` field is `null` in production, mirroring the master-switch default-off behavior.

## v5 frictions resolved (vs v4 dogfood)

| v4 friction | v5 resolution |
|---|---|
| Env-var semantics confusing (workspace allowlist takes repo names not paths) | #94 — gate response includes `envRefs`, `expectedFormat`, `exampleValue`, `docsLink`; WORKFLOW.md documents the contract |
| Workflow allowlist depends on auto-generated blueprint ids | #95 — `POST /workflow-blueprints` honors client-supplied stable id with regex validation + 409 collision |
| Workspace cleanup status spread across 3+ fields | #96 — `cleanup-preview` adds `reviewStatus`, `reviewSummary`, `recommendedAction` |
| No internal status-update path; v4 fell back to SQLite | #97 — `PATCH /work-items/:id/status` with audit Artifact + internal-override flag |
| Subprocess intentionally fails because `claude` lacks API key | #98 (this PR) — `AIOS_AGENT_AUTODISPATCH_COMMAND_OVERRIDE=echo` produces `status=completed` |

## Constraints honored

- ✅ No broad multi-issue auto-dispatch — `MAX_CONCURRENCY=1`, single-run-per-tick, FIFO over active unpromoted suggestions.
- ✅ No customer/external repo target — `REPO_ALLOWLIST=antonio-mello-ai/crewdock`.
- ✅ No new secret — only existing `AIOS_AGENT_*` env vars; the `COMMAND_OVERRIDE` is just a binary name (`echo`).
- ✅ No paid service.
- ✅ No external writeback — `internalOverride=false` for this internal WI; for GitHub-sourced WIs the `#97` flow flags overrides without mutating GitHub.
- ✅ No auto-merge/deploy — auto-dispatch only spawns the configured command and records `session_result`.
- ✅ Workspace cleanup remains gated by confirmation token (#78).
- ✅ Production stayed default-off across all post-deploy smokes.

## Validation checklist

- [x] AgentRun reaches `status=completed` (not failed).
- [x] Audit trail terminal event = `agent_run_real_execution_completed`.
- [x] `session_result` intake artifact created for the completed run.
- [x] Idempotent re-tick logic: each new signature → at most one dispatch; same signature → `skipped_no_suggestion`.
- [x] Reconciliation supersedes the suggestion when the WorkItem is marked `done` via the new internal status update endpoint.
- [x] Policy gate hints from #94 visible in the eligibility response (validated in PR #99).
- [x] Stable blueprint id from #95 used (`development-blueprint-v0` was the seeded id; the override could have used any registered stable id).
- [x] Cleanup preview review status from #96 returns `clear` / `proceed_remove` for the completed AgentRun's workspace.
- [x] Production default-off (`config.enabled=False`, `commandOverride=null`).
- [x] `npx turbo build` passes (validated in this PR + #99 + #100 + #101 + #102).
- [x] `git diff --check` passes (no whitespace errors).

## Conclusion

The AIOS Agent Execution v5 milestone (issues #94 → #98) is **operationally complete**. The Operating Loop now has a verified completed-path dogfood, every config friction surfaced in v4 has an actionable hint or a stable identity, operators have a minimal audited internal status-update path, and production continues to refuse any auto-dispatch unless every gate is explicitly opted in. The system is ready for whatever scope-tightening the next milestone brings.
