# AIOS GitHub Issues Runbook

Convencoes para abrir, classificar e consumir GitHub Issues como fila ativa do
AIOS / Company Brain. Aplica-se ao repo `antonio-mello-ai/crewdock`.

Issues GitHub sao a fila de trabalho humano-legivel do AIOS. Cada issue ativa
deve ter um WorkItem espelho no Company Brain (read-only) para que agentes
consigam recomendar/consumir sem ler chat history.

Source de verdade do produto: `corp/docs/action/aios-product-roadmap.md`.
Boundary local: `docs/company-brain-direction.md`. Backlog implementacional:
`docs/backlog.md`.

## Estado da fila

- Milestone ativa: `AIOS Agent Execution v8` (number=11).
- Milestone anterior `AIOS Agent Execution v7` (number=10) foi fechada em
  2026-05-08 com issues `#115` a `#119` concluídas.
- Active queue: issues abertas com label `aios` + milestone ativa.
- Legacy queue: issues fechadas marcadas com pelo menos uma de
  `legacy-runtime`, `runtime-admin`, `icebox` ou `superseded`. Permanecem
  pesquisaveis mas ficam fora do roadmap atual.

## Labels canonicas

Roadmap AIOS / Company Brain:

| Label | Quando usar |
|-------|-------------|
| `aios` | Qualquer trabalho do roadmap AIOS / Company Brain. |
| `company-brain` | Tocar kernel horizontal (artifact, signal, work item, guidance, agent context, autoimprove). |
| `execution-loop` | Loop work item -> agent session -> result intake -> QA. |
| `product-surface` | UI/navegacao do produto (`/company-brain`, `/company-brain/operating`). |
| `cleanup` | Higiene de produto/repo, separacao de escopo. |
| `dogfood` | Trabalho validado/dirigido por dogfood real. |

Classificacao de fechado/legado:

| Label | Quando usar |
|-------|-------------|
| `legacy-runtime` | Item CrewDock anterior ao AIOS. Fora do roadmap atual mas mantido para historico. |
| `runtime-admin` | Superficie de runtime/admin herdada do CrewDock (Console, Terminal, Jobs, Schedules, etc.). |
| `icebox` | Preservado para depois. Nao esta no roadmap ativo. |
| `superseded` | Substituido por direcionamento AIOS / Company Brain mais novo. |

Categorizacao tradicional ainda usada quando aplicavel: `bug`, `enhancement`,
`security`, `scalability`, `best-practices`, `documentation`.

## Convencao de titulo

Issues do roadmap AIOS usam prefixo:

- `AIOS-CLEAN-NN` para limpeza de pipeline / produto / repo.
- `AIOS-EXEC-NN` para execution loop e product surface operacional (command
  center, work item flow, Symphony-compatible runner, result intake, company
  operating map, command router, area blueprint registry, goal-to-execution,
  agent-run evaluation).
- `AIOS-RUN-NN` para substrato de execucao agentic (AgentRun schema,
  WorkflowLoader, workspace manager, dry-run orchestrator, result UI,
  evaluation-to-improvement).
- `AIOS-OPS-NN` para operacao de Company Brain (cadence, briefing, gate
  closure, source health) quando precisar virar issue formal alem do backlog.

Exemplos atuais:

- `#26 AIOS-CLEAN-01: AIOS GitHub Pipeline Hygiene`
- `#27 AIOS-EXEC-01: Execution Command Center v0`
- `#28 AIOS-EXEC-02: WorkItem to GitHub Issue Flow`
- `#29 AIOS-EXEC-03: Symphony-compatible Agent Runner`
- `#31 AIOS-EXEC-05: Company Operating Map v0`
- `#39 AIOS-EXEC-08: Goal-to-Execution Superoptimizer v0`
- `#40 AIOS-EXEC-09: Agent Run Evaluation Loop v0`
- `#48 AIOS-RUN-01: AgentRun schema and lifecycle v1`
- `#49 AIOS-RUN-02: WorkflowLoader and WORKFLOW.md skeleton`

Issues legacy (#1 a #24, milestones `v1.4.0`, `v1.5.0`) usavam prefixos
diferentes (`sec:`, `perf:`, `ops:`, `test:`). Manter como esta; nao renomear.

## Estrutura recomendada do corpo

```markdown
## Context
<por que essa issue existe; link com WorkItem/guidance no Company Brain quando relevante>

## Goal
<resultado esperado em uma frase curta>

## Scope
- <bullets do que entra>

## Acceptance Criteria
- <conditions of done verificaveis (build, sync, doc, dogfood)>

## Constraints
- <bloqueios explicitos: risk class, writeback proibido, secrets, deploy>
```

## Mapping issue -> Company Brain WorkItem

Issues GitHub sao espelhadas (read-only) para o Company Brain via adapter
GitHub Issues. Por issue visivel no filtro do sync, esperar:

- `Source` `AIOS GitHub Issues active roadmap` (reusado, nao recriado).
- `Artifact` `github_issue` por issue, com `rawRef` apontando para a URL HTML
  do GitHub e provenance `adapter:github_issues`.
- `WorkItem` canonico com `externalProvider=github`,
  `externalId=antonio-mello-ai/crewdock#<issue number>`, `externalUrl`,
  status `triage` para issue aberta ou `done` para issue fechada, owner
  derivado de assignees, labels e milestone copiados do GitHub.
- WorkItem provenance: `adapter:github_issues:work_item`.

Adapter:

- API: `POST /api/company-brain/adapters/github/issues/sync`.
- MCP tool: `mcp__aios__sync_company_brain_github_issues`.

Modo: read-only. Nao escreve em GitHub.

Comportamento:

- Sync cria/deduplica e atualiza `Artifact`/`WorkItem` quando a issue aparece no
  resultado do adapter.
- Quando rodado com `state=open`, o Source registra `lastIssueExternalIds`; o
  `Next Work` usa o ultimo sync aberto do repo para nao recomendar issues que
  sairam da fila ativa, mesmo quando historico antigo ainda aponta para um
  Source anterior.
- Sync nao apaga `WorkItem` quando a issue some do filtro. Items historicos
  seguem pesquisaveis, mas ficam fora da recomendacao de proximo trabalho quando
  nao aparecem no ultimo sync `open`.
- Issues com prefixo `AIOS-` viram WorkItems sob prioridade do roadmap quando
  associacao manual existe; demais ficam visiveis em Adoption Dashboard com gap
  `no_priority_or_goal`.

## Como consumir a fila como agente

1. Ler estado do Company Brain antes de tudo:
   - `mcp__aios__get_company_brain_operating_snapshot` ja inclui o card
     `Next Work` derivado.
   - `mcp__aios__get_company_brain_next_work` se quiser apenas o
     recommendation (com agentPromptMarkdown pronto para colar).
   - `mcp__aios__get_company_brain_summary` para inspecionar kernel completo.
   - `mcp__aios__generate_company_brain_daily_agent_handoff` se a sessao for
     "diaria/contextual" e nao houver handoff fresco.
2. Identificar a proxima issue:
   - Preferencialmente, usar o `Next Work` recommendation (ranking determinismo:
     priority > goal > prefixo `AIOS-` > `dueAt` > issue number ascendente).
   - Listar issues abertas da milestone ativa via `gh issue list --milestone
     "AIOS Execution Loop v0" --state open` ordenadas por numero.
   - Ou ler WorkItems com `externalProvider=github` no Company Brain summary.
   - Ou ler `Adoption Dashboard` para ver gaps por source.
3. Validar que a issue tem `Acceptance Criteria` e `Constraints` legiveis. Se
   nao tiver, abrir comentario sugestivo (HITL) em vez de implementar; nao
   inferir escopo.
   - Para work de produto/superficie, validar tambem o direcional do
     `Company Operating Map`: areas/departamentos, work items, agent runs,
     blockers, HITL, gates, evidence, guidance e drilldown de provenance.
   - Para work de superoptimization/evaluation, validar que o escopo nao vira
     automacao generica: precisa preservar goal, metrica, evidence, policy,
     outcome e aprendizado no Company Brain.
4. Criar branch a partir de `origin/main`:
   `<aios-issue-key>-<short-slug>` (ex.: `aios-clean-01-pipeline-hygiene`).
5. Implementar no escopo da issue. Parar antes de:
   - Writeback externo nao previsto pela issue.
   - Mudanca de secret/permissao nao listada.
   - Deploy nao instruido.
   - Ambiguidade real de produto. Nesse caso, abrir comentario na issue.
6. Validar antes de commitar:
   - `git diff --check`
   - `npx turbo build` se mexer em codigo.
   - Smoke test relevante para o escopo (ex: `mcp__aios__sync_*` apos mudar
     adapter).
7. Commit + PR contra `main`. Titulo do PR usa o prefixo da issue, ex:
   `AIOS-CLEAN-01: pipeline hygiene runbook + legacy label cleanup`. Linkar a
   issue na descricao (`Closes #26`).
8. Registrar resultado em `docs/action/<topic>-<date>.md` quando o trabalho
   produzir aprendizado durador (cycle dogfood, decisao de produto, friccao
   nova). Mudancas internas sem aprendizado novo nao precisam.

## Como abrir uma issue AIOS

1. Confirmar que o trabalho esta no roadmap (`corp/docs/action/aios-product-roadmap.md`)
   ou no backlog deste repo (`docs/backlog.md`). Se nao estiver, abrir a
   discussao ali primeiro; issues GitHub sao a saida operacional, nao a fonte.
2. Escolher prefixo de titulo (`AIOS-CLEAN-NN`, `AIOS-EXEC-NN`, `AIOS-OPS-NN`)
   incrementando o ultimo numero usado.
3. Aplicar labels `aios` + outras pertinentes.
4. Atribuir a milestone ativa declarada em `WORKFLOW.md`.
5. Preencher template (Context/Goal/Scope/Acceptance/Constraints).
6. Apos abrir, rodar sync read-only para criar `Artifact`/`WorkItem`:
   - `mcp__aios__sync_company_brain_github_issues` ou
   - `POST /api/company-brain/adapters/github/issues/sync`.
   - O adapter GitHub Issues deve usar `filter=all` na REST API; sem isso,
     o GitHub retorna apenas issues atribuídas ao token e o `next-work` pode
     ficar vazio mesmo com issues abertas.

## Symphony-compatible Agent Runner (planejado, v1+)

O AIOS adotou o spec OpenAI Symphony como contrato de orquestracao para
agent runs (decisao em
`docs/action/aios-symphony-compatibility-map-2026-05-07.md`). A implementacao
roda como minimal wrapper em TypeScript no daemon AIOS, sem sidecar Elixir
e sem TypeScript port completo. As entidades AIOS existentes (`WorkItem`,
`WorkflowBlueprint`, `WorkflowRun`, `WorkflowStep`, `AgentContext`,
`Artifact`, `Signal`, `GuidanceItem`, `ExternalActionProposal`,
`Operating Loop`) sao reusadas; o runner adiciona `cbAgentRuns`,
`cbAgentRunSteps`, `cbAgentRunRetries`, `cbAgentRunWorkspaces` e o
`WorkflowLoader` parser de `WORKFLOW.md` (versionado em-repo).

Em v0 (compatibility map) so existe o doc. Cuts v1/v2/v3 implementam
schema + workspace manager, depois orchestrator + agent subprocess +
retry queue, depois auto-dispatch + reconciliation + UI. Ate la, sessoes
de implementacao continuam abrindo branch/PR manualmente seguindo este
runbook. Agent nao recebe `GITHUB_TOKEN` diretamente: writeback continua
mediado por `ExternalActionProposal` + Writeback Policy Matrix.

## WorkItem -> GitHub Issue

Um WorkItem do Company Brain pode virar draft de issue GitHub via
`mcp__aios__create_company_brain_github_issue_create_proposal` (gera proposal
persistida) e `mcp__aios__preview_company_brain_github_issue_create_proposal`
(dry-run). O preview produz title, body com marker de idempotency, labels e
milestone, e grava `github_issue_create_previewed` no audit trail. Idempotency
e por `repo + workItemId + title`: re-criar a mesma combinacao retorna
`reused=true` com a proposal original.

Criacao real no GitHub existe apenas pelo executor governado
`mcp__aios__execute_company_brain_github_issue_create_writeback`, com:

- repo allowlisted em `AIOS_GITHUB_ISSUE_CREATE_ALLOWLIST`;
- `GITHUB_TOKEN`/`GH_TOKEN`;
- Risk B + `actionPolicy=writeback_allowed`;
- HITL approval com actor/rationale;
- preview posterior a aprovacao;
- Retry Safety sem mismatch de payload/destination/idempotency;
- dedupe por marker no body antes de chamar `POST /issues`.

Ao completar, a proposal recebe `externalId/externalUrl` e o WorkItem passa a
apontar para a issue criada em `externalProvider/externalId/externalUrl`.

## Mutation policy

- Sessoes humano-com-claude podem aplicar labels e fechar issues
  manualmente como parte do trabalho documentado em uma issue ativa.
- Watchers AIOS nao podem mutar issues sem `ExternalActionProposal` aprovada,
  preview registrado e executor real publicado. Hoje executor real existe
  apenas para `github_comment` (Risk B), `github_label` (Risk B,
  preview-required, allowlist) e `github_status` (Risk B, allowlist private
  repo) e `github_issue_create` (Risk B, allowlisted internal repo).
  `github_check` permanece preview-only ate executor proprio + dogfood.
- Acoes bloqueadas por default no AIOS: close, reopen, merge, deploy, delete,
  permissions, secrets, customer repos. Ver `docs/writeback-policy-matrix.md`
  para a matriz canonica.

## Reconciliacao com `docs/backlog.md`

`docs/backlog.md` lista os cortes de implementacao com status incremental
(`Status XXX v0 em YYYY-MM-DD: ...`). Ao concluir uma issue AIOS:

1. Marcar o checkbox correspondente no backlog.
2. Adicionar uma linha `Status` curta com o resumo do corte.
3. Mencionar o numero da issue no commit (`Closes #NN`) para fechar
   automaticamente apos merge.

Quando uma issue eh fechada como `not planned`, registrar a decisao em uma
linha `Status` ou no doc de acao do dia, e aplicar `superseded`/`icebox`
conforme apropriado.
