# Company Brain Operating Cycle - Sessao Diaria Real 2026-05-07

## Escopo

Primeira execucao do "ciclo operacional real" pos `Operating Surface v0` (commit `28ea77d`) e
`Demo/Readiness Cleanup v0` (commit `28ea77d`), em linha com a linha 152 do backlog:

> Proximo corte planejado: usar a `/company-brain/operating` em uma sessao diaria real e
> coletar gaps concretos de operacao antes de criar novas features.

Sem deploy, sem novo executor externo, sem secrets novas, sem automacao externa nova.

## Ambiente

- DB temp: `/tmp/aios-cycle-2026-05-07.sqlite`
- Daemon local: `127.0.0.1:43180` (`AIOS_AUTH_DISABLED=true`, `NODE_ENV=development`)
- Web: nao subido (validacao de UI ficou para sessao com daemon local + browser; ver friccao 1 abaixo)
- Producao CT165 nao tocada
- Commit base: `28ea77d`

## Veredito

O ciclo seed -> briefing -> cadence -> gate closure -> handoff continua operavel end-to-end.
Snapshot final apresenta os 5 cards, `latestAgentContext` ready e `recentEvents=8`. Daily handoff
saiu com `status=ready`, `contentFormat=markdown`, `sourceKnowledgeIds=8`,
`provenance.createdFrom=company_brain:daily_agent_handoff` e markdown legivel.

A fronteira "real vs demo" continua estreita porque o DB temporario seedado so contem
`Felhen Demo v0.1`/v0.2. Para o ciclo virar verdadeiramente "diario real" precisamos de DB
persistente em producao alimentado por sources reais (Slack `#aios-runtime`, GitHub
`antonio-mello-ai/crewdock`, local docs `corp/aios/`). Hoje isso esta bloqueado pelas friccoes
1 e 2 abaixo.

## Friccoes concretas

### 1. MCP `aios` aponta para host inexistente

`~/.claude.json` registra:

```json
"aios": {
  "command": "node",
  "args": ["/Users/antoniomello/felhencloud/projetos/felhen/aios-runtime/packages/mcp-server/dist/index.js"],
  "env": {
    "AIOS_DAEMON_URL": "https://api.crewdock.ai",
    "CF_ACCESS_CLIENT_ID": "...",
    "CF_ACCESS_CLIENT_SECRET": "..."
  }
}
```

`api.crewdock.ai` retorna `Could not resolve host` (NXDOMAIN). `CLAUDE.md` deste projeto
prescreve `https://api.felhen.ai`. Toda chamada `mcp__aios__*` retorna `fetch failed`,
o que obriga a sessao a fazer o ciclo via `curl` direto + daemon local. Impacto: orquestrador
e qualquer agente downstream nao conseguem usar a superficie MCP que existe especificamente
para isso.

Fix proposto (escala trivial, sem deploy): atualizar `AIOS_DAEMON_URL` no `~/.claude.json`
para `https://api.felhen.ai`. Nao requer secrets novas; o service token CF Access ja esta
gravado no MCP env.

### 2. Producao CT165 esta atras dos commits company-brain

CT165 daemon roda commit `d7d1dfa` (`refactor(auth): move daemon to api.felhen.ai`).
Local esta em `28ea77d`. CT165 nao tem nenhum dos cinco commits que entregaram o pack:

- `28ea77d feat: add company brain operating surface`
- `ab80e21 docs: record company brain operating pack dogfood`
- `430f9f7 docs: add company brain design partner operating pack`
- `1b5ed14 feat: add company brain daily agent handoff`
- `af7f329 feat: add company brain gate closure ritual`

Validado: `GET https://api.felhen.ai/api/company-brain/operating-snapshot` -> `404`.

Consequencia operacional: a propria pagina `/company-brain/operating` em
`https://ai.felhen.ai/company-brain/operating` nao tem backend. O dogfood "diario real"
hoje so existe em DB temporario local. Sem deploy nao ha como acumular historia, gates
de verdade ou sources reais. Esta sessao nao deploya por instrucao explicita; registrando
para o proximo corte considerar.

### 3. Briefing pos-cadence reporta watchers como "0/2 active" / "due"

Apos `POST /api/company-brain/operating-cadence/run` (mode=all) com 2 watcherRuns
`completed`, o `Artifact aios_briefing` gerado nesse mesmo run ainda traz no markdown:

```
## Operating Cadence
- 0/2 scheduled watchers active; 0 scheduled runs; 0 manual runs.
- 0 stale cadence watchers; 2 due; next=unknown.
- cadence: GitHub PR/CI watcher v0 [due] - Run scheduled cadence once...
- cadence: AIOS Briefing watcher v0 [due] - Run scheduled cadence once...
```

Mas o handoff gerado depois (mesmo cadence) ja diz corretamente:

```
- Operating cadence: 2/2 scheduled watchers active; stale=0; due=0
```

Isso e timing: o briefing watcher snapshot a `OperatingCadence` antes do proprio
`WatcherRun` ser persistido como `scheduled`. Para um humano lendo o briefing recem-gerado
em `/company-brain/operating`, parece que o cadence falhou. Friccao real de credibilidade,
mesmo que o estado eventualmente convirja.

Opcoes (sem implementar):
- Recomputar `operating_cadence`/`next_steps` do briefing apos persistir o run.
- Documentar no briefing que `operating_cadence` e snapshot pre-run.
- Mover o briefing para depois dos demais watchers no `operating-cadence/run`.

### 4. `operating-cadence/run` retorna `runs[].artifactId=null`

Resposta da rota traz `artifactsCreated=2`, `signalsCreated=0`, `watcherRunsCreated=2`,
mas `runs[].artifactId` vem `null` em ambos os watchers. O artifact existe (briefing
e PR/CI snapshot ficam consultaveis por outras rotas), mas a UI/CLI consumer que
quiser linkar direto do retorno do run para o artifact nao consegue. Consistencia de
shape vale verificar.

### 5. `gate-closure-ritual` retorna apenas `generatedAt/items/stats`

Sem `overallStatus`, `summary` e `totals` no nivel top. Os contadores estao em `stats`
(`pendingGateCount`, `dailyClosureReadyCount`, etc.) e `items` traz cada gate. Funciona,
mas se a tela `/company-brain/operating` ou consumer MCP esperar `overallStatus`/`summary`
no top vai ler `null`. Ver `getOperatingSnapshot` linha 9798 do daemon e contrato no
runbook `company-brain-gate-closure-ritual-runbook.md`.

### 6. `design_partner_not_ready` continua como `overallStatus` do core readiness

Mesmo apos `Demo/Readiness Cleanup v0` (que reduziu o `designPartnerGapCount` para 0
e adicionou recognition do design partner pack), o `coreReadiness.overallStatus`
continua `design_partner_not_ready`. Razao real: `dailyUseBlockingGapCount=1`
(o gate pendente do demo) elevou o status. Naming do `overallStatus` confunde porque
ele agrega friccoes de uso diario, nao so de design partner. Renomear para
`overallReadiness=daily_use_blocked` ou explicar a regra na UI evitaria leitura errada.

## Estado da snapshot final

```
overall: null
aios_briefing       = ready       lastUpdatedAt=2026-05-07T12:45:33Z mainAlert="Close feedback on 1 open guidance items."
operating_cadence   = healthy     lastUpdatedAt=2026-05-07T12:45:34Z mainAlert="2/2 scheduled active; 0 stale; 0 due"
gate_closure_ritual = attention   lastUpdatedAt=2026-05-07T12:45:34Z mainAlert="1 items needs review"
source_health       = healthy     3/3 healthy
daily_agent_handoff = ready       targetAgent=codex contentFormat=markdown
recentEvents        = 8           (source_created/source_synced/watcher_run/artifact_ingested ciclos)
externalWriteEventCount = null    (era esperado 0)
latestAgentContext  = present
```

`overallStatus` no `OperatingSnapshot` top-level vem `null`. Se o card mostra 4 healthy/ready
e 1 attention, era esperado um agregado tipo `attention`. Mesma classe da friccao 5/6.

## Proximo WorkItem real

Pelo briefing/handoff/gate-closure deste DB temporario o "proximo passo" eh fechar o
pending workflow gate `Felhen Demo v0.1 Development Blueprint run [intake]`. Isso e demo
e nao move o produto.

Pelo backlog real (linha 152) e por este ciclo, o proximo WorkItem do projeto e:

> **Fechar friccoes 1 e 3 a 6 deste doc antes de iniciar qualquer feature company-brain
> nova.** Friccao 2 fica para o proximo corte que decida sobre deploy.

Ordem sugerida (todas em escopo "no novo executor / no novo target externo / no deploy"):

1. **Friccao 1 (MCP URL)** - 1-line edit em `~/.claude.json`. Habilita ciclos diarios via
   MCP nativo em vez de curl. Zero risco operacional.
2. **Friccao 3 (briefing reporta watchers como nao-ativos pos-cadence)** - persistir o
   `WatcherRun` antes de gerar o briefing artifact, ou recomputar `operating_cadence` do
   briefing apos os outros runs.
3. **Friccao 5 (gate-closure top-level shape)** - alinhar o response shape com o esperado
   do consumer (`overallStatus`/`summary`/`totals`).
4. **Friccao 6 (`overallStatus=design_partner_not_ready` confunde)** - renomear ou
   redocumentar a semantica.
5. **Friccao 4 (`runs[].artifactId=null`)** - popular `artifactId` no shape de retorno.

Friccao 2 (deploy CT165) eh o unico bloqueio real para "ciclo diario operacional"
deixar de depender de DB temporario. Ela e a unica que precisa de decisao do humano
porque o usuario explicitamente pediu para nao deployar nesta sessao.

## Comandos executados

```bash
# Daemon temporario
rm -f /tmp/aios-cycle-2026-05-07.sqlite{,-shm,-wal} /tmp/aios-cycle-daemon.log
AIOS_DB_PATH=/tmp/aios-cycle-2026-05-07.sqlite \
AIOS_PORT=43180 \
AIOS_HOST=127.0.0.1 \
AIOS_AUTH_DISABLED=true \
NODE_ENV=development \
AIOS_CORS_ORIGINS=http://127.0.0.1:43181,http://localhost:43181 \
node packages/daemon/dist/index.js > /tmp/aios-cycle-daemon.log 2>&1 &

# Health
curl -sS http://127.0.0.1:43180/api/health

# Snapshot inicial (DB vazio)
curl -sS http://127.0.0.1:43180/api/company-brain/operating-snapshot

# Demo seed v0.1
curl -sS -X POST http://127.0.0.1:43180/api/company-brain/demo/felhen-v0-1 \
  -H 'content-type: application/json' \
  --data '{"owner":"Felhen","visibility":"internal"}'

# Operating Cadence (mode all)
curl -sS -X POST http://127.0.0.1:43180/api/company-brain/operating-cadence/run \
  -H 'content-type: application/json' \
  --data '{"scheduleId":"dogfood:cycle-2026-05-07","githubPrCi":{"repo":"antonio-mello-ai/crewdock","state":"open","limit":3,"createSignals":true}}'

# Briefing
curl -sS http://127.0.0.1:43180/api/company-brain/briefing

# Gate Closure Ritual
curl -sS http://127.0.0.1:43180/api/company-brain/gate-closure-ritual

# Daily Handoff
curl -sS -X POST http://127.0.0.1:43180/api/company-brain/agent-contexts/daily-handoff \
  -H 'content-type: application/json' \
  --data '{"targetAgent":"codex","title":"AIOS Daily Handoff 2026-05-07 Cycle"}'

# Snapshot final + Source Health + Core Readiness
curl -sS http://127.0.0.1:43180/api/company-brain/operating-snapshot
curl -sS http://127.0.0.1:43180/api/company-brain/source-health
curl -sS http://127.0.0.1:43180/api/company-brain/core-readiness
```

## Artefatos persistidos durante a sessao

Em `/tmp` desta maquina (efemero):

- `aios-cycle-01-seed.json`
- `aios-cycle-02-cadence.json`
- `aios-cycle-03-briefing.json`
- `aios-cycle-04-gateclosure.json`
- `aios-cycle-05-handoff.json`
- `aios-cycle-06-srchealth.json`
- `aios-cycle-07-coreready.json`
- `aios-cycle-snap-final.json`
- `aios-cycle-2026-05-07.sqlite` (DB temp)

Sem mutacao em producao, sem mutacao externa, sem novo deploy.
