# AIOS-PILOT-05 Next Target Decision

Date: 2026-05-08
Issue: `#141`
Milestone: `AIOS First Internal Pilot v1`

## Decision

Next internal pilot target: **ERP Desmanches**.

Decision record:

- id: `VPM0j_Ygp9va`
- title: `Second internal AIOS pilot target: ERP Desmanches`
- status: `accepted`
- source artifacts:
  - `fA-89I2JRcaC` — first supervised AgentRun session result
  - `-bG8gz07f6ZV` — clean rebased patch packet
  - `Xb2kcaEFlk2p` — GitHub PR writeback preflight
  - `Apby2Blmg6Lr` — PR `#149` review intake artifact
  - `OCxBFtI5IGxs` — AIOS-PILOT-04 session result

## Evidence Packet

AIOS self-pilot now proves the minimum internal loop:

1. Pending AIOS-authored PRs were reviewed and closed (`#137`).
2. Runner/workspace gates were opened and restored in a controlled CT165 window
   (`#138`).
3. A real supervised AgentRun ran on AIOS itself (`#139`):
   - AgentRun `EkBKGo5bw2Uu`;
   - exit code `0`;
   - real git worktree;
   - session result `fA-89I2JRcaC`;
   - patch packet evidence.
4. The AgentRun patch became a governed PR proposal and GitHub PR (`#140`):
   - stale proposal `ejPNK9QR3SMk` rejected after base drift;
   - clean proposal `1KkrgaOa9-C7` approved;
   - preflight `Xb2kcaEFlk2p` ready with pushProbe passed;
   - PR `#149` opened and left for human review;
   - review artifact `Apby2Blmg6Lr`;
   - default-off restored.

Open residual from the AIOS self-pilot:

- PR `#149` remains open and `awaiting_human_review`.

This residual does not block choosing the next target, but it must remain a
stop-condition signal: do not broaden auto-dispatch or auto-merge/deploy until
PR review behavior is explicitly accepted.

## Candidate Comparison

### ERP Desmanches — Selected

Repo:

- GitHub: `antonio-mello-ai/erp-desmanches`
- Visibility: private
- Default branch: `main`
- Local checkout: `/Users/antoniomello/felhencloud/projetos/erp-desmanches`
- Local status at decision time: `main...origin/main`, clean

Why selected:

- It is an internal/private repo with lower blast radius than Pulso.
- It already has ERP refactor momentum and prior AIOS dogfood context.
- It tests real product work without starting from another AIOS-only loop.
- It can use GitHub Issues/PRs as the transparent human-agent coordination
  surface.
- It does not require customer marketplace credentials for the first bounded
  pilot.

### Pulso — Deferred

Why not next:

- Higher customer/data risk.
- Marketplace connectors and production account state make early autonomous
  execution riskier.
- Better target after the ERP target proves repo/worktree/PR review boundaries
  on a private internal project.

### Another AIOS-only iteration — Deferred

Why not next:

- The self-pilot already reached supervised execution, governed PR writeback and
  review intake.
- The useful next learning is cross-project operation, not another core-only
  exercise.

## Required Boundaries For #142

Register ERP as a bounded PilotTarget before any real AgentRun:

- repo allowlist: `antonio-mello-ai/erp-desmanches`
- workspace allowlist: `antonio-mello-ai/erp-desmanches`
- area: `development`
- risk ceiling: start at `A`; require explicit approval before Risk `B`
- allowed profiles at first: `dogfood-semantic-doc-change` or other no-secret
  profile; real Claude/Codex profile remains blocked until auth is explicitly
  approved
- command allowlist: minimal, no deploy commands
- PR writeback: disabled by default; allow only `github_pr_create` after
  proposal approval/preflight
- auto-dispatch: disabled for first target registration
- no auto-merge
- no deploy
- no production ERP database writes
- no customer data export/import
- no billing, permissions, email, notification-read or marketplace mutation

## Required Connectors And Secrets

Required for target registration:

- GitHub repo metadata/issues/PR/CI via existing GitHub access.
- Local/CT165 git worktree preparation.
- Company Brain source/work item sync.

Not required for first ERP pilot target registration:

- Linear.
- Slack writeback.
- ERP production database credentials.
- Marketplace API tokens.
- Anthropic/OpenAI real-agent API key.
- Deploy credentials.

## Stop Conditions

Stop before real execution if:

- PR `#149` review reveals a problem in the AIOS-authored PR loop.
- ERP repo/workspace allowlist is not exact.
- The runner asks for secrets outside the target boundary.
- The work item requires production DB, marketplace API, billing, permissions,
  deploy or customer-impacting mutation.
- Patch packet includes unrelated files or stale base drift.
- PR proposal preflight is not `ready`.

## Next

`#142` should register ERP as the second PilotTarget with these boundaries and
readiness checks. It must not launch a real AgentRun.
