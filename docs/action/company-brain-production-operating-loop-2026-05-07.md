# Company Brain Production Operating Loop v0 - 2026-05-07

## Objetivo

Fechar o ultimo bloqueio real do ciclo diario: Operating Cadence dependia de
execucao manual/one-off. O corte cria um runner recorrente dentro do daemon
existente para rodar watchers read-only due/stale sem sessao interativa aberta.

Sem Linear, sem executor externo novo, sem writeback, sem secrets novas e sem
permissoes novas.

## Implementacao

- `AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED` habilita/desabilita o loop.
- `AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS` define o intervalo de
  check.
- `AIOS_COMPANY_BRAIN_OPERATING_LOOP_INITIAL_DELAY_MS` define o primeiro tick
  apos boot.
- `AIOS_COMPANY_BRAIN_OPERATING_LOOP_SCHEDULE_ID` define o `scheduleId` dos
  `WatcherRun` automaticos.
- O loop roda dentro do daemon existente e usa a mesma logica de
  `/api/company-brain/operating-cadence/run`.
- O runner automatico so considera:
  - `watcher-aios-briefing-v0`;
  - `watcher-github-pr-ci-v0`;
  - watchers com `actionPolicy=observe_only`;
  - `cadenceStatus=due` ou `cadenceStatus=stale`.
- Lock em memoria evita ticks sobrepostos.
- Provenance dos runs automaticos:
  - `triggerSource=schedule`;
  - `scheduleId=<loop schedule id>`;
  - `triggerRef=schedule://...`.

## Superficies expostas

- `GET /api/company-brain/operating-loop`
- `GET /api/company-brain/operating-cadence`
  - inclui `operatingLoop`
- `GET /api/company-brain/core-readiness`
  - inclui `operatingLoop`
  - stats `operatingLoop*`
- `GET /api/company-brain/operating-snapshot`
  - inclui loop via `operatingCadence.operatingLoop`
  - Operating card mostra loop disabled/error/stale quando aplicavel
- MCP `get_company_brain_operating_loop`
- MCP `get_company_brain_operating_cadence`

## Dogfood local

DB temporario:

```text
/tmp/aios-operating-loop-v0.sqlite
```

Daemon:

```bash
AIOS_DB_PATH=/tmp/aios-operating-loop-v0.sqlite \
AIOS_PORT=43184 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
NODE_ENV=development \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED=true \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS=1000 \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_INITIAL_DELAY_MS=100 \
AIOS_COMPANY_BRAIN_OPERATING_LOOP_SCHEDULE_ID=dogfood:company-brain-operating-loop-v0 \
AIOS_OPERATING_CADENCE_GITHUB_REPO=antonio-mello-ai/crewdock \
node packages/daemon/dist/index.js
```

Resultado apos ticks automaticos:

- `operatingLoop.enabled=true`
- `operatingLoop.status=idle`
- `operatingLoop.lastTickAt` preenchido
- `operatingLoop.lastRunAt` preenchido
- `operatingLoop.runCount=1`
- `operatingLoop.skippedTickCount=11`
- `operatingLoop.lastRun.scheduleId=dogfood:company-brain-operating-loop-v0`
- `watcherRunsCreated=2`
- `artifactsCreated=2`
- `signalsCreated=0`
- `watcher-github-pr-ci-v0`:
  - `status=completed`
  - `watcherRunId=NNic64E8ELko`
  - `artifactId=HPRNv5pBRfAg`
  - `triggerRef=schedule://dogfood%3Acompany-brain-operating-loop-v0/NNic64E8ELko`
- `watcher-aios-briefing-v0`:
  - `status=completed`
  - `watcherRunId=6MFy-2dI_b06`
  - `artifactId=eiioweu-q587`
  - `triggerRef=schedule://dogfood%3Acompany-brain-operating-loop-v0/6MFy-2dI_b06`
- `activeScheduledWatcherCount=2`
- `staleCadenceCount=0`
- `dueCadenceCount=0`
- `errorCadenceCount=0`
- Core Readiness:
  - `dailyUseBlockingGapCount=0`
  - `dailyGaps=[]`
- Operating Snapshot:
  - cadence card `state=healthy`
  - `mainAlert="2 scheduled watchers active."`

## Validacao local

- `git diff --check` passou.
- `npx turbo build` passou.

## Producao

Status: concluido em 2026-05-07.

Commit:

- `d82710b` `feat: add company brain operating loop`

Deploy:

- CT165 fast-forward ate `d82710b`.
- `npx turbo build --filter=@aios/daemon --force` passou no CT165.
- `.env.prod` atualizado com valores nao-secretos:
  - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_ENABLED=true`;
  - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS=300000`;
  - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_INITIAL_DELAY_MS=5000`;
  - `AIOS_COMPANY_BRAIN_OPERATING_LOOP_SCHEDULE_ID=production:company-brain-operating-loop`;
  - `AIOS_OPERATING_CADENCE_GITHUB_REPO=antonio-mello-ai/crewdock`.
- `aios-daemon.service` reiniciado e ativo.
- Cloudflare Pages publicado para a UI atualizada:
  - deploy URL `https://b83e7c9b.crewdock.pages.dev`.

Validacao:

- `GET https://api.felhen.ai/api/health` -> `200`, `{"status":"ok"}`.
- `GET https://api.felhen.ai/api/company-brain/operating-loop` -> `200`.
- `GET https://api.felhen.ai/api/company-brain/operating-cadence` -> `200`.
- `GET https://api.felhen.ai/api/company-brain/core-readiness` -> `200`.
- `GET https://api.felhen.ai/api/company-brain/operating-snapshot` -> `200`.
- `GET https://ai.felhen.ai/company-brain/operating` -> `200 text/html`, carregando chunk
  `app/company-brain/operating/page-fc99e8c3f829ce3c.js`.

Loop em producao apos primeiro tick:

- `operatingLoop.enabled=true`
- `operatingLoop.status=idle`
- `operatingLoop.scheduleId=production:company-brain-operating-loop`
- `operatingLoop.checkIntervalMs=300000`
- `operatingLoop.tickCount=1`
- `operatingLoop.runCount=1`
- `operatingLoop.lockActive=false`
- `operatingLoop.lastErrorSummary=null`
- `lastDueWatcherIds=[watcher-github-pr-ci-v0]`
- `lastRun.watcherRunsCreated=1`
- `lastRun.artifactsCreated=1`
- `lastRun.runs[0].watcherId=watcher-github-pr-ci-v0`
- `lastRun.runs[0].status=completed`
- `lastRun.runs[0].watcherRunId=DB8t6HVmDsX-`
- `lastRun.runs[0].artifactId=KX7Ujpfv80MO`
- `lastRun.runs[0].triggerRef=schedule://production%3Acompany-brain-operating-loop/DB8t6HVmDsX-`

Loop recorrente apos segundo tick:

- `operatingLoop.tickCount=2`
- `operatingLoop.runCount=1`
- `operatingLoop.skippedTickCount=1`
- `operatingLoop.status=idle`
- `operatingLoop.lastDueWatcherIds=[]`
- `operatingLoop.lastErrorSummary=null`
- `operatingLoop.nextTickAt` atualizado para o proximo intervalo de 5 minutos

Interpretacao: o segundo tick nao rodou watcher porque nao havia watcher due/stale,
mas confirmou que o loop continua vivo e recorrente sem sessao interativa aberta.

Operating Cadence real:

- `activeScheduledWatcherCount=2`
- `staleCadenceCount=0`
- `dueCadenceCount=0`
- `errorCadenceCount=0`
- `scheduledRunCount=7`
- `watcher-github-pr-ci-v0.cadenceStatus=active`
- `watcher-aios-briefing-v0.cadenceStatus=active`

Core Readiness real:

- `overallStatus=demo_not_ready`
- `dailyUseBlockingGapCount=0`
- `demoGapCount=0`
- `designPartnerGapCount=0`
- `dailyGaps=[]`
- `operatingLoopEnabled=true`
- `operatingLoopStatus=idle`
- `operatingLoopLastErrorAt=null`

Operating Snapshot real:

- `overallStatus=healthy`
- `summary=5/5 operating cards ready; 0 attention; 0 critical; 0 errors; 0 missing.`
- Operating Cadence card:
  - `state=healthy`
  - `mainAlert=2 scheduled watchers active.`
- `latestAgentContext.id=Ry3RMiKMNQ2q`
- Daily Agent Handoff card esta ready.
