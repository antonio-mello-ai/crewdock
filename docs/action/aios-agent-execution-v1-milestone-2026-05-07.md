# AIOS Agent Execution v1 Milestone - 2026-05-07

## Context

`AIOS Execution Loop v0` was completed in one continuous execution run:

- `#29` Symphony compatibility map;
- `#30` Session Result Intake;
- `#31` Company Operating Map v0;
- `#37` Company Command Router v0;
- `#38` Area Blueprint Registry v0;
- `#39` Goal-to-Execution Superoptimizer v0;
- `#40` Agent Run Evaluation Loop v0.

The next step should not be a loose backlog. It should turn the v0 product
surface into an execution substrate that can eventually support "press a button
and let the agent consume the queue" without skipping safety gates.

## New Milestone

GitHub milestone:

- `AIOS Agent Execution v1`
- number: `4`
- purpose: AgentRun schema, workflow loading, workspace isolation, manual
  dry-run orchestration, result UI, registry-driven map and durable
  evaluation-to-improvement.

## Issues

| Issue | Title | Purpose |
| --- | --- | --- |
| `#48` | `AIOS-RUN-01: AgentRun schema and lifecycle v1` | Canonical AgentRun object and lifecycle without launching a process. |
| `#49` | `AIOS-RUN-02: WorkflowLoader and WORKFLOW.md skeleton` | Load and validate the Symphony-compatible workflow contract. |
| `#50` | `AIOS-RUN-03: Workspace manager and git worktree safety` | Prepare isolated worktrees with safety invariants. |
| `#51` | `AIOS-RUN-04: Manual AgentRun dry-run orchestrator` | Prove queue/lifecycle/retry in dry-run/noop mode. |
| `#52` | `AIOS-RUN-05: Session Result Intake UI` | Human UI for session result submission. |
| `#53` | `AIOS-RUN-06: Operating Map v1 from Area Blueprint Registry` | Make the map registry-driven instead of UI-constant-driven. |
| `#54` | `AIOS-RUN-07: Evaluation-driven ImprovementProposal records` | Persist ImprovementProposal candidates from repeated agent-run failures. |

## Production Sync

CT165 needed authenticated GitHub reads for the GitHub Issues adapter to see the
new internal queue reliably. `GITHUB_TOKEN` was added to
`/home/claude/aios-runtime/.env.prod` using the existing local `gh` token, then
`aios-daemon` was restarted.

Post-sync evidence:

- `issuesSeen=7`;
- `lastIssueNumbers=[54,53,52,51,50,49,48]`;
- `workItemsCreated=7`;
- `Next Work` recommends `#48 AIOS-RUN-01: AgentRun schema and lifecycle v1`;
- `candidatesConsidered=7`.

## Operating Guidance

The implementation window can continue issue-by-issue under the same continuous
mode:

1. consume `Next Work`;
2. branch from `origin/main`;
3. implement within issue scope;
4. validate;
5. open PR with `Closes #NN`;
6. QA/review;
7. merge;
8. deploy only when the cut changes daemon/web behavior needed for dogfood;
9. submit session result;
10. sync Company Brain;
11. move to the next issue.

Stop boundaries remain:

- real automatic agent launch;
- new secret/token/permission beyond the configured GitHub token;
- new paid service;
- external writeback outside existing policy;
- destructive workspace cleanup;
- ambiguity not resolved by issue/docs.
