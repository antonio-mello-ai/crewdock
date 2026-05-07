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

- Milestone ativa: `AIOS Execution Loop v0` (number=3).
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
- `AIOS-EXEC-NN` para execution loop (command center, work item flow, agent
  launcher, result intake, project pipeline).
- `AIOS-OPS-NN` para operacao de Company Brain (cadence, briefing, gate
  closure, source health) quando precisar virar issue formal alem do backlog.

Exemplos atuais:

- `#26 AIOS-CLEAN-01: AIOS GitHub Pipeline Hygiene`
- `#27 AIOS-EXEC-01: Execution Command Center v0`
- `#28 AIOS-EXEC-02: WorkItem to GitHub Issue Flow`

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
  `Next Work` usa essa lista para nao recomendar issues que sairam da fila ativa
  desde o ultimo sync aberto.
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
4. Atribuir milestone `AIOS Execution Loop v0` enquanto a frente estiver ativa.
5. Preencher template (Context/Goal/Scope/Acceptance/Constraints).
6. Apos abrir, rodar sync read-only para criar `Artifact`/`WorkItem`:
   - `mcp__aios__sync_company_brain_github_issues` ou
   - `POST /api/company-brain/adapters/github/issues/sync`.

## Mutation policy

- Sessoes humano-com-claude podem aplicar labels e fechar issues
  manualmente como parte do trabalho documentado em uma issue ativa.
- Watchers AIOS nao podem mutar issues sem `ExternalActionProposal` aprovada,
  preview registrado e executor real publicado. Hoje executor real existe
  apenas para `github_comment` (Risk B) e `github_label` (Risk B,
  preview-required, allowlist), ambos fora do escopo de Pipeline Hygiene.
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
