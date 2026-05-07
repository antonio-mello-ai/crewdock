# AIOS Symphony Compatibility Map - 2026-05-07

## Escopo

Consumo da issue `#29 AIOS-EXEC-03: Symphony-compatible Agent Runner` da
milestone `AIOS Execution Loop v0`. Este corte e doc-first: define como
o AIOS Execution Loop adota a referencia OpenAI Symphony sem virar uma
implementacao paralela do spec dela.

Fontes:

- `https://github.com/openai/symphony` (Elixir, MIT-style boundary).
- `https://github.com/openai/symphony/blob/main/SPEC.md` (Draft v1, language-
  agnostic).
- `corp/docs/action/aios-product-roadmap.md`.
- `docs/action/aios-company-operating-map-alignment-2026-05-07.md`.
- `docs/action/aios-github-roadmap-reset-2026-05-07.md`.

Constraints da issue:

- Nao lancar agentes nesta sessao.
- Nao introduzir Linear como dependencia.
- Nao adicionar servico pago alem dos ja existentes (Codex/OpenAI, infra
  CT165, Cloudflare, GitHub).
- Sem writeback externo fora das policies aprovadas.

## Decisao v0

**Minimal wrapper em TypeScript no daemon AIOS**. Nao porta o repositorio
Symphony. Nao instala Symphony como sidecar Elixir. Em vez disso:

1. Adota o **spec** Symphony como contrato de orquestracao.
2. Usa o adapter `github_issues` ja existente como tracker.
3. Adiciona um modulo novo `packages/daemon/src/agentRunner/` que implementa
   o vocabulario do spec (workflow loader, orchestrator, workspace manager,
   agent runner, retry queue) sobre as entidades horizontais que o Company
   Brain ja tem (`WorkItem`, `WorkflowBlueprint`, `WorkflowRun`,
   `WorkflowStep`, `AgentContext`, `Artifact`, `Signal`, `GuidanceItem`,
   `ExternalActionProposal`).
4. Versiona o contrato em-repo via `WORKFLOW.md`, parseado pelo daemon.

### Por que minimal wrapper, nao sidecar nem port

Sidecar Elixir:

- Adiciona runtime (BEAM), deploy, monitoring e backup novos no CT165.
- Concorre com o daemon TypeScript pelo mesmo papel (poll, dispatch, retry).
- Quebra o boundary "AIOS runtime e o orquestrador unico" do
  `docs/company-brain-direction.md`.
- Conflita com a constraint da issue de nao adicionar servico novo.

TypeScript port:

- Reescreveria 100% do spec antes de existir uma run real.
- Duplicaria entidades (Symphony `Issue` x AIOS `WorkItem`, Symphony `Run
  Attempt` x AIOS `WorkflowRun`).
- Forcaria mudancas dificeis de reverter caso o spec mude (Draft v1).

Minimal wrapper:

- Reusa entidades AIOS para tracking e provenance.
- Trata o `WORKFLOW.md` como repository contract (alinhado com o spec).
- Permite atualizar a integracao quando o Symphony spec evoluir.
- Mantem a fronteira `aios-runtime` como unico orquestrador.
- Cabe num corte v0 implementavel sem deploy novo.

### O que nao muda

- `WorkItem` continua a fila de trabalho canonica do Company Brain.
- `WorkflowBlueprint` continua a definir gates/etapas de cada area.
- `WorkflowRun`/`WorkflowStep` continuam a ser o registro auditavel de
  execucao de cada item.
- GitHub Issues continua o tracker para a area de Development. Outros
  trackers (Linear, Jira) entram via adapters depois.

## Mapping Symphony -> AIOS

### Entidades

| Symphony | AIOS hoje | Acao no v0 |
| --- | --- | --- |
| `Issue` | `WorkItem` espelhado de GitHub Issues via adapter | reusar; sem schema novo |
| `Workflow Definition` (`WORKFLOW.md`) | nao existe | criar `WORKFLOW.md` no root do repo + parser no daemon |
| `Service Config` (typed) | `config.ts` do daemon | acrescentar typed view das fields do `WORKFLOW.md` |
| `Workspace` | nao existe (CrewDock workspaces sao para sessions interativas, nao isoladas por issue) | adicionar `cbAgentRunWorkspaces` + workspace manager baseado em git worktree |
| `Run Attempt` | parcialmente coberto por `WorkflowRun` + `WorkflowStep` | adicionar `cbAgentRuns` (uma por attempt; aponta para `WorkflowRun` quando existir blueprint matching) |
| `Live Session` | parcialmente coberto por `cbSessions` (sessoes interativas Claude/Codex) | reusar fields token/turn quando o agent for um Claude/Codex session; sem duplicar |
| `Retry Entry` | nao existe | adicionar tabela `cbAgentRunRetries` (in-memory + DB para sobrevida em restart) |
| `Orchestrator Runtime State` | parcialmente coberto pelo Operating Loop existente | reusar Operating Loop tick para chamar AgentRunner; sem novo scheduler paralelo |
| `Workflow Loader` | `Local Docs Importer` cobre arquivos genericos | adicionar `WorkflowLoader` dedicado para `WORKFLOW.md` |
| `Issue Tracker Client` | `mcp__aios__sync_company_brain_github_issues` + `cbWorkItems` | reusar; adicionar tracker.kind=github como primeira class no Workflow |
| `Agent Runner` (Codex app-server) | `Console` (`claude -p`) e `Terminal` (PTY) ja sao agent runners interativos | adicionar agent runner nao-interativo, dedicado ao orchestrator, com workspace isolado |
| `Status Surface` (OPTIONAL) | `/company-brain/operating` ja mostra cards de saude | adicionar AgentRun na Company Operating Map (#31) |
| `Logging` | `cbJobs.logPath`, `journalctl` do `aios-daemon.service` | reusar; cada AgentRun aponta para um logPath persistido |
| `Workspace hooks` (`after_create`, `before_run`, etc.) | nao existe | adicionar suporte a hooks no `WORKFLOW.md`; rodar em `bash -lc` com timeout |

### Conceitos de policy

| Symphony | AIOS hoje | Notas |
| --- | --- | --- |
| `tracker.kind: linear` | `tracker.kind: github` (primeira classe) | Linear/Jira viram adapters depois, sem mudar o spec |
| `tracker.api_key: $LINEAR_API_KEY` | `$GITHUB_TOKEN` ja em `.env.prod` | sem segredo novo |
| `tracker.project_slug` | `tracker.repo` (`owner/name`) + `tracker.milestone` | preserva semantica de "fila ativa" |
| `tracker.active_states` / `terminal_states` | `[open]` / `[closed]` para GitHub | hardcoded para v0; configuravel pelo `WORKFLOW.md` |
| `polling.interval_ms` | tick do Operating Loop ja existe (`AIOS_COMPANY_BRAIN_OPERATING_LOOP_CHECK_INTERVAL_MS`) | reusar; AgentRunner roda como uma fase do tick |
| `agent.max_concurrent_agents` | nao existe | adicionar (default 1 em v0; conservador) |
| `agent.max_concurrent_agents_by_state` | nao existe | adicionar; por status canonico do `WorkItem` |
| `agent.max_turns` | nao existe | adicionar (default 20) |
| `agent.max_retry_backoff_ms` | nao existe | adicionar (default 300000 = 5m) |
| `codex.command` | `claude` ou `codex app-server` (host) | configuravel; default `claude` |
| `codex.approval_policy` | mapear para Writeback Policy Matrix existente (Risk A/B/C, HITL gates) | sandboxes Codex viram pass-through quando o agent for Codex |
| `codex.stall_timeout_ms` | nao existe | adicionar (default 300000 = 5m) |

### Estados de execucao

Symphony separa "Issue Orchestration State" (claim) de "Run Attempt
Lifecycle" (fase do worker). AIOS adota a mesma separacao:

`AgentRunClaimState` (analogo ao Symphony orchestration state, fica em
memoria + persiste como `AgentRun.claimState`):

- `unclaimed`
- `claimed`
- `running`
- `retry_queued`
- `released`

`AgentRunStatus` (analogo ao Symphony run attempt lifecycle, persiste em
`AgentRun.status` e mapeia para `WorkflowStep.status` quando a step e
clara):

- `preparing_workspace`
- `building_prompt`
- `launching_agent`
- `initializing_session`
- `streaming_turn`
- `pr_opened` (transicao adicionada para AIOS; quando o agent abre PR via
  Risk B writeback existente)
- `awaiting_review` (handoff antes de `done`, alinhado com a nota do spec
  de que um run pode terminar em `Human Review`)
- `finishing`
- `succeeded`
- `failed`
- `timed_out`
- `stalled`
- `canceled_by_reconciliation`

Mapping para `WorkflowStep.status` canonico:

- Symphony `Succeeded` -> `done`.
- Symphony `Failed` / `TimedOut` / `Stalled` -> `failed` com `errorSummary`.
- Symphony `CanceledByReconciliation` -> `cancelled`.
- AIOS `pr_opened` / `awaiting_review` viram steps explicitas no Development
  Blueprint (`triage -> plano -> execucao -> revisao -> ...`).

### Acoes externas

Toda acao de writeback gerada pelo agent (comment, label, issue create) ja
passa pela Writeback Policy Matrix existente:

- `github_comment` (Risk B, executor real) — agent pode pedir comment via
  `ExternalActionProposal`.
- `github_label` (Risk B, executor real, allowlist) — idem.
- `github_status` (Risk B, executor real, allowlist private repo) — idem.
- `github_issue_create` (Risk B, preview-only v0 da AIOS-EXEC-02) — agent
  nao pode criar issue real ate executor v1 ser cortado.
- `github_check`, `assign`, `close`, `reopen`, `merge`, `deploy`,
  `mark_notification_read` — bloqueados.

Symphony spec diz "ticket writes are typically performed by the coding agent
using tools available in the workflow/runtime environment". O AIOS
restringe esse "tools available" ao subset acima, mediado por
`ExternalActionProposal`. O Agent Runner v0 nao expoe credenciais alem das
policies, e o agent NAO recebe `GITHUB_TOKEN` no env do subprocess: writes
sao feitos pelo daemon apos a proposal aprovada.

## WORKFLOW.md (repository contract)

Em v0, `WORKFLOW.md` vive na raiz do repo (`/Users/antoniomello/felhencloud/projetos/felhen/aios-runtime/WORKFLOW.md`)
e e versionado junto com o codigo. Ele e ainda nao existe — sera criado
no proximo corte.

Skeleton inicial:

```markdown
---
tracker:
  kind: github
  repo: antonio-mello-ai/crewdock
  active_milestone: "AIOS Execution Loop v0"
  active_states: [open]
  terminal_states: [closed]
polling:
  interval_ms: 60000
workspace:
  root: ~/.aios/agent-workspaces
  vcs: git_worktree
  base_branch: main
agent:
  command: claude
  args: ["-p"]
  max_concurrent_agents: 1
  max_concurrent_agents_by_state:
    in_progress: 1
    triage: 1
  max_turns: 20
  max_retry_backoff_ms: 300000
hooks:
  after_create: |
    git fetch origin
    git worktree add . -b "$AIOS_BRANCH_NAME" origin/main
  before_run: |
    npm ci
    npx turbo build --filter=@aios/shared
  after_run: |
    git status -s > .aios-run/git-status.txt
codex:
  approval_policy: aios_writeback_policy
  stall_timeout_ms: 300000
  turn_timeout_ms: 3600000
---

# Agent Prompt

You are the AIOS Execution Loop agent for issue {{ issue.identifier }}:
{{ issue.title }}.

## Operating Contract

- Read Company Brain (operating snapshot, summary) before mutating anything.
- Follow `docs/aios-issues-runbook.md` as the operating runbook.
- Stop before: external writeback not authorized by this work item, secret
  or permission changes, deploy not requested, real product ambiguity.
- Open a comment on the source issue if scope is unclear instead of
  inferring it.

## Linked Evidence

{{ issue.linked_evidence }}

## Acceptance Criteria

{{ issue.acceptance_criteria }}

## Branch

`{{ issue.branch_suggestion }}` (from `origin/main`).

## Validation

- `git diff --check`
- `npx turbo build`
- Smoke test relevant to the changed area.

## Closing

- Open PR with `Closes {{ issue.external_id }}`.
- Update `docs/backlog.md` with a status line for the cut.
```

Template engine: Liquid-compatible (Symphony spec section 5.4) com falha
explicita em variaveis ou filtros desconhecidos. AIOS reaproveita o template
ja produzido pelo `Next Work` em `buildNextWorkAgentPrompt`: ele tem
campos como `branch_suggestion`, `linked_evidence` e `acceptance_criteria`
prontos.

## Workspace isolation e branch naming

### Layout filesystem

```
$WORKFLOW.workspace.root/
  <repo-slug>/
    <work-item-key>/
      .git/                       (worktree-managed)
      <repo files>
      .aios-run/
        agent.log
        events.jsonl
        codex-tokens.json
        result.json
```

Sanitizacao do `work-item-key` segue Symphony (`[A-Za-z0-9._-]`, demais
viram `_`). Ex: `WorkItem.id=WTafhrhnSYbv` ou
`workItem.externalId=antonio-mello-ai/crewdock#29` -> chave
`antonio-mello-ai_crewdock_29`.

Workspace e persistido entre runs. Apenas issues em estado terminal sofrem
cleanup (igual Symphony 8.6).

### VCS

`workspace.vcs=git_worktree` por default. Razoes:

- evita re-clone para cada issue;
- compartilha objects entre worktrees;
- branch dedicada por issue (`aios-<work-item-key>-<short-slug>`);
- removivel via `git worktree remove`.

`hooks.after_create` recebe env vars:

- `AIOS_BRANCH_NAME` (`<aios-issue-key>-<short-slug>` igual `Next Work`).
- `AIOS_WORKSPACE_PATH`.
- `AIOS_WORK_ITEM_ID`.
- `AIOS_REPO`.

### Safety invariants

Identicos ao spec Symphony 9.5:

- O AgentRunner valida `cwd === workspace_path` antes de spawn.
- `workspace_path` precisa ter `workspace.root` como prefixo absoluto.
- Tentativa de path traversal aborta o run e cria `Signal` com severity
  `error`.

## Concurrency

Default v0 conservador:

- `agent.max_concurrent_agents: 1`. Subir para 2-3 apos dogfood.
- `agent.max_concurrent_agents_by_state` permite priorizar `in_progress`
  (interrompido) sobre `triage` (novo).

Reasoning:

- Multiplos agentes em paralelo no mesmo repo geram conflitos de tooling
  (`npm install`, `next build`, ports locais).
- O Operating Loop ja roda watchers em sequencia; AgentRunner segue o mesmo
  padrao para nao saturar CPU/memoria do CT165.

## Retry e backoff

Identico ao spec Symphony 8.4:

- Continuation retry pos `succeeded`: `1000 ms`.
- Failure retry: `min(10000 * 2^(attempt-1), max_retry_backoff_ms)`.
- Default `max_retry_backoff_ms: 300000 (5m)`.
- Maximo de attempts: 5 em v0 (configuravel).

Apos esgotar attempts:

- AgentRun fica `failed`.
- `WorkflowRun` registra step `failed` com `errorSummary`.
- `Signal` `severity=warn` aberta para o tipo de falha.

## Reconciliation

Por tick (default 60s, alinhado ao Operating Loop):

1. **Stall detection**: para cada `running` AgentRun, calcular
   `elapsed_ms` desde o ultimo `codex_event` ou `started_at`. Se
   `elapsed_ms > codex.stall_timeout_ms`, terminar e enfileirar retry.
2. **Tracker state refresh**: pegar issues open da milestone ativa via
   adapter `github_issues`. Se a issue espelhada por um run em execucao
   nao esta mais open, terminar o worker e limpar workspace (workspace
   e terminal apenas se a issue for terminal, igual Symphony 8.5).
3. **Workspace cleanup**: na startup do daemon, percorrer issues fechadas
   e remover workspaces orfaos.

## Run Attempt -> WorkflowRun mapping

Quando o `WorkItem` esta linkado a um `WorkflowBlueprint` (ex: Development
Blueprint), o `AgentRun` cria/atualiza um `WorkflowRun` correspondente:

- `AgentRun.id` virgula-separada com `WorkflowRun.id`.
- Cada step do blueprint (`triage`, `plano`, `execucao`, `revisao`,
  `plano de testes`, `testes`, `QA visual`, `security QA`, `deploy gate`,
  `deploy + monitoramento`, `fechamento`, `documentacao oficial`) recebe
  um `WorkflowStep.status`.
- Eventos do agent (Codex `turn_started`, `tool_called`, `pr_opened`)
  atualizam o step ativo.
- Falha de validacao no `before_run` hook -> step `triage`/`plano` falha.
- Falha durante `streaming_turn` -> step `execucao` falha.
- `pr_opened` -> step `revisao` ativa, status do run vira
  `awaiting_review`.

Quando o `WorkItem` nao tem blueprint matching (workitems livres),
`AgentRun` ainda persiste e gera Artifact + Signal de evidencia, mas nao
abre `WorkflowRun`. Esse e o caminho de fallback.

## Operating Contract via AgentContext

Cada AgentRun consome um `AgentContext` (existente desde
`AgentContext v0` em 2026-05-06):

- `targetAgent: claude-code` ou `codex`.
- `contextType: agent_run`.
- `sourceKnowledgeIds`: artifact da issue, briefing, gate closure,
  source health.
- `content`: rendered Liquid template do `WORKFLOW.md`, com variaveis
  `issue`, `attempt` preenchidas.

`AgentContext.provenance.createdFrom = "company_brain:agent_run_handoff"`.

## Logging e observabilidade

- Cada AgentRun ganha um logPath persistido (analogo a `cbJobs.logPath`).
- `cbAgentRunSteps` registra timestamps de cada transicao de status.
- `Operating Snapshot` ganha card `Agent Runner` com:
  - runs ativas;
  - retry queue size;
  - ultima run completada;
  - ultima falha;
  - tokens consumidos no dia.
- `Company Operating Map` (#31) renderiza AgentRuns por area:
  Development inicialmente, demais areas quando blueprints existirem.

## O que ja existe e podemos reusar (para nao reinventar)

- `WorkItem` espelhado de GitHub Issues (sync read-only via MCP).
- `Next Work` recommendation com agent prompt markdown ja renderizado.
- `WorkflowBlueprint` Development com 13 steps versionado.
- `WorkflowRun`/`WorkflowStep` com gates e SLA.
- `ExternalActionProposal` + Writeback Policy Matrix para qualquer write
  externo.
- `AgentContext` para handoff.
- `Operating Loop` interno como tick scheduler (sem cron novo).
- `cbJobs` + `cbSessions` para sessoes Claude/Codex existentes.
- `git worktree` ja e parte do workflow Felhen documentado em `~/.claude/CLAUDE.md`.
- `GITHUB_TOKEN` ja existe em `.env.prod` para `github_comment` writeback.

## O que falta criar

Schema:

- `cbAgentRuns` (id, workItemId, workflowRunId nullable, claimState, status,
  attempt, startedAt, finishedAt, sessionId, threadId, turnId, tokens,
  workspacePath, branchName, prUrl nullable, errorSummary, provenance,
  audit_trail).
- `cbAgentRunSteps` (id, agentRunId, phase, status, startedAt, finishedAt,
  detail).
- `cbAgentRunRetries` (issueId, attempt, dueAt, errorSummary, timerHandle
  nullable).
- `cbAgentRunWorkspaces` (workItemId, workspacePath, createdAt, lastReusedAt,
  status).

Tipos shared:

- `AgentRun`, `AgentRunStatus`, `AgentRunClaimState`, `AgentRunStep`,
  `AgentRunRetry`, `AgentRunWorkspace`.
- `WorkflowDefinition` (parsed `WORKFLOW.md`), `WorkflowFrontMatter`,
  `WorkflowTrackerKind` (`github` v0; `linear`/`jira` reservados).

Daemon module `packages/daemon/src/agentRunner/`:

- `workflowLoader.ts` (le e parseia `WORKFLOW.md`, com Liquid renderer).
- `orchestrator.ts` (poll tick, claim/release, dispatch, reconcile).
- `workspaceManager.ts` (worktree create, hooks, cleanup, safety invariants).
- `agentRunner.ts` (subprocess launcher, codex/claude protocol, stdio events).
- `retryQueue.ts` (in-memory + DB hydration).
- `routes.ts` (`GET /agent-runs`, `GET /agent-runs/:id`, `POST
  /agent-runs/:id/cancel`, `POST /agent-runs/start` em modo manual).

UI:

- Card `Agent Runner` em `/company-brain/operating` (Health row).
- Aba `Agent Runs` em `/company-brain` (Brain Admin), filtravel por area
  e status.
- AgentRun detail page com logs streaming + workspace path + branch + PR
  link + token counters.

MCP:

- `get_company_brain_agent_runs` (read-only list).
- `get_company_brain_agent_run` (read-only by id).
- `cancel_company_brain_agent_run` (HITL, para a run mas nao limpa workspace).

WORKFLOW.md:

- Skeleton acima na raiz do repo, versionado.

## Proximo slice (cortavel sem chat)

`AIOS-EXEC-03 v1: Agent Runner schema + WorkflowLoader + workspace manager`:

1. Adicionar tipos shared (`AgentRun`, `AgentRunStatus`, `AgentRunStep`,
   `AgentRunRetry`, `AgentRunWorkspace`, `WorkflowDefinition`).
2. Adicionar tabelas drizzle (`cbAgentRuns`, `cbAgentRunSteps`,
   `cbAgentRunRetries`, `cbAgentRunWorkspaces`).
3. Adicionar `packages/daemon/src/agentRunner/workflowLoader.ts` com
   parser de `WORKFLOW.md` + Liquid renderer com falha estrita em
   unknown vars/filters.
4. Adicionar `WORKFLOW.md` skeleton na raiz do repo.
5. Adicionar `workspaceManager.ts` com git worktree create/cleanup +
   safety invariants + hooks driver com `bash -lc` e `hooks.timeout_ms`.
6. Endpoint `GET /api/company-brain/agent-runner/workflow` (read-only,
   retorna a definicao parseada).
7. Endpoint `GET /api/company-brain/agent-runner/workspaces` (read-only,
   lista workspaces persistidos com status).
8. MCP `get_company_brain_workflow_definition` (read-only).
9. Smoke local: rodar daemon temp, parsear `WORKFLOW.md` e validar Liquid
   render com `issue` mock.

Esse v1 ainda nao roda agentes — entrega so o vocabulario e a infra de
filesystem para o v2 que orquestra. Mantem a constraint da issue de nao
lancar agentes.

`AIOS-EXEC-03 v2: Orchestrator + AgentRunner + RetryQueue`:

1. Implementar `orchestrator.ts` com poll tick acoplado ao Operating
   Loop existente; sem scheduler paralelo.
2. Implementar `agentRunner.ts` que invoca `claude -p` ou
   `codex app-server` em subprocess via `child_process.spawn`, com
   stdio JSON streaming.
3. Implementar `retryQueue.ts` com backoff Symphony.
4. Endpoint `POST /api/company-brain/agent-runner/start` (manual run,
   HITL, comeca um run a partir de um workItemId; ainda nao automatico).
5. UI Agent Runs.
6. MCP `start_company_brain_agent_run` (manual, requer actor + rationale).
7. Smoke real com 1 issue interna controlada (ex: dogfood issue que pede
   apenas para abrir um comentario de teste).
8. Continua off-by-default em producao via env flag
   `AIOS_AGENT_RUNNER_ENABLED=false`.

`AIOS-EXEC-03 v3: Auto-dispatch + reconciliation`:

1. Habilitar dispatch automatico no Operating Loop quando
   `AIOS_AGENT_RUNNER_ENABLED=true`.
2. Reconciliation tick com stall detection + tracker refresh.
3. Cleanup de workspaces de issues fechadas no startup.
4. Card `Agent Runner` no Operating Snapshot.
5. AgentRun reflectido na Company Operating Map (#31).
6. Dogfood multi-issue.

## Acceptance Criteria check

- [x] A compatibility map doc exists in
  `docs/action/aios-symphony-compatibility-map-2026-05-07.md`.
- [x] The doc explicitly states whether v0 uses Symphony sidecar,
  TypeScript port or minimal wrapper, with rationale: **minimal wrapper
  TypeScript no daemon AIOS**.
- [x] AIOS objects required for the runner are listed, including what
  already exists (`WorkItem`, `WorkflowBlueprint`, `WorkflowRun`,
  `WorkflowStep`, `AgentContext`, `Artifact`, `Signal`, `GuidanceItem`,
  `ExternalActionProposal`, `Operating Loop`, `cbJobs`, `cbSessions`,
  `GITHUB_TOKEN`) and what is missing (`cbAgentRuns`, `cbAgentRunSteps`,
  `cbAgentRunRetries`, `cbAgentRunWorkspaces`, `WORKFLOW.md` parser,
  workspace manager, agent runner subprocess).
- [x] The next implementation slice is clear enough for an agent to execute
  without chat history (sections "Proximo slice").
- [x] `git diff --check` clean (this PR is doc-only).
- [x] `npx turbo build` not executed; sem mudanca de codigo.

## Constraints honored

- [x] Do not launch agents automatically in this slice.
- [x] Do not introduce Linear as a dependency. Tracker.kind=github primeira
  classe; linear reservado para adapter futuro.
- [x] Do not add a paid service dependency. Symphony spec adopted as
  contract; sem instalacao Symphony.
- [x] No external writeback beyond already-approved policy gates. Doc-only
  change.
