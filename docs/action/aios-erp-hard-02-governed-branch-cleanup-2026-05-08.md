# AIOS-ERP-HARD-02 Governed branch cleanup

Date: 2026-05-08

## Issue

- GitHub issue: `#166`
- Milestone: `AIOS ERP Pilot Hardening v2`
- Target repo: `antonio-mello-ai/erp-desmanches`
- Candidate branch: `aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq`

## Candidate

The remote branch exists in the ERP repository:

- ref: `refs/heads/aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq`
- sha: `6d77644f6ff97a564e29be1c9f1bd2127699e3d3`
- protected: `false`
- attached PRs: `0`
- merge-base with ERP `main`: none
- ERP `main` at validation time:
  `39a76ce3934cd66afb288450976d140e2a84f1dc`

The branch was created by the failed pre-fix ERP PR attempt for:

- WorkItem: ERP issue `#108`
- proposal: `KEPV7SIpCJmr`
- AgentRun: `bDRnbqzQLjdV`
- branch: `aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq`

Root cause: before commit `162d350`, workspace preparation created the ERP
workspace from the AIOS runtime checkout (`antonio-mello-ai/crewdock`) instead
of cloning/fetching the target repo (`antonio-mello-ai/erp-desmanches`). The
remote branch therefore carries AIOS-runtime history, not ERP history, and
GitHub correctly rejected the PR with `422` because the branch had no history in
common with ERP `main`.

## Risk Class

Risk class: `B`.

Rationale:

- target is a private, Felhen-owned GitHub repository;
- branch is unprotected;
- no PR is attached;
- branch points to a known SHA, so the rollback reference is explicit;
- action is still destructive external mutation, so it requires human approval.

Rollback reference:

```text
6d77644f6ff97a564e29be1c9f1bd2127699e3d3
```

If deletion is approved and later needs to be reverted, recreate the remote ref:

```bash
git push origin 6d77644f6ff97a564e29be1c9f1bd2127699e3d3:refs/heads/aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq
```

## Decision

Recommendation: delete after explicit human approval.

Do not add a branch-delete executor yet.

Reasoning:

- the branch has no useful ERP history and should not remain as active
  operational surface;
- deleting it is low impact but still an external destructive mutation;
- the current writeback policy matrix explicitly keeps delete-class actions out
  of automatic execution;
- this looks like a one-off cleanup from a bug that was already fixed by
  `162d350`, not a recurring workflow that justifies a new executor.

Until the human approves the deletion, the branch should remain tracked as a
cleanup candidate and should not be used for a PR, AgentRun, or promotion
decision.

## Approved Manual Command

Only run this after explicit human approval:

```bash
git push https://github.com/antonio-mello-ai/erp-desmanches.git --delete aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq
```

Post-delete validation:

```bash
git ls-remote --heads https://github.com/antonio-mello-ai/erp-desmanches.git aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq
gh pr list --repo antonio-mello-ai/erp-desmanches --head aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq --state all
```

Expected result after deletion:

- `git ls-remote` returns no matching ref;
- `gh pr list` remains `[]`.

## Validation

Read-only validation performed:

- `git ls-remote --heads` confirmed the branch exists at
  `6d77644f6ff97a564e29be1c9f1bd2127699e3d3`;
- GitHub branch API confirmed `protected=false`;
- `gh pr list --head ... --state all` returned `[]`;
- temporary clone confirmed no merge-base between branch and ERP `main`;
- no branch deletion was executed.

## AIOS Tracking

This candidate should be mirrored into Company Brain as artifact type
`git_branch_cleanup_candidate` with:

- `repo=antonio-mello-ai/erp-desmanches`;
- `branch=aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq`;
- `sha=6d77644f6ff97a564e29be1c9f1bd2127699e3d3`;
- `riskClass=B`;
- `recommendedAction=delete_after_human_approval`;
- `executionPolicy=manual_human_approval_only`;
- `rollbackRef=6d77644f6ff97a564e29be1c9f1bd2127699e3d3`.
