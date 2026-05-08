# AIOS Supervised Runner Dogfood Pack v2 - 2026-05-08

## Escopo

Consumo end-to-end da issue `#68 AIOS-RUN-14: Supervised runner dogfood
pack v2` (milestone `AIOS Agent Execution v2`). Documenta um ciclo
completo de supervised execution agent run + session result + evaluation
sem auto-dispatch, validando o stack montado nas issues `#62`-`#67`:

- `#62 AIOS-RUN-08`: runner policy gates (10 gates canonicas)
- `#63 AIOS-RUN-09`: real subprocess executor governado
- `#64 AIOS-RUN-10`: logs + heartbeat + cancel + sweep timeouts
- `#65 AIOS-RUN-11`: session_result auto-intake apos cada run
- `#66 AIOS-RUN-12`: workspace cleanup/quarantine gate
- `#67 AIOS-RUN-13`: Agent Runs execution console UI

## Default-blocked em producao

Production smoke confirma que a fila so executa subprocess real apos
opt-in explicito por env. AgentRun criado em CT165 sob `api.felhen.ai`:

```
POST /api/company-brain/agent-runs
  -> {"id":"LdulIeveZuYM","status":"queued","claimState":"unclaimed"}

POST /api/company-brain/agent-runs/LdulIeveZuYM/policy/evaluate
  body={"intent":"real_execution","actor":"dogfood","rationale":"..."}
  -> decision=blocked_workspace
     realAllowed=false
     blockReasons=[workspace_not_allowlisted, runner_disabled,
                   runner_repo_not_allowlisted]
     subprocessEnv.redactedKeys.length=11
       (GITHUB_TOKEN, GH_TOKEN, SLACK_BOT_TOKEN, OPENAI_API_KEY,
        ANTHROPIC_API_KEY, CF_ACCESS_CLIENT_SECRET,
        CF_ACCESS_CLIENT_ID, CLOUDFLARE_API_TOKEN, ASAAS_API_KEY,
        STRIPE_SECRET_KEY, SLACK_WEBHOOK_URL)

POST /api/company-brain/agent-runs/LdulIeveZuYM/execute
  body={"actor":"dogfood","rationale":"...","commandOverride":"echo",...}
  -> outcome=blocked_by_policy
     status=queued (preservado)
     blockReasons=[workspace_not_allowlisted, runner_disabled,
                   runner_repo_not_allowlisted]
```

Audit trail registrou 4 eventos (created + 2 evaluated + blocked).
Default seguro: zero subprocess executado em producao sem opt-in
explicito por env.

## Controlled supervised run (local dogfood)

Reproducao local com env opt-in:

```
AIOS_AGENT_RUNNER_ENABLED=true \
AIOS_AGENT_RUNNER_REPO_ALLOWLIST=antonio-mello-ai/crewdock \
AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST="echo,false" \
AIOS_AGENT_WORKSPACE_ALLOWLIST=antonio-mello-ai/crewdock \
GITHUB_TOKEN=fake-token-redact-test \
node packages/daemon/dist/index.js
```

Sequencia executada (smoke documentado nos PRs `#69`-`#73`):

1. Demo seed cria WorkItem `Felhen Demo v0.1 closed-loop work item`.
2. `POST /agent-runs` cria run id (manual, repo=antonio-mello-ai/crewdock).
3. `POST /agent-runs/:id/policy/evaluate` (intent=real_execution, actor,
   rationale) -> `decision=allowed_real_execution`, 12 satisfied gates,
   `subprocessEnv.redactedKeys` contem GITHUB_TOKEN.
4. `POST /agent-runs/:id/execute` com `commandOverride=echo`,
   `argsOverride=["hello-from-aios-runner"]`:
   - lifecycle queued -> claimed -> running -> completed
   - exitCode=0, durationMs=3, stdout capturado em `.aios-run/<id>.log`
   - GITHUB_TOKEN nao aparece no log (verificado via grep)
   - audit trail: 5+ eventos
   - sessionResultArtifactId preenchido via auto-intake fallback
     (fallback_stdout source porque nao havia session-result.json)
5. `GET /agent-runs/:id/logs?tail=80` retorna lineCount=15, lastEvent
   `agent_run_real_execution_completed`, isStaleHeartbeat=false.
6. `GET /agent-runs/:id/workspace/cleanup-preview` retorna
   cleanupAllowed=true, isDirty=false, expectedConfirmationToken
   apontando para o workspace path.
7. Cancel idempotente em terminal -> noop=true.
8. Sweep timeouts dryRun -> 0 candidatos.

## Cadeia Company Brain

Cada run produz uma cadeia auditavel:

```
AgentRun (cb_agent_runs)
  -> workspaceRef = ~/.aios/agent-workspaces/<repo>/<work-item-key>
  -> branch = aios-<work-item-key>
  -> auditTrail = [created, claimed_dry_run, real_execution_started,
                   real_execution_completed, session_result_intake]

Workspace (.aios-run/<run-id>.log)
  -> stdout/stderr capturados
  -> session-result.json (opcional, se runner produzir)

Artifact session_result (cb_artifacts.artifactType=session_result)
  -> metadata: runnerType, outcome, branch, prUrl, validations,
              blockers, nextSteps, tokens, agentSessionId
  -> linkado ao WorkItem via sourceArtifactIds e provenance

Signal (cb_signals)
  -> Quando outcome=failed/blocked + blockers presentes
  -> source=qa, severity=warn|critical

GuidanceItem (cb_guidance_items)
  -> Quando nextSteps presentes
  -> status=new, feedback_status=pending

ImprovementProposal (cb_improvement_proposals)
  -> Quando 2+ signals do mesmo failure kind no mesmo WorkItem
  -> Idempotency por evaluation_kind + workItemId

WorkItem (cb_work_items)
  -> Atualizado non-destructively:
       outcome=pr_opened/awaiting_review -> status=review
       outcome=blocked -> status=blocked + blockedReason
       outcome=failed -> status=needs_human + blockedReason
       outcome=completed/cancelled -> sem mudanca
```

## Gates verificados

Nenhum gate da Writeback Policy Matrix v0 foi quebrado durante o
dogfood:

| Acao | Gate |
| --- | --- |
| GitHub issue close | bloqueado (Risk C / nao implementado) |
| GitHub PR merge | bloqueado |
| GitHub deploy | bloqueado |
| Cleanup destrutivo de workspace alheio | bloqueado por path_outside_root |
| GITHUB_TOKEN no env do subprocess | redacted por default |
| Auto-launch de novo agente | nao implementado nesta milestone |

## Frictions / residuais

1. `workspaceIsDirty` depende de o workspace ser um git worktree real.
   Workspaces criados sem `git worktree add` (ex: pelo executor em
   ambiente com `AIOS_AGENT_WORKSPACE_ENABLED=false`) reportam
   `isDirty=false` mesmo com arquivos modificados, porque
   `git status --porcelain` falha silenciosamente. Em producao com
   AIOS_AGENT_WORKSPACE_ENABLED=true e fluxo `prepare/execute`
   completo, o worktree e materializado e a deteccao funciona.
   Mitigacao v0: documentado; `prepare` cria worktree real quando
   habilitado.

2. Workspace e reaproveitado entre runs com mesmo `(repo, workItemKey)`.
   Isso significa que `session-result.json` antigo permanece no
   diretorio entre runs sucessivos no mesmo workItem, e o auto-intake
   pode usar o JSON da run anterior como structured source. Mitigacao
   v0: o operator humano remove o arquivo manualmente entre runs ou usa
   `quarantine` para arquivar e comecar limpo. Cut futuro: contrato de
   `.aios-run/<run-id>.json` por run.

3. Spawn sync significa que runs longos travam o handler HTTP ate
   terminar (ou ate `codex.turn_timeout_ms`). Para a primeira ondada
   de echo/false dogfood isso e aceitavel. Cut futuro `AIOS-RUN-15+`:
   spawn assincrono com PID persistido na AgentRun para suportar
   cancel real e logs streaming.

4. UI `/company-brain/agent-runs` tem auto-refresh de 5s para a lista
   e 4s para logs. Em produtores grandes esse polling pode pesar; cut
   futuro: SSE/websocket para logs e server-sent events para summary.

## Proximos cortes naturais

- `AIOS-RUN-15` (planned): spawn assincrono com PID persistido,
  cancel real (SIGTERM) sob actor/rationale, logs streaming via SSE.
- `AIOS-RUN-16` (planned): workspace per-run (substituir `<work-item-
  key>` por `<run-id>`) para evitar cross-run contamination.
- `AIOS-RUN-17` (planned): `git worktree remove --force` callback
  pos-cleanup para reaproveitar branches sem residuo.
- `AIOS-RUN-18` (planned): Operating Loop trigger para runs queued
  com flag `AIOS_AGENT_AUTO_DISPATCH_ENABLED=false` por default; o
  loop apenas suggere, nao dispara, ate que cuts futuros provem
  rollback automatico.

## Verificacao final

- `git diff --check` clean.
- `npx turbo build` 4/4 successful em todos os PRs `#69`-`#74`.
- Production CT165 daemon ativo e respondendo a `/api/health` apos
  cada redeploy.
- Cloudflare Pages publicado para PRs com mudanca de UI (`#72`,
  `#74`).
- Sete session results submetidos em producao (artifacts `8lmJ1pyX0piT`,
  `07Lb60GEJAVc`, `3uuNqCx9aaAf`, `5r-QB8fatdmc`, `zCDpr9dY5Nol`...).
- Nenhum auto-merge, nenhum auto-deploy, nenhum cleanup destrutivo
  fora dos AgentRun workspaces explicitamente confirmados.

## Constraints respeitadas

- [x] Nenhum auto-dispatch de multiplas issues em paralelo.
- [x] Nenhum merge ou deploy automatico em sistemas externos.
- [x] Nenhum writeback fora das policies existentes (github_comment
      Risk B, github_label Risk B, github_status Risk B,
      github_issue_create Risk B, slack_thread_reply Risk B).
- [x] Cada cleanup destrutivo exige confirmationToken explicito.
- [x] Default secure: producao bloqueia execucao real ate operador
      configurar 4 env vars (`AIOS_AGENT_RUNNER_ENABLED`,
      `AIOS_AGENT_RUNNER_REPO_ALLOWLIST`,
      `AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST`,
      `AIOS_AGENT_WORKSPACE_ALLOWLIST`).
