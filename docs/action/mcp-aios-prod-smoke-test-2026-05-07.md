# MCP `aios` Producao - Smoke Test 2026-05-07

## Escopo

Validar que o MCP server `aios` reconfigurado pelo usuario em `~/.claude.json`:

1. Aponta para `https://api.felhen.ai` (e nao mais `https://api.crewdock.ai`).
2. Resolve via Cloudflare Tunnel ate o daemon CT165 sem `fetch failed`.
3. Consegue ler o Company Brain real em producao.
4. Permite gerar o Daily Agent Handoff via tool MCP nativa.

Sem deploy, sem implementacao, sem mexer em secrets. Leitura + um generate de
AgentContext interno (sem mutacao externa).

Companion: `company-brain-operating-cycle-real-2026-05-07.md` registrou as
friccoes 1 e 2 com `api.crewdock.ai` quebrado e CT165 atrasado. Este doc fecha
a friccao 1 e confirma o estado pos-deploy da friccao 2.

## Veredito

MCP `aios` esta funcional contra producao. As friccoes 1 e 2 daquele doc
estao resolvidas.

- Cinco tools MCP de Company Brain testadas retornaram payload real:
  `list_workspaces`, `get_briefing`, `get_company_brain_operating_snapshot`,
  `get_company_brain_core_readiness`, `get_company_brain_operating_cadence`.
- `generate_company_brain_daily_agent_handoff` criou um AgentContext
  persistido no DB de producao (id `Ry3RMiKMNQ2q`), sem mutacao externa.
- Workspaces vem com `path=/mnt/felhencloud/...`, confirmando execucao no CT165.

## Estado da `/company-brain/operating` real

Snapshot direto do MCP em producao (`api.felhen.ai`):

```
overallStatus = attention
summary       = 2/5 operating cards ready; 2 attention; 0 critical; 0 errors; 1 missing
totals.cardCount = 5
  ready=2 attention=2 critical=0 error=0 missing=1
```

Cards:

```
aios_briefing       = ready       lastUpdatedAt=2026-05-07T13:13:42Z
                                  mainAlert="Open saved audit views for 1 prioritized audit slices."
operating_cadence   = needs_run   lastUpdatedAt=2026-05-07T13:13:42Z
                                  mainAlert="1 stale and 0 due watchers."
gate_closure_ritual = clear       mainAlert="No gate/SLA closure items are open."
source_health       = attention   mainAlert="1 source health alerts need review."
daily_agent_handoff = missing  -> ready (apos generate desta sessao)
```

Latest briefing artifact: `EjpCHihR3cUG`
(`AIOS Briefing 2026-05-07T13:13:42.842Z`).

## Daily Agent Handoff gerado

Tool: `mcp__aios__generate_company_brain_daily_agent_handoff`
- `targetAgent=claude-code`
- `title="Daily Agent Handoff 2026-05-07 - MCP smoke test"`

Saida:

- `agentContext.id = Ry3RMiKMNQ2q`
- `status = ready`
- `validationStatus = needs_review`
- `contentFormat = markdown`
- `sourceKnowledgeIds = [artifact:EjpCHihR3cUG, summary:operating_cadence,
   summary:gate_closure_ritual, summary:source_health]`
- `sourceArtifactIds = [EjpCHihR3cUG]`
- `provenance.createdFrom = company_brain:daily_agent_handoff`
- Markdown legivel cobrindo Operating Contract, Daily State, Briefing Next
  Steps e Session Exit Criteria.

`provenance.notes` confirma derivacao a partir de
`briefing,gate_closure,operating_cadence,source_health,open_guidance`. Nenhum
writeback externo disparado.

## Friccoes remanescentes

### A. `watcher-github-pr-ci-v0` em `cadenceStatus=stale`

`operatingCadence`:

```
watcher-github-pr-ci-v0:
  lastRunAt          = 2026-05-07T13:13:42.840Z
  expectedNextRunAt  = 2026-05-07T15:13:42.840Z
  staleAfterMs       = 10800000 (3h)
  cadenceStatus      = stale
  nextAction         = "Run scheduled cadence now and inspect Source Health."
```

Snapshot foi tirado as 16:52 BRT. Watcher de PR/CI esta atrasado em ~1h41 alem
do `expectedNextRunAt` (alem do limite stale). Ele deveria rodar a cada 2h via
schedule `company-brain:watcher-github-pr-ci-v0`.

Hipoteses (nao investigadas nesta sessao):

- Schedule `company-brain:watcher-github-pr-ci-v0` nao esta materializado em
  systemd timer ou esta com cadencia maior que a esperada pelo runtime.
- Ultimos runs scheduled vieram do schedule one-off
  `production:operating-cycle-2026-05-07-retry-ok`, nao do schedule per-watcher
  (`company-brain:watcher-github-pr-ci-v0`). Possivel que so o operating-cycle
  one-off tenha rodado e o cron da cadencia per-watcher nao exista.
- Pode ser intencional ate o proximo `operating-cycle-XXXX` rodar.

Verificar em sessao com SSH no CT165 (nao executado aqui):

```
systemctl --user list-timers | grep aios
journalctl -u aios-daemon --since "2 hours ago" | grep github-pr-ci
sqlite3 /home/claude/.aios/aios.db \
  "select id from schedules where id like 'company-brain:%';"
```

### B. `coreReadiness.overallStatus = daily_use_blocked`

`get_company_brain_core_readiness` retorna:

```
overallStatus              = daily_use_blocked
modules                    = 15 todos operational
dailyUseBlockingGapCount   = 1   <- friccao A acima
demoGapCount               = 0
designPartnerGapCount      = 0
polishGapCount             = 1
externalMutationGapCount   = 1   <- governanca de writeback (intencional)
```

Gap unico que bloqueia daily-use:

```
id          = stale_or_due_watcher_cadence
severity    = warn
title       = Scheduled watcher cadence needs a run
nextAction  = Run Operating Cadence locally or through the approved schedule target.
```

Concordante com a friccao A. Resolver A elimina o `daily_use_blocked`.

### C. `get_briefing` (AIOS runtime, fora do Company Brain) retorna vazio

`mcp__aios__get_briefing` para janela de 24h em producao:

```
sessionsCount       = 0
activeSessionsCount = 0
jobsCount           = 0
failedJobsCount     = 0
totalCostUsd        = 0
sections            = []
```

Esperado: producao CT165 nao tem sessoes nem jobs registrados no DB
porque `claude` runs nao acontecem na producao (acontecem nas estacoes que
operam o daemon). Logica sa, mas qualquer agente que consuma essa tool em
producao vai concluir "sem atividade" mesmo com Company Brain ativo. O
endpoint nao se cruza com Company Brain Briefing (`get_company_brain_briefing`).

Nao e bug, e mismatch de dominio. Vale documentar no MCP server description ou
em runbook que `get_briefing` cobre AIOS Runtime sessions/jobs (CrewDock side)
e nao o estado Company Brain.

### D. `latestAgentContext = null` no operating snapshot mesmo apos generate

O snapshot retornado em paralelo com o `generate_company_brain_daily_agent_handoff`
veio antes da geracao. Reler o snapshot apos o generate deve mostrar
`latestAgentContext.id=Ry3RMiKMNQ2q` e o card `daily_agent_handoff` em
`state=ready`. Nao foi rerodado nesta sessao para evitar mutacao redundante,
mas vale validar em sessao seguinte que o card transita de `missing` para
`ready` automaticamente sem precisar de novo briefing run.

## Tools MCP que ainda nao foram exercitadas

Nao executadas neste smoke por escopo de leitura, mas validas para o proximo
ciclo:

- `get_company_brain_summary` (kernel completo).
- `get_company_brain_briefing` (artifact estruturado, equivalente ao do snapshot).
- `get_company_brain_evidence_graph`, `get_company_brain_timeline`.
- `get_company_brain_writeback_safety_dashboard`.
- `get_company_brain_writeback_evidence_packet*`.
- `simulate_company_brain_writeback_policy` (read-only).
- `preview_company_brain_github_*` (preview-only, nao executa writeback).
- `run_company_brain_operating_cadence`, `run_company_brain_watcher` (write
  internos; nao rodados aqui para nao mascarar a friccao A).

## Proximos passos

1. Investigar e resolver friccao A (`watcher-github-pr-ci-v0` stale). Provavel
   gap entre schedule one-off `production:operating-cycle-*` e schedule
   per-watcher `company-brain:watcher-github-pr-ci-v0`. Sem isso o
   `coreReadiness.overallStatus` continua `daily_use_blocked`.
2. Em sessao seguinte, refazer `get_company_brain_operating_snapshot` apos o
   handoff `Ry3RMiKMNQ2q` ja existir e validar que o card
   `daily_agent_handoff` lista `state=ready` com `lastUpdatedAt` recente
   (friccao D).
3. Considerar clarificar no MCP server description que `get_briefing` cobre
   AIOS Runtime sessions/jobs e nao Company Brain (friccao C).

## Comandos / tools executados

Tools MCP `aios` chamadas nesta sessao (todas via cliente Claude Code apontado
para `https://api.felhen.ai` por `~/.claude.json`):

- `mcp__aios__list_workspaces`
- `mcp__aios__get_briefing` (hours=24)
- `mcp__aios__get_company_brain_operating_snapshot`
- `mcp__aios__get_company_brain_core_readiness`
- `mcp__aios__get_company_brain_operating_cadence`
- `mcp__aios__generate_company_brain_daily_agent_handoff`
  (targetAgent=claude-code, title="Daily Agent Handoff 2026-05-07 - MCP smoke test")

Sem mutacao em sistemas externos. Unico write interno: AgentContext
`Ry3RMiKMNQ2q` no DB do CT165.
