# AIOS ERP Real AgentRun Promotion Checklist

Date: 2026-05-08

This checklist defines when AIOS can move from ERP dogfood/docs-only runs to the
first real supervised ERP implementation AgentRun.

## Current Verdict

Status: `ready_to_prepare`, not `ready_to_launch`.

Meaning:

- the cross-project dogfood loop worked end-to-end;
- the first real candidate can be selected;
- the real run must not launch until the human explicitly approves the
  promotion window.

## Candidate

Selected first candidate:

- repo: `antonio-mello-ai/erp-desmanches`
- issue: `#99 DEMO-DATA-01 — Recriar seed/demo canonico para v0.31+`
- Company Brain WorkItem: `KKm2D9oJgUu4`
- URL: `https://github.com/antonio-mello-ai/erp-desmanches/issues/99`

Rationale:

- low customer impact;
- demo/test-data oriented;
- useful for ERP product readiness;
- does not require marketplace mutation;
- does not require production ERP DB mutation if implemented against repo
  fixtures/seeds and validated locally first.

Launch is deferred until the approval gates below pass.

## Required Evidence Gates

- [x] ERP target exists as an approved pilot target.
- [x] ERP GitHub Issues source is healthy in Company Brain.
- [x] Dogfood AgentRun completed with clean patch packet.
- [x] PR writeback path opened a real ERP PR.
- [x] Evidence packet for proposal `rBGhT13JpqFZ` has no critical gaps.
- [x] Bad pre-fix branch is tracked as cleanup candidate.
- [x] PR `#111` review intake is synced and Decision exists.
- [ ] Human explicitly approves promotion from dogfood/docs-only to real
      implementation AgentRun.
- [ ] Human explicitly accepts that PR `#111` can remain open while the next
      run starts, or merges it before launch.

## Required Runtime Gates

For the launch window only:

- `AIOS_AGENT_RUNNER_ENABLED=true`
- `AIOS_AGENT_WORKSPACE_ENABLED=true`
- `AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/erp-desmanches`
- `AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/erp-desmanches`
- `AIOS_AGENT_AUTODISPATCH_ENABLED=false`
- `AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=false`

Runner profile:

- preferred: `claude-code-real`, only if profile is explicitly enabled and
  authenticated in CT165;
- fallback: `codex-cli-real`, only if installed, enabled and authenticated;
- do not use `erp-dogfood-semantic-doc-change` for real implementation work.

Profile/env gates:

- `AIOS_AGENT_RUNNER_PROFILE_CLAUDE_CODE_ENABLED=true`, or
  `AIOS_AGENT_RUNNER_PROFILE_CODEX_CLI_ENABLED=true`;
- selected command present on CT165 `PATH`;
- selected command included in `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST`;
- no broad repo/customer allowlist;
- no marketplace, billing, ads, email or production DB credentials passed into
  the agent.

## Work Boundary

Allowed:

- repository code and seed/demo fixtures needed for ERP issue `#99`;
- local tests/builds;
- docs/action evidence;
- patch packet capture;
- PR proposal preview.

Blocked:

- ERP production DB writes;
- marketplace API mutations;
- credentials or permission changes;
- close/reopen/merge/deploy;
- multi-issue auto-dispatch;
- branch deletion;
- writeback outside the approved PR proposal path.

## Stop Conditions

Stop and mark the run `needs_human` if any condition appears:

- agent asks for new secrets;
- patch touches production deploy/config/infra unexpectedly;
- patch touches marketplace mutation code without explicit approval;
- patch has broad unrelated refactor;
- tests fail and the fix is not local to the issue;
- workspace becomes dirty without a clean commit;
- patch packet is missing or not clean;
- PR preflight is not ready;
- evidence packet reports critical gaps.

## Expected Flow

1. Human approves the promotion window.
2. Open a temporary CT165 env window with the runtime gates above.
3. Create one manual AgentRun for ERP WorkItem `KKm2D9oJgUu4`.
4. Execute a real agent profile with max concurrency `1`.
5. Collect logs, heartbeat, session result and patch packet.
6. Restore production default-off immediately after execution.
7. If the patch is clean, create PR proposal preview and preflight.
8. Only after human approval, open the ERP PR via the existing governed PR
   writeback executor.
9. Do not auto-merge or deploy.

## Rollback

- cancel AgentRun if still active;
- quarantine workspace if dirty or suspicious;
- reject/cancel ExternalActionProposal if PR writeback should not proceed;
- delete remote branch only after separate explicit human approval;
- keep session result and evidence packet as durable audit trail.

