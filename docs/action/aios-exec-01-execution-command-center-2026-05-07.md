# AIOS-EXEC-01 Execution Command Center v0 - 2026-05-07

## Escopo

Consumo end-to-end da issue `#27 AIOS-EXEC-01: Execution Command Center v0` da
milestone `AIOS Execution Loop v0`. Transformar `/company-brain/operating` de
painel de saude em command center que recomenda o proximo WorkItem e fornece
um agent prompt pronto para colar.

Sem migration de schema, sem connector novo, sem deploy, sem writeback
externo. Sessao isolada por branch e PR.

## O que foi entregue

### Backend (`packages/daemon/src/routes/company-brain.ts`)

- Helpers novos: `parseAcceptanceCriteria` (extrai bullets sob secao `##
  Acceptance Criteria` no body), `slugifyForBranch`,
  `buildNextWorkBranchSuggestion`, `buildNextWorkAgentPrompt`.
- `buildNextWork(data)`: ranqueia `WorkItem` por
  `priorityId > goalId > prefix AIOS- > dueAt > external issue number > id`,
  filtra status ativos (`new/triage/planned/in_progress/review/qa/security_review/reopened/needs_human`)
  e exclui itens com `blockedReason` (esses ja saem em Gate Closure).
  Retorna `recommended` ou `emptyState` com `reason` + `nextSteps`, e totals
  de `activeWorkItemCount/blockedWorkItemCount/doneWorkItemCount`.
- `recommended` traz workItem completo, rationale, priority/goal record
  resumido, acceptanceCriteria, linkedEvidence (source/artifact/signal/
  guidance derivados de `workItemId` em signals/guidance), branchSuggestion
  e agentPromptMarkdown.
- `buildOperatingSnapshot` agora chama `buildNextWork(data)` e devolve o
  resultado em `nextWork`.
- Endpoint `GET /api/company-brain/next-work` para consumo focado.

### Tipos (`packages/shared/src/types.ts`)

- Novos: `CompanyBrainNextWorkRecommendation`, `CompanyBrainNextWork`.
- `CompanyBrainOperatingSnapshot` ganhou campo `nextWork`.

### UI (`packages/web/src/app/company-brain/operating/page.tsx`)

- Section `Next Work` destacada (border primary, bg primary/5) acima dos
  health cards. Mostra title, link externo, area, priority/goal/labels
  como badges, rationale, acceptanceCriteria e branchSuggestion.
- Aside Agent Prompt com `<pre>` do markdown e botoes Copy + Download `.md`.
- Empty state: reason + nextSteps quando nao ha candidato.
- Health cards passaram a viver sob heading `Health` para distinguir
  visualmente das cards de execucao.

### MCP (`packages/mcp-server/src/index.ts`)

- Tool `get_company_brain_next_work` read-only.
- Description de `get_company_brain_operating_snapshot` atualizada para
  citar Next Work.

## Smoke local

DB temporario `/tmp/aios-smoke-next-work.sqlite`, daemon em `127.0.0.1:43185`,
`AIOS_AUTH_DISABLED=true`, `NODE_ENV=development`.

Cenario com seed Felhen Demo v0.1:

```
GET /api/company-brain/next-work
->
recommended.workItem.title = "Felhen Demo v0.1 closed-loop work item"
recommended.workItem.status = "in_progress"
recommended.rationale = [
  "Linked to priority 'Felhen AIOS Demo v0.1 closed loop' (active).",
  "Tied to goal 'Demo Felhen v0.1 accepted' (on_track).",
  "Due by 2026-05-08T20:24:20.377Z."
]
recommended.priority.title = "Felhen AIOS Demo v0.1 closed loop"
recommended.goal.title = "Demo Felhen v0.1 accepted"
recommended.linkedEvidence = {
  sourceIds: ["bzlefYSLPW0n"],
  artifactIds: ["ibLqNb2q0PeT"],
  signalIds: ["SFhPx_hGqU26"],
  guidanceIds: ["2Q5zJqcOO5YY"]
}
recommended.branchSuggestion = "felhen-demo-v0-1-closed-loop-work-item"
recommended.agentPromptMarkdown = "# Agent Prompt: ... ## Operating Contract ..."
candidatesConsidered = 1
totals.activeWorkItemCount = 1
```

`GET /api/company-brain/operating-snapshot` confirma top-level keys com
`nextWork` presente:

```
['generatedAt','overallStatus','summary','totals','cards','nextWork',
 'lastBriefing','latestAgentContext','operatingCadence','gateClosureRitual',
 'sourceHealthReport','timeline','recentEvents']
```

Cenario com DB vazio (segundo daemon `127.0.0.1:43186` com DB novo):

```
GET /api/company-brain/next-work
->
recommended = null
emptyState.reason = "No work items available. Run a GitHub Issues sync or import evidence into the Company Brain."
emptyState.nextSteps = [
  "Run `mcp__aios__sync_company_brain_github_issues` against the active repository.",
  "Review Adoption Dashboard to find sources without work items.",
  "Open a new issue with the AIOS-* prefix for the next planned cut."
]
candidatesConsidered = 0
totals = { activeWorkItemCount: 0, blockedWorkItemCount: 0, doneWorkItemCount: 0 }
```

Cenario com WorkItem historico fechado ainda presente no Company Brain:

```
Daemon local: 127.0.0.1:43187
Sync real GitHub Issues state=open:
lastIssueExternalIds = [
  "antonio-mello-ai/crewdock#31",
  "antonio-mello-ai/crewdock#30",
  "antonio-mello-ai/crewdock#29",
  "antonio-mello-ai/crewdock#28",
  "antonio-mello-ai/crewdock#27"
]

WorkItem stale manual criado:
externalId = "antonio-mello-ai/crewdock#25"
status = "triage"

GET /api/company-brain/next-work
->
recommended.workItem.externalId = "antonio-mello-ai/crewdock#27"
candidatesConsidered = 5
totals.activeWorkItemCount = 5
```

Esse smoke confirma que item historico fora do ultimo sync `open` segue
pesquisavel, mas nao entra na fila recomendada.

## Validacao

- `git diff --check` clean.
- `npx turbo build` 4/4 successful (todos rebuildaram apos as mudancas).
- Operating page passou de 4.4 kB para 5.41 kB no bundle (justificavel pelo
  Next Work UI).

## Production smoke

Production smoke (item do Acceptance Criteria) fica pendente ate o deploy do
PR para CT165 + Cloudflare Pages. Esta sessao nao deploya por instrucao
explicita do usuario. Pos-deploy, validar:

- `GET https://api.felhen.ai/api/company-brain/next-work` -> shape acima.
- `GET https://api.felhen.ai/api/company-brain/operating-snapshot` deve incluir
  `nextWork`.
- Rodar sync GitHub Issues `state=open` antes da checagem visual para atualizar
  `Source.metadata.lastIssueExternalIds`.
- `https://ai.felhen.ai/company-brain/operating` mostra a secao Next Work com
  o WorkItem recomendado da fila real aberta, sem recomendar issues ja fechadas
  que permanecem no Company Brain como historico.
- `mcp__aios__get_company_brain_next_work` em producao retorna recommendation
  consistente.

## Decisoes / friccoes

- **Decisao**: rationale e ranking determinismo, sem score numerico em v0.
  Mantem auditavel (operator pode replicar a logica no head). v1 pode
  introduzir score quando houver mais candidatos com priority/goal iguais.
- **Decisao**: empty state com nextSteps focados em sync (GitHub) +
  adoption dashboard. Cobre os dois caminhos de "nada a fazer": ou faltou
  ingestao, ou faltou linking de WorkItem -> source.
- **Friccao**: WorkItems com prefixo AIOS- mas sem priorityId/goalId
  hoje (issues sincronizadas via `sync_company_brain_github_issues`)
  caem na fila pelo prefixo, mas o agent prompt nao mostra priority/goal.
  Em v1 o adapter pode preencher esses campos por convencao (todas issues
  da milestone ativa => `priorityId` da milestone).
- **Friccao fechada neste PR**: WorkItems historicos de issues fechadas podiam
  continuar como `triage` no Company Brain. O adapter agora atualiza issues
  vistas no sync e grava `lastIssueExternalIds` no Source; o `Next Work` usa a
  lista do ultimo sync `open` para nao recomendar itens que sairam da fila ativa.
- **Friccao**: parse de Acceptance Criteria depende do body seguir
  `## Acceptance Criteria`. Issues abertas no GitHub seguem essa
  convencao via runbook; issues legacy importadas podem nao ter, e
  saem com `acceptanceCriteria=[]`. Nao bloqueia a feature.

## Proximos passos

- Deployar PR para CT165 + Pages, rodar production smoke acima.
- Consumir `#28 AIOS-EXEC-02: WorkItem to GitHub Issue Flow`. Esse corte
  cria/abre issue GitHub a partir de WorkItem ou Guidance e e o caminho
  inverso do sync atual.
