# AIOS Company Operating Map Alignment - 2026-05-07

## Context

The current AIOS core is operational, but the daily UI still risks reading like
an admin/control panel. The external Cofounder benchmark makes the missing
product metaphor clear: users should see work routed through company areas and
agents, not just lists of artifacts, watchers and writeback proposals.

The Cofounder CEO transcript adds a strategic nuance: their startup focus is a
market wedge, not the whole ambition. The long-term shape is a coordinator for
high-level goals, departments and agents managing agents. For AIOS, that means
the roadmap cannot stop at issue -> agent -> PR. It needs goal -> area ->
workflow -> agent runs -> evaluation -> learning.

Corp source of truth:

- `/Users/antoniomello/felhencloud/corp/docs/action/aios-product-roadmap.md`
- `/Users/antoniomello/felhencloud/corp/docs/action/aios-cofounder-product-surface-alignment-2026-05-07.md`

## Decision

Keep the execution queue order, but reshape the product surface target:

1. `AIOS-EXEC-03` remains the next engine cut, now explicitly
   Symphony-compatible.
2. `AIOS-EXEC-04` closes the run/result loop back into Company Brain.
3. `AIOS-EXEC-05` is no longer a narrow project pipeline table. It becomes
   **Company Operating Map v0**.
4. Follow-on issues add a command router and area blueprint registry.
5. Additional follow-ons add goal-to-execution and agent-run evaluation, because
   those are the pieces that turn the map into a superoptimizer rather than a
   status dashboard.

## Company Operating Map v0

The map should make AIOS feel like the operating system of the company:

- center: AIOS / Company Brain;
- areas: Strategy, Development, Marketing, Sales, Operations, Finance, Support
  and Legal/Compliance;
- each area shows WorkItems, agent runs, PR/CI/tracker state, gates, blockers,
  HITL approvals, source health, recent evidence, guidance and handoff;
- project/repo pipeline is a drilldown, not the whole feature;
- Development is the first fully useful area because GitHub Issues, PR/CI and
  Symphony-compatible execution are already in the active dogfood path.

## Follow-on Cuts

### AIOS-EXEC-06 Company Command Router v0

Goal: make the operator able to ask AIOS for work and have it route the request
to the right area, blueprint, WorkItem, agent run or ExternalActionProposal.

Constraints:

- no uncontrolled writeback;
- external mutation still needs the existing policy, preview, HITL and audit
  gates;
- GitHub Issues remains the first work adapter.

### AIOS-EXEC-07 Area Blueprint Registry v0

Goal: make areas/departments configurable enough for the map to expand beyond
Development.

Seed areas:

- Strategy;
- Development;
- Marketing;
- Sales;
- Operations;
- Finance;
- Support;
- Legal/Compliance.

Each area should have owner, default sources, relevant blueprints, agent roles,
gates, current health and readiness state.

### AIOS-EXEC-08 Goal-to-Execution Superoptimizer v0

Goal: turn high-level business outcomes into coordinated execution.

Examples:

- improve retention;
- increase revenue;
- reduce unresolved bugs;
- make launch ready;
- increase qualified design partner conversations.

The output should include target metric, area owners, sources, required
evidence, work item candidates, watchers, agent runs, gates, cadence and
evaluation criteria.

### AIOS-EXEC-09 Agent Run Evaluation Loop v0

Goal: evaluate agents with agents.

The loop should ingest traces, failures, PR/CI, QA reports, blockers and
outcomes, then classify whether failures came from context, tool, policy,
execution, validation or human-decision gaps. Repeated patterns should produce
guidance or `ImprovementProposal` candidates.

## Acceptance Implications

Any implementation of the product surface must answer:

1. What area owns this work?
2. What is running, queued, blocked, stale or waiting for human approval?
3. What evidence proves the state?
4. What agent or human should act next?
5. What policy/gate blocks action?
6. Where does the result return into Company Brain?
7. What high-level goal or metric does this work serve?
8. What did the agent learn, and should that become an improvement proposal?

If a UI change cannot answer these questions, it is likely admin polish rather
than AIOS product progress.
