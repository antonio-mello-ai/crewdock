# AIOS First-Project Operating Runbook

Date: 2026-05-08
Scope: first supervised internal project pilot for AIOS Agent Execution.

This runbook is the operator contract for using AIOS on the first internal
project. It exists so a new agent session can operate from durable repo state
instead of chat history.

## Pilot Boundary

Initial target:

- Repo: `antonio-mello-ai/crewdock`
- Area: `development`
- Risk ceiling: `B`
- Human owner: `Antonio`
- Customer repos: blocked
- Broad multi-issue autonomy: blocked
- Auto-merge, deploy, close/reopen, permissions and billing actions: blocked

Allowed actions for the first pilot:

- read Company Brain state;
- sync GitHub Issues/PR review evidence read-only;
- prepare a per-run workspace for an approved `AgentRun`;
- run one supervised agent session after actor/rationale and policy gates pass;
- collect patch/validation packet;
- create or update a GitHub PR only through an approved
  `ExternalActionProposal` and the existing writeback policy;
- ingest human review of AIOS-authored PRs as evidence/signal;
- submit `session_result`;
- reconcile WorkItem status and Next Work.

## Safe Startup

1. Open the operating surface:

   `https://ai.felhen.ai/company-brain/operating`

2. Open the execution console:

   `https://ai.felhen.ai/company-brain/agent-runs`

3. Check first-project readiness:

   `GET /api/company-brain/first-project-readiness?repo=antonio-mello-ai/crewdock&area=development&riskClass=B`

4. Confirm these surfaces are linked and current:

   - `/api/company-brain/operating-snapshot`
   - `/api/company-brain/runner-profile-readiness?repo=antonio-mello-ai/crewdock&area=development&riskClass=B`
   - `/api/company-brain/pilot-targets?repo=antonio-mello-ai/crewdock&status=all`
   - `/api/company-brain/aios-pr-review-intake`

5. If the operating snapshot is not healthy, run Operating Cadence first and
   review the attention card before launching any agent.

6. If AIOS-authored PR review intake has pending or changes-requested PRs,
   review them before widening the pilot.

7. Choose work from Next Work or the active milestone. Do not pick a project
   from chat memory alone.

8. Use launcher preview before launch. Real launch requires:

   - `actor`;
   - `rationale`;
   - active pilot target;
   - ready runner profile;
   - repo/workspace/command allowlists;
   - policy gates passing.

9. After the run, collect patch packet, create/reuse PR proposal, submit
   `session_result`, sync GitHub issues/PR review evidence, then mark the
   WorkItem done only if the acceptance criteria and validation evidence are
   present.

## Env Gates

Production should remain default-off unless a supervised pilot window is
explicitly open.

Required gates for real execution:

- `AIOS_AGENT_RUNNER_ENABLED=true`
- `AIOS_AGENT_WORKSPACE_ENABLED=true`
- `AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock`
- `AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock`
- `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST=<reviewed commands>`
- `AIOS_AGENT_RUNNER_PROFILE_CLAUDE_CODE_ENABLED=true` or
  `AIOS_AGENT_RUNNER_PROFILE_CODEX_CLI_ENABLED=true`

Optional gates for stronger automation, not required for the first pilot:

- `AIOS_AGENT_AUTODISPATCH_ENABLED=true`
- `AIOS_AGENT_AUTODISPATCH_REPO_ALLOWLIST=antonio-mello-ai/crewdock`
- `AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_ENABLED=true`
- `AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED=true`
- `AIOS_AGENT_GITHUB_PR_WRITEBACK_REPO_ALLOWLIST=antonio-mello-ai/crewdock`
- `AIOS_AGENT_RUNNER_ALLOW_GITHUB_TOKEN=true`

Default-off evidence must stay visible on `/company-brain/agent-runs` and
`/api/company-brain/first-project-readiness`.

## Kill Switches

Use these when a run behaves unexpectedly, a PR proposal points to the wrong
target, a workspace crosses boundaries, or the operator cannot explain the next
mutation.

### Disable all runner/writeback gates on CT165

```bash
ssh proxmox "pct exec 165 -- bash -lc '
cd /home/claude/aios-runtime
cp .env.prod .env.prod.before-aios-kill-\$(date +%Y%m%d%H%M%S)
for key in \
  AIOS_AGENT_RUNNER_ENABLED \
  AIOS_AGENT_WORKSPACE_ENABLED \
  AIOS_AGENT_AUTODISPATCH_ENABLED \
  AIOS_AGENT_AUTODISPATCH_PR_PROPOSAL_ENABLED \
  AIOS_AGENT_GITHUB_PR_WRITEBACK_ENABLED \
  AIOS_AGENT_RUNNER_ALLOW_GITHUB_TOKEN \
  AIOS_AGENT_RUNNER_PROFILE_CLAUDE_CODE_ENABLED \
  AIOS_AGENT_RUNNER_PROFILE_CODEX_CLI_ENABLED
do
  if grep -q \"^\${key}=\" .env.prod; then
    sed -i \"s/^\${key}=.*/\${key}=false/\" .env.prod
  else
    printf \"\\n%s=false\\n\" \"\${key}\" >> .env.prod
  fi
done
systemctl restart aios-daemon
systemctl is-active aios-daemon
'"
```

### Cancel an active AgentRun

```bash
curl -X POST "$AIOS_DAEMON_URL/api/company-brain/agent-runs/$AGENT_RUN_ID/cancel" \
  -H "content-type: application/json" \
  -d '{"actor":"antonio","rationale":"operator kill switch"}'
```

### Quarantine a workspace

Use workspace quarantine before destructive cleanup. Only remove a workspace
when the cleanup preview is clean and the confirmation token equals the exact
workspace path.

```bash
curl -X POST "$AIOS_DAEMON_URL/api/company-brain/agent-runs/$AGENT_RUN_ID/workspace/quarantine" \
  -H "content-type: application/json" \
  -d '{"actor":"antonio","rationale":"operator kill switch"}'
```

## Stop Conditions

Stop and document the state if any of these happen:

- first-project readiness is `blocked`;
- operating snapshot is `critical` or `error`;
- source health reports stale/error on the active project source;
- a runner asks for a secret or repo not listed in the pilot target;
- a patch touches files outside the intended project boundary;
- a PR proposal targets the wrong repo/base branch;
- a process is running without a matching `AgentRun`;
- a generated plan asks to merge, deploy, close/reopen, change permissions,
  change billing, send DMs, or email externally;
- the operator cannot explain the next mutation from the Company Brain records.

## Closure Checklist

Before the session is considered closed:

- `git diff --check` passed;
- relevant build/test command passed;
- patch packet exists when code changed;
- PR proposal/PR URL exists when GitHub writeback was used;
- `session_result` submitted;
- WorkItem status reconciled;
- GitHub Issues/PR review sync rerun read-only;
- `Next Work` reflects the next open item or empty state;
- docs/handoff updated for any material state change.
