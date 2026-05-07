# Company Brain Gate Closure Ritual Runbook

Atualizado em 2026-05-06 BRT.

## Objetivo

Gate Closure Ritual v0 transforma gates e SLAs pendentes em checklist diario read-only. O ritual orienta revisao humana antes de abrir trabalho novo ou expandir automacao.

Ele nao altera `WorkflowRun`, nao fecha gates e nao executa writeback externo.

## Entrada

O ritual e derivado de:

- `WorkflowRun.gateStatus` em `pending`, `blocked` ou `failed`;
- `WorkflowRun.slaStatus` em `at_risk` ou `breached`;
- `Goal.slaStatus` em `at_risk` ou `breached`;
- links para WorkItem, Goal, Priority, owner, due date e area quando existirem.

## Superficies

- API: `GET /api/company-brain/gate-closure-ritual`
- Summary: `summary.gateClosureRitual`
- UI: secao `Gate Closure Ritual` em `/company-brain`
- MCP: `get_company_brain_gate_closure_ritual`
- AIOS Briefing: secao `gate_closure`
- Core Readiness: gap diario quando houver itens no ritual

## Como validar localmente

```bash
AIOS_DB_PATH=/tmp/aios-runtime-gate-closure-dogfood.sqlite \
AIOS_PORT=43167 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
NODE_ENV=development \
node packages/daemon/dist/index.js
```

Seed de demo:

```bash
curl -sS -X POST http://127.0.0.1:43167/api/company-brain/demo/felhen-v0-1 \
  -H 'content-type: application/json' \
  --data '{"owner":"Felhen","visibility":"internal"}'
```

Ritual:

```bash
curl -sS http://127.0.0.1:43167/api/company-brain/gate-closure-ritual | jq '.data.stats'
```

Aceite esperado no demo:

- `itemCount=1`;
- `workflowGateCount=1`;
- `pendingGateCount=1`;
- `dailyClosureReadyCount=1`;
- primeiro item `kind=workflow_gate`;
- primeiro item `status=ready_for_review`;
- `recommendedAction` preenchido.

## Uso diario

1. Rodar Operating Cadence.
2. Abrir Gate Closure Ritual.
3. Revisar itens `critical` primeiro.
4. Confirmar evidencias necessarias para gates `pending`.
5. Escalar ou replanejar gates `blocked/failed`.
6. Replanejar owner/due date para SLA `at_risk/breached`.
7. Registrar a mudanca pelo fluxo humano apropriado; este ritual nao faz mutacao automatica.

## Fronteiras

Permitido:

- classificar gates/SLA;
- exibir checklist;
- incluir no briefing/core readiness;
- gerar proximo passo interno.

Proibido neste corte:

- marcar gate como passed/failed automaticamente;
- alterar WorkflowRun ou Goal;
- postar em GitHub/Slack;
- criar label/status/check/assign;
- close/reopen/merge/deploy/delete;
- qualquer mutacao externa.
