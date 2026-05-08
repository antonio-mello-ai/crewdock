# AIOS-RUN-38: Semantic AIOS-authored PR Dogfood Pack v7

Date: 2026-05-08

Issue: `#119`

Branch: `aios-run-38-semantic-pr-dogfood`

## Scope

Prove that the controlled auto-dispatch -> AgentRun -> patch packet ->
ExternalActionProposal -> GitHub PR chain can produce a small semantic change,
not only marker-only branches.

The dogfood stayed inside `antonio-mello-ai/crewdock` and kept the existing
governance boundaries:

- no auto-merge;
- no deploy from the AgentRun;
- no customer repo;
- no new secret or paid service;
- GitHub mutation only after an approved `ExternalActionProposal`;
- production auto-dispatch remained default-off.

## Implementation

- Added runner profile `dogfood-semantic-doc-change`.
  - The profile writes and commits one low-risk docs file:
    `docs/action/aios-semantic-dogfood-<workItem>.md`.
  - It is limited to `antonio-mello-ai/crewdock`, areas `development` and
    `platform`, and Risk A.
- Hardened patch packet collection:
  - ignores internal `.aios-run/*` files;
  - includes committed file changes from `git diff --name-status main..HEAD`;
  - keeps changed files de-duplicated;
  - derives validation evidence from the AgentRun and patch packet:
    `runner_exit_zero`, `patch_content`, `git_commit`.
- Patch packet signatures now include validation evidence and a signature
  version, so materially improved evidence produces a new auditable proposal.
- Same-PR iteration body updates now rewrite the PR body with the latest
  proposal evidence while preserving unique previous AIOS proposal markers.
- `WORKFLOW.md` documents the new dogfood profile in the runner registry.

## Dogfood

Local daemon:

```bash
AIOS_DB_PATH=/tmp/aios-run38-smoke.sqlite
AIOS_PORT=43196
AIOS_HOST=127.0.0.1
AIOS_AGENT_WORKSPACE_ENABLED=true
AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_ENABLED=true
AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=echo,true,git,bash
AIOS_AGENT_AUTODISPATCH_ENABLED=true
AIOS_AGENT_AUTODISPATCH_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_AUTODISPATCH_WORKFLOW_ALLOWLIST=development-blueprint-v0
AIOS_AGENT_AUTODISPATCH_AREA_ALLOWLIST=development,platform
AIOS_AGENT_AUTODISPATCH_REQUIRE_RISK_A=true
AIOS_AGENT_AUTODISPATCH_MAX_CONCURRENCY=1
AIOS_AGENT_AUTODISPATCH_COOLDOWN_MS=0
AIOS_AGENT_AUTODISPATCH_PROFILE_ID=dogfood-semantic-doc-change
AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_ENABLED=true
AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_REPO_ALLOWLIST=antonio-mello-ai/crewdock
AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=true
AIOS_AGENT_GITHUB_PR_WRITEBACK_REPO_ALLOWLIST=antonio-mello-ai/crewdock
GITHUB_TOKEN=$(gh auth token)
```

Final successful run:

- Source: `Hjek-bOBsAAV`
- WorkItem: `bqA5AghugOJn`
- Suggestion: `-fbg_WF0-Axi`
- AgentRun: `fJAlfYi8SmPi`
- PR: `#125`
  (`https://github.com/antonio-mello-ai/crewdock/pull/125`)
- Branch: `aios-aios-run-38-dogfood-1778272934-fjalfyi8`
- Semantic file:
  `docs/action/aios-semantic-dogfood-bqA5AghugOJn.md`
- Commit:
  `143229d9f6347afb53b2401689163100dc525c54`
  (`docs: add semantic aios dogfood note`)

Proposal sequence:

- `VGAGWj91EwLc`: opened PR `#125`; patch packet
  `qYUxtigsgNPS`; changed file captured, but validations were empty.
- `NdcRH-AnpCOO`: same-PR update; patch packet
  `FDOqTReVnCys`; validations captured.
- `Ptop2Twbk_vr`: same-PR update; PR body refreshed with validation
  evidence.
- `1VrS7duqMhpF`: final same-PR update; marker history de-duplicated;
  patch packet `kn6hZSKvfl0C`.

Final patch packet:

- changed files: `1`
- diff stat: `1 files / +9 / -0`
- commits: `1`
- validations:
  - `runner_exit_zero=passed`
  - `patch_content=passed`
  - `git_commit=passed`
- final execute: `pr_number=125`, `preflight_ready=true`
- re-execute: `alreadyExecuted=true`

Final GitHub PR state:

- PR `#125` is `OPEN`.
- base: `main`
- head: `aios-aios-run-38-dogfood-1778272934-fjalfyi8`
- files: `1`
- commits: `1`
- AIOS markers present: `4`
- `aios-iteration` marker present: `true`
- validation evidence visible in the PR body: `true`

## Frictions

- Earlier local attempt before this cut failed with AgentRun
  `Tn1BeVBGnQP8` because shell quoting in the profile command caused
  `non-zero exit code 2`. The profile now avoids command-substitution
  backticks and uses safe `printf "%s"` forms.
- A first resumed WorkItem used label `no-auto-merge`, which tripped the
  auto-dispatch destructive-label heuristic because it contains token
  `merge`. The successful WorkItem used `human-review-required` instead.
- The first successful PR proposal had a real file/commit but empty
  validations. This revealed that patch packet validation evidence needed to
  be derived directly from AgentRun/patch state, not only optional structured
  session-result metadata.

## Production Default-off Evidence

Remote Operating Snapshot with CF service token:

- `overallStatus=healthy`
- `autoDispatchPolicy.config.enabled=false`
- `autoDispatchPolicy.eligibilityPreview.decision=blocked_default_off`
- cards: AIOS Briefing ready, Operating Cadence healthy, Gate Closure clear,
  Source Health healthy, Daily Agent Handoff ready.

## Validation

- `npx turbo build --filter=@aios/shared --filter=@aios/daemon`
- dogfood local through Operating Cadence and auto-dispatch chain
- approved `github_pr_create` proposals through governance API
- GitHub PR writeback preflight with push probe
- same-PR update executor with idempotent re-execute
- `gh pr view 125` confirmed open PR, one file, one commit, marker history and
  visible validation evidence
- `git diff --check`
- `npx turbo build`
- local daemon stopped; port `43196` had no listener after dogfood

## Merge and Deploy

- Implementation PR: `#126`
- Merge commit: `ca30b8c`
- Issue `#119`: closed
- CT165 fast-forwarded to `ca30b8c`
- CT165 build:
  `npx turbo build --filter=@aios/daemon --filter=@aios/mcp-server --force`
- `aios-daemon`: `active`
- `GET https://api.felhen.ai/api/health` -> 200
- Runner profile smoke on CT165:
  `dogfood-semantic-doc-change` is present; production evaluation is
  unavailable with `profile_command_not_allowlisted`, which matches the
  default-off/allowlist boundary for production.
- Remote Operating Snapshot with CF service token:
  `overallStatus=healthy`, `autoDispatchPolicy.config.enabled=false`,
  `eligibilityPreview.decision=blocked_default_off`.
- Production session_result submitted for WorkItem `NYAVBMwfBPWh`:
  artifact `dpqkn62kFi_E`, `prLinkRecorded=true`,
  `guidanceItemsCreated=2`.
- WorkItem `NYAVBMwfBPWh` marked `done` through the audited internal status
  endpoint; status artifact `-ocsZGlNGVBm`.

## Boundaries

- PR `#125` is intentionally left open for human review.
- No merge was attempted.
- No deploy was attempted from the AgentRun.
- No customer repo was touched.
- No broad multi-issue auto-dispatch was enabled.
