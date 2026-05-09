# AIOS-ERP-04 workspace source repo fix

Date: 2026-05-08

## Context

The first ERP PR proposal attempt for WorkItem `cRBiAu_EMtgU` failed at PR
creation time with GitHub API `422`: the pushed branch had no history in common
with `main`.

Investigation showed the workspace manager was deriving the workspace path from
the target repo name, but `git worktree add` was still executed from the daemon
checkout. On CT165 the daemon checkout is `antonio-mello-ai/crewdock`, so the
ERP-named workspace was actually a `crewdock` worktree.

## Fix

- `workspace/prepare` now resolves a source repository for the requested
  `owner/name`.
- If the daemon checkout already matches the requested repo, it fetches there.
- If the target repo differs from the daemon checkout, it clones/fetches a
  repo cache under `AIOS_AGENT_REPO_CACHE_ROOT` or `~/.aios/repo-cache`.
- `git worktree add` now runs with `git -C <sourceRepoPath> ...`, so external
  project worktrees inherit the target repo history.
- `workspaceListed()` now asks the workspace checkout itself for the worktree
  list when `.git` exists, instead of always asking the daemon checkout.

## Validation

- `git diff --check` passed.
- `npx turbo build --filter=@aios/daemon --force` passed.
- Local smoke used isolated SQLite, repo cache and workspace env:
  - DB: `/tmp/aios-workspace-source-smoke.sqlite`
  - port: `43232`
  - repo cache: `/tmp/aios-repo-cache-source-smoke`
  - target repo: `antonio-mello-ai/erp-desmanches`
- The smoke created an AgentRun and prepared a real workspace.
- Prepared workspace remote:
  `https://github.com/antonio-mello-ai/erp-desmanches.git`
- The workspace merge-base resolved against ERP `origin/main`:
  `39a76ce3934cd66afb288450976d140e2a84f1dc`

## Residual

The failed first attempt left a remote ERP branch named
`aios-antonio-mello-ai_erp-desmanches_108-bdrnbqzq` pointing to the bad
`crewdock`-based history. It is not attached to a PR. Do not delete it
automatically; branch deletion remains a destructive external mutation and
needs explicit approval.

## Next step

Deploy this fix, then rerun the ERP dogfood AgentRun from a fresh run id and
create a new governed PR proposal. Do not reuse the failed proposal
`KEPV7SIpCJmr`.
