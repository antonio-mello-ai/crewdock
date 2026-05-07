# Company Brain Design Partner Operating Pack v0

Atualizado em 2026-05-06 BRT.

## Objetivo

Este pack transforma o AIOS Core em uma demo reproduzivel para uso interno e conversa com design partners, sem abrir novas mutacoes externas.

O foco da narrativa:

1. registrar fontes e evidencias;
2. transformar evidencia em work item e workflow run;
3. observar cadencia diaria;
4. revisar gates/SLA;
5. gerar contexto diario para agentes;
6. manter writeback governado e bloqueado quando a politica exigir.

## Fronteiras

Permitido na demo:

- Source, Artifact, WorkItem, WorkflowRun, Signal, AlignmentFinding, GuidanceItem;
- AIOS Briefing;
- Operating Cadence local/manual;
- Gate Closure Ritual;
- AgentContext Daily Handoff;
- Evidence Packets, timeline, graph, audit views e policy simulator;
- writeback ja aprovado em cortes anteriores apenas como evidencia historica.

Proibido sem nova aprovacao:

- novo executor externo;
- novo alvo externo;
- GitHub check-run real;
- assign/unassign real fora da policy atual;
- notification-read real;
- close/reopen/merge/deploy/delete;
- branch protection/secrets/permissions;
- Slack top-level/DM/edit/delete;
- email/billing/ads/customer systems;
- repo/canal publico novo;
- riskClass C/unknown.

## Demo Seed

Usar DB temporario:

```bash
AIOS_DB_PATH=/tmp/aios-runtime-design-partner-pack.sqlite \
AIOS_PORT=43169 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
NODE_ENV=development \
node packages/daemon/dist/index.js
```

Criar cadeia base:

```bash
curl -sS -X POST http://127.0.0.1:43169/api/company-brain/demo/felhen-v0-1 \
  -H 'content-type: application/json' \
  --data '{"owner":"Felhen","visibility":"internal"}'
```

Rodar briefing:

```bash
curl -sS -X POST http://127.0.0.1:43169/api/company-brain/watchers/watcher-aios-briefing-v0/run \
  -H 'content-type: application/json' \
  --data '{}'
```

Rodar operating cadence com repo read-only:

```bash
curl -sS -X POST http://127.0.0.1:43169/api/company-brain/operating-cadence/run \
  -H 'content-type: application/json' \
  --data '{
    "scheduleId": "demo:design-partner-pack",
    "githubPrCi": {
      "repo": "antonio-mello-ai/crewdock",
      "state": "open",
      "limit": 5,
      "sourceName": "CrewDock GitHub PR/CI design-partner demo",
      "createSignals": true
    }
  }'
```

Gerar handoff diario:

```bash
curl -sS -X POST http://127.0.0.1:43169/api/company-brain/agent-contexts/daily-handoff \
  -H 'content-type: application/json' \
  --data '{"targetAgent":"codex","visibility":"internal"}'
```

## Roteiro de Demo

1. Abrir `/company-brain`.
2. Mostrar Core Readiness.
3. Mostrar Operating Cadence:
   - watchers automatizados ativos;
   - ultimo run agendado;
   - proximo run esperado;
   - `schedule://` como provenance.
4. Mostrar Gate Closure Ritual:
   - gates pendentes;
   - SLA em risco;
   - recommended actions sem mutacao automatica.
5. Mostrar AIOS Briefing:
   - source health;
   - operating cadence;
   - gate closure;
   - writeback safety;
   - next steps.
6. Mostrar Agent Contexts:
   - `Daily Handoff`;
   - contrato operacional;
   - gate focus;
   - open guidance;
   - exit criteria.
7. Mostrar Writeback Governance:
   - proposals;
   - audit trail;
   - evidence packets;
   - policy simulator;
   - fronteiras de bloqueio.

## Dados e Privacidade

Para design partner, usar apenas:

- dados internos Felhen/CrewDock;
- repositorios explicitamente aprovados;
- Slack threads/canais controlados quando necessario;
- artifacts com `visibility=internal`.

Nao usar:

- repo de cliente;
- canal publico;
- DM;
- email;
- billing/ads/customer systems;
- secrets ou permissoes.

## Reset

Remover o DB temporario:

```bash
rm -f /tmp/aios-runtime-design-partner-pack.sqlite /tmp/aios-runtime-design-partner-pack.sqlite-*
```

## Criterios de Aceite

- `npx turbo build` passa;
- `git diff --check` passa;
- demo seed cria Source, WorkItem, WorkflowRun, Signal, Finding, Guidance e ImprovementProposal;
- Operating Cadence cria briefing + PR/CI poll com `schedule://`;
- Gate Closure Ritual retorna pelo menos um item no demo;
- Daily Handoff cria AgentContext `ready/needs_review`;
- nenhum endpoint externo de escrita e chamado durante o pack.

## Proximo Depois do Pack

Somente depois de rodar este pack em sessao real:

1. coletar friccoes de UI/operacao;
2. ajustar Adoption Dashboard/briefing com base em friccao observada;
3. avaliar novo executor real apenas com alvo aprovado e policy explicita.
