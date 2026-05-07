# Company Brain Operating Surface Dogfood - 2026-05-07

## Escopo

Dogfood curto dos cortes:

- Operating Surface v0;
- Demo/Readiness Cleanup v0.

Sem writeback externo, sem deploy, sem secrets novas e sem novo executor.

## Ambiente

- DB: `/tmp/aios-runtime-operating-surface-dogfood.sqlite`
- Daemon: `127.0.0.1:43172`
- Web dev: `127.0.0.1:43173`

## Comandos principais

```bash
AIOS_DB_PATH=/tmp/aios-runtime-operating-surface-dogfood.sqlite \
AIOS_PORT=43172 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
NODE_ENV=development \
node packages/daemon/dist/index.js
```

```bash
curl -sS -X POST http://127.0.0.1:43172/api/company-brain/demo/felhen-v0-1 \
  -H 'content-type: application/json' \
  --data '{"owner":"Felhen","visibility":"internal"}'
```

```bash
curl -sS -X POST http://127.0.0.1:43172/api/company-brain/watchers/watcher-aios-briefing-v0/run \
  -H 'content-type: application/json' \
  --data '{"title":"Operating Surface Dogfood Briefing","summary":"Short pack run for operating surface dogfood."}'
```

```bash
curl -sS -X POST http://127.0.0.1:43172/api/company-brain/agent-contexts/daily-handoff \
  -H 'content-type: application/json' \
  --data '{"targetAgent":"codex","title":"Operating Surface Dogfood Daily Handoff"}'
```

```bash
curl -sS -X POST http://127.0.0.1:43172/api/company-brain/operating-cadence/run \
  -H 'content-type: application/json' \
  --data '{"mode":"all","githubPrCi":{"repo":"antonio-mello-ai/crewdock","state":"open","limit":1,"createSignals":true}}'
```

```bash
NEXT_PUBLIC_DAEMON_URL=http://127.0.0.1:43172 \
npx next dev --port 43173
```

```bash
curl -sS http://127.0.0.1:43173/company-brain/operating
```

## Evidencia

Demo Seed v0.2 criou duas `ExternalActionProposal` internas:

- `Felhen Demo v0.2 Risk A preview-only draft`
  - `riskClass=A`
  - `approvalStatus=blocked`
  - `executionStatus=blocked`
  - `destinationType=internal`
  - `actionType=draft`
  - `payload.mode=preview_only`

- `Felhen Demo v0.2 Risk B pending approval`
  - `riskClass=B`
  - `approvalStatus=pending`
  - `executionStatus=not_started`
  - `destinationType=internal`
  - `actionType=draft`
  - `payload.mode=pending_approval`

AIOS Briefing:

- `artifactType=aios_briefing`
- `sections=14`
- `signalsCreated=0`

Daily Handoff:

- `status=ready`
- `contentFormat=markdown`
- `sourceKnowledgeIds=7`
- `provenance.createdFrom=company_brain:daily_agent_handoff`

Operating Cadence:

- `watcherRunsCreated=2`
- `artifactsCreated=2`
- `signalsCreated=0`
- `watcher-aios-briefing-v0`: `completed`
- `watcher-github-pr-ci-v0`: `completed`

Operating Snapshot:

- 5 cards retornados:
  - `aios_briefing=ready`
  - `operating_cadence=healthy`
  - `gate_closure_ritual=attention`
  - `source_health=healthy`
  - `daily_agent_handoff=ready`
- `recentEvents=8`
- `externalWriteEventCount=0`

Source Health:

- `sourceCount=3`
- `healthyCount=3`
- `sourceWithoutWorkItemsCount=0`
- `sourceWithoutSignalsCount=0`
- PR/CI read-only e runtime sources nao foram marcados com `no_work_items`/`no_signals`.

Core Readiness:

- `design_partner_operating_pack` nao apareceu como gap porque o pack documental existe no repo.
- `designPartnerGapCount=0`.

Web:

- `GET /company-brain/operating` retornou 200 e compilou a rota em dev.

## Observacoes

O `overallStatus` do Core Readiness no DB temporario ficou `design_partner_not_ready` porque o demo seed v0.2 usa proposals internas bloqueadas/pending e o DB curto nao inclui writeback dogfood externo completado. Isso e esperado para este corte porque a validacao foi sem mutacao externa.
