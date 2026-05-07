# Company Brain Operating Cadence Runbook

Atualizado em 2026-05-07 BRT.

## Objetivo

Operating Cadence v0 transforma watchers read-only em pulso operacional diario. A partir do Production Operating Loop v0, o proprio daemon pode fazer checks recorrentes e rodar watchers due/stale sem sessao interativa aberta.

O corte usa:

- `Watcher.triggerType`, `Watcher.schedule`, `Watcher.nextRunAt`;
- `WatcherRun.triggerRef=schedule://...`;
- provenance `createdFrom=watcher:*:scheduled_run`;
- API `/api/company-brain/operating-cadence`;
- API `/api/company-brain/operating-cadence/run`;
- API `/api/company-brain/operating-loop`;
- MCP `get_company_brain_operating_cadence`;
- MCP `get_company_brain_operating_loop`;
- MCP `run_company_brain_operating_cadence`.

## Loop interno do daemon

Configurar via `.env.prod` ou variaveis do processo:

```bash
AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED=true
AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS=300000
AIOS_COMPANY_BRAIN_OPERATING_LOOP_INITIAL_DELAY_MS=30000
AIOS_COMPANY_BRAIN_OPERATING_LOOP_SCHEDULE_ID=production:company-brain-operating-loop
AIOS_OPERATING_CADENCE_GITHUB_REPO=antonio-mello-ai/crewdock
```

Comportamento v0:

- o loop roda dentro do daemon existente, sem cron/systemd timer novo;
- cada tick observa `/api/company-brain/operating-cadence` internamente;
- se `watcher-aios-briefing-v0` ou `watcher-github-pr-ci-v0` estiver `due` ou `stale`, o loop chama a mesma logica de `/api/company-brain/operating-cadence/run`;
- apenas watchers com `actionPolicy=observe_only` entram no runner automatico;
- um lock em memoria evita ticks sobrepostos;
- provenance dos runs automaticos usa `triggerSource=schedule`, `scheduleId=production:company-brain-operating-loop` e `triggerRef=schedule://...`;
- o estado do loop aparece em Operating Cadence, Core Readiness, Operating Snapshot e MCP.

## Watchers ativos no v0

1. `watcher-aios-briefing-v0`
   - schedule: `daily 09:00 BRT`
   - output: Artifact `aios_briefing` e Signals opcionais de gaps claros
   - action policy: `observe_only`

2. `watcher-github-pr-ci-v0`
   - schedule: `every 2 hours`
   - output: Artifact `github_pr_ci` quando houver PR observado ou `github_pr_ci_poll` como snapshot de poll sem PR novo
   - action policy: `observe_only`

`watcher-github-notifications-v0` continua manual/poll-on-demand neste corte. Nao marcar notificacoes como lidas.

## Como operar localmente

Rodar o daemon em DB temporario:

```bash
AIOS_DB_PATH=/tmp/aios-runtime-operating-cadence.sqlite \
AIOS_PORT=43166 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
NODE_ENV=development \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED=true \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS=1000 \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_INITIAL_DELAY_MS=100 \
node packages/daemon/dist/index.js
```

Disparar o ciclo:

```bash
curl -sS -X POST http://127.0.0.1:43166/api/company-brain/operating-cadence/run \
  -H 'content-type: application/json' \
  --data '{
    "scheduleId": "daily:company-brain-operating-cadence",
    "githubPrCi": {
      "repo": "antonio-mello-ai/crewdock",
      "state": "open",
      "limit": 5,
      "sourceName": "CrewDock GitHub PR/CI scheduled cadence",
      "createSignals": true
    }
  }'
```

Repo default: `AIOS_OPERATING_CADENCE_GITHUB_REPO` quando definido; fallback `antonio-mello-ai/crewdock`. Para repo privado, garantir `GITHUB_TOKEN`/`GH_TOKEN` com leitura antes do disparo.

## Evidencia esperada

Consultar:

```bash
curl -sS http://127.0.0.1:43166/api/company-brain/summary | jq '{
  loop: .data.operatingCadence.operatingLoop,
  cadence: .data.operatingCadence.stats,
  core: .data.coreReadiness.stats,
  sourceHealth: .data.sourceHealthReport.stats,
  scheduledRunRefs: [
    .data.watcherRuns[]
    | select(.triggerRef | startswith("schedule://"))
    | { watcherId, triggerRef, createdFrom: .provenance.createdFrom }
  ]
}'
```

Resposta direta do runner:

```bash
curl -sS -X POST http://127.0.0.1:43166/api/company-brain/operating-cadence/run \
  -H 'content-type: application/json' \
  --data '{"mode":"all"}' | jq '{
    scheduleId: .data.scheduleId,
    scheduledAt: .data.scheduledAt,
    artifactsCreated: .data.artifactsCreated,
    signalsCreated: .data.signalsCreated,
    watcherRunsCreated: .data.watcherRunsCreated,
    runs: [
      .data.runs[]
      | {
          watcherId,
          status,
          watcherRunId,
          artifactId,
          triggerRef,
          artifactsCreated,
          signalsCreated,
          errorSummary
        }
    ]
  }'
```

Campos canonicos do schema v0:

- `operatingCadence.operatingLoop.enabled/status/lastTickAt/lastRunAt/nextTickAt`;
- `runs[].watcherRunId`;
- `runs[].artifactId` quando o watcher criar pelo menos um artifact;
- `runs[].artifactsCreated`;
- `runs[].signalsCreated`;
- `artifactsCreated`;
- `signalsCreated`;
- `watcherRunsCreated`.

Aceite minimo:

- `scheduledWatcherCount >= 2`;
- `activeScheduledWatcherCount >= 2`;
- `staleCadenceCount = 0`;
- `dueCadenceCount = 0`;
- `operatingLoop.enabled = true`;
- `operatingLoop.status = "idle"` apos run bem-sucedido;
- `operatingLoop.lastTickAt` e `operatingLoop.lastRunAt` preenchidos;
- cada run agendado tem `triggerRef` iniciando com `schedule://`;
- briefing inclui secao `operating_cadence`;
- Source Health nao mostra `watcher_cadence_stale` para os sources cobertos.

## Producao

No CT165, manter o loop habilitado no `.env.prod` e reiniciar `aios-daemon`. Validacao minima:

```bash
curl -sS https://api.felhen.ai/api/company-brain/operating-cadence
curl -sS https://api.felhen.ai/api/company-brain/core-readiness
curl -sS https://api.felhen.ai/api/company-brain/operating-snapshot
```

O aceite operacional e `operatingLoop.enabled=true`, `operatingLoop.status=idle`, `staleCadenceCount=0`, `dueCadenceCount=0` e Core Readiness sem gap `stale_or_due_watcher_cadence`.

## Fronteiras

Permitido:

- leitura GitHub PR/CI;
- artifact interno;
- signal interno quando CI pending/failure/error;
- briefing interno;
- source health/adoption/core readiness derivados.

Proibido neste runbook:

- writeback GitHub ou Slack;
- label/assign/status/check real novo;
- notification read;
- close/reopen/merge/deploy/delete;
- Slack top-level/DM/edit/delete;
- instalar scheduler externo sem aprovacao.
