# Company Brain Operating Cadence Runbook

Atualizado em 2026-05-06 BRT.

## Objetivo

Operating Cadence v0 transforma watchers read-only em pulso operacional diario sem criar scheduler paralelo e sem instalar cron/systemd neste corte.

O corte usa:

- `Watcher.triggerType`, `Watcher.schedule`, `Watcher.nextRunAt`;
- `WatcherRun.triggerRef=schedule://...`;
- provenance `createdFrom=watcher:*:scheduled_run`;
- API `/api/company-brain/operating-cadence`;
- API `/api/company-brain/operating-cadence/run`;
- MCP `get_company_brain_operating_cadence`;
- MCP `run_company_brain_operating_cadence`.

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

Aceite minimo:

- `scheduledWatcherCount >= 2`;
- `activeScheduledWatcherCount >= 2`;
- `staleCadenceCount = 0`;
- `dueCadenceCount = 0`;
- cada run agendado tem `triggerRef` iniciando com `schedule://`;
- briefing inclui secao `operating_cadence`;
- Source Health nao mostra `watcher_cadence_stale` para os sources cobertos.

## Producao

Este corte nao instala timer de producao.

Quando for aprovado usar o Schedule Manager existente, o comando do timer deve chamar apenas o endpoint de cadence runner ou MCP equivalente. Nao criar scheduler paralelo no Company Brain e nao instalar cron/systemd fora do fluxo aprovado.

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
