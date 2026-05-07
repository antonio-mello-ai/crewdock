# Company Brain AgentContext Daily Handoff Runbook

Atualizado em 2026-05-06 BRT.

## Objetivo

AgentContext Daily Handoff v0 cria um contexto diario para agentes iniciarem trabalho alinhados ao Company Brain.

O corte cria apenas um `AgentContext` interno:

- `status=ready`;
- `validationStatus=needs_review`;
- `contextType=briefing`;
- `createdFrom=company_brain:daily_agent_handoff`.

Nao roda agente, nao aplica patch, nao cria writeback externo e nao executa mutacao fora do banco local.

## Entradas

O contexto e derivado de:

- ultimo AIOS Briefing;
- Gate Closure Ritual;
- Operating Cadence;
- Source Health;
- guidance aberta;
- decisions propostas.

## Superficies

- API: `POST /api/company-brain/agent-contexts/daily-handoff`
- UI: botao `Daily Handoff` na secao `Agent Contexts`
- MCP: `generate_company_brain_daily_agent_handoff`
- Summary: `agentContexts` e stats `agentContextCount` / `readyAgentContextCount`

## Validacao local

```bash
AIOS_DB_PATH=/tmp/aios-runtime-agent-handoff-dogfood.sqlite \
AIOS_PORT=43168 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
NODE_ENV=development \
node packages/daemon/dist/index.js
```

Preparar demo + briefing:

```bash
curl -sS -X POST http://127.0.0.1:43168/api/company-brain/demo/felhen-v0-1 \
  -H 'content-type: application/json' \
  --data '{"owner":"Felhen","visibility":"internal"}'

curl -sS -X POST http://127.0.0.1:43168/api/company-brain/watchers/watcher-aios-briefing-v0/run \
  -H 'content-type: application/json' \
  --data '{}'
```

Gerar handoff:

```bash
curl -sS -X POST http://127.0.0.1:43168/api/company-brain/agent-contexts/daily-handoff \
  -H 'content-type: application/json' \
  --data '{"targetAgent":"codex","visibility":"internal"}'
```

Aceite esperado:

- retorna `agentContext.status=ready`;
- retorna `agentContext.validationStatus=needs_review`;
- `sourceKnowledgeIds` inclui artifact/guidance/work/goal e summaries derivados;
- `content` contem `Operating Contract`, `Daily State`, `Gate Closure Focus`, `Open Guidance` e `Session Exit Criteria`;
- `summary.stats.readyAgentContextCount` aumenta.

## Fronteiras

Permitido:

- criar `AgentContext`;
- incluir referencias internas a briefing/guidance/work/goal;
- expor em API/UI/MCP.

Proibido:

- rodar agente automaticamente;
- aplicar patch;
- criar ExternalActionProposal automaticamente;
- executar writeback;
- mudar WorkflowRun/Goal;
- deploy/merge/close/reopen/delete.
