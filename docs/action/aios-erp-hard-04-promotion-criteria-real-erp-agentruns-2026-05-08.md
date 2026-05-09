# AIOS-ERP-HARD-04 Promotion criteria for real ERP AgentRuns

Date: 2026-05-08

## Issue

- GitHub issue: `#168`
- Milestone: `AIOS ERP Pilot Hardening v2`
- Checklist: `docs/aios-erp-real-agentrun-promotion-checklist.md`
- Decision: `uKzF6xKwwPV2`

## Decision

Verdict: prepare the first real ERP AgentRun, but do not launch it yet.

The first candidate is selected:

- ERP issue: `#99 DEMO-DATA-01 — Recriar seed/demo canonico para v0.31+`
- Company Brain WorkItem: `KKm2D9oJgUu4`
- URL: `https://github.com/antonio-mello-ai/erp-desmanches/issues/99`

Launch remains deferred until the human explicitly approves promotion from
dogfood/docs-only to real implementation AgentRun.

Company Brain Decision `uKzF6xKwwPV2` records the same decision with source
artifacts `fiSgAWeEcRjx`, `Oabpo4efW350` and `lKxJfE4lPEhO`.

## Evidence Reviewed

Pilot target and ERP issue queue:

- ERP target registered and used successfully in dogfood.
- ERP Issues source is healthy.
- Company Brain `next-work` currently selects ERP issue `#99` as the first open
  ERP WorkItem by FIFO among five candidates.

Dogfood and PR path:

- corrected ERP AgentRun `R0oAMnjT_LRn` completed;
- patch packet `IdVCz3a5xRtZ` was clean;
- proposal `rBGhT13JpqFZ` opened ERP PR `#111`;
- re-execute was idempotent.

Evidence packet:

- proposal `rBGhT13JpqFZ`;
- actionType `github_pr_create`;
- executionStatus `executed`;
- externalUrl `https://github.com/antonio-mello-ai/erp-desmanches/pull/111`;
- critical gaps `[]`;
- remaining warnings: `missing_guidance_link`,
  `missing_signal_or_finding_link`.

Cleanup:

- bad pre-fix branch is tracked as cleanup candidate artifact
  `Oabpo4efW350`;
- no branch deletion was executed.

PR review:

- PR `#111` is `OPEN`, `MERGEABLE`, non-draft;
- CI is green;
- review intake artifact `fiSgAWeEcRjx`;
- review signal `HDFwwBOcRuXZ`;
- Decision `L_0A82_ZT052` keeps the PR open for human-controlled merge.

Production default-off:

- CT165 daemon is active;
- grep of runner/workspace/autodispatch/PR-writeback env gates in
  `/home/claude/aios-runtime/.env.prod` returned no enabled lines;
- real agent profiles remain blocked unless explicitly enabled.

## Required Human Approval

Before the first real implementation AgentRun, the human must explicitly approve:

1. using ERP issue `#99` as the first real candidate;
2. whether PR `#111` may remain open while the next run starts, or must be
   merged first;
3. the real runner profile to use (`claude-code-real` or `codex-cli-real`);
4. the temporary CT165 env window;
5. the stop conditions in
   `docs/aios-erp-real-agentrun-promotion-checklist.md`.

## Runtime Gates

Launch window must set only scoped gates:

- `AIOS_AGENT_RUNNER_ENABLED=true`
- `AIOS_AGENT_WORKSPACE_ENABLED=true`
- `AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/erp-desmanches`
- `AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/erp-desmanches`
- `AIOS_AGENT_AUTODISPATCH_ENABLED=false`
- `AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=false`

Profile gate:

- enable exactly one real profile:
  - `AIOS_AGENT_RUNNER_PROFILE_CLAUDE_CODE_ENABLED=true`, or
  - `AIOS_AGENT_RUNNER_PROFILE_CODEX_CLI_ENABLED=true`;
- selected command must be present on CT165 and command-allowlisted;
- do not pass new secrets into the agent.

## Validation Plan

For the first real ERP run:

1. Create one manual AgentRun for WorkItem `KKm2D9oJgUu4`.
2. Execute with max concurrency `1`.
3. Capture logs, heartbeat and terminal event.
4. Submit session result.
5. Collect patch packet and validation packet.
6. Restore default-off env immediately after execution.
7. If patch is clean, create PR proposal preview and preflight.
8. Open PR only after approval through existing governed PR writeback.
9. Do not auto-merge or deploy.

## Stop Conditions

Stop before PR proposal if:

- new secrets are required;
- patch touches production DB, marketplace mutation, deploy or permissions;
- tests fail outside a local issue-scoped fix;
- patch packet is missing or dirty;
- workspace cannot be safely quarantined/cleaned;
- preflight or evidence packet shows critical gaps.

## Outcome

Promotion criteria are now defined. The next real run is not launched by this
issue.
