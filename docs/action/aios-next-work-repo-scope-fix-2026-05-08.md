# AIOS Next Work Repo Scope Fix

Date: 2026-05-08

## Problem

After syncing ERP issues into Company Brain, `GET /api/company-brain/next-work`
with `repo=antonio-mello-ai/crewdock` still considered WorkItems from
`antonio-mello-ai/erp-desmanches`.

Observed bad behavior:

- crewdock control milestone had open issues `#156` to `#158`;
- ERP WorkItems `#108`, `#109` and `#99` were also active;
- `next-work?repo=antonio-mello-ai/crewdock` could recommend ERP `#99`
  instead of the next AIOS control issue.

That mixes the AIOS control queue with the target project queue and makes
multi-project operation unsafe.

## Fix

`buildNextWork` now accepts an optional repo scope. When a repo is provided,
it only considers GitHub WorkItems whose `externalId` starts with
`<repo>#`.

Applied to:

- `GET /api/company-brain/next-work?repo=<owner/name>`

Unscoped surfaces still use the existing global behavior.

## Expected Behavior

- `next-work?repo=antonio-mello-ai/crewdock` should recommend the next AIOS
  control issue.
- `next-work?repo=antonio-mello-ai/erp-desmanches` should recommend the next
  ERP project WorkItem.
- Operating Snapshot keeps the global view until a separate product decision
  adds a target selector.

## Validation

- `git diff --check`
- `npx turbo build --filter=@aios/daemon --force`
- production smoke after deploy for both repo-scoped URLs.
