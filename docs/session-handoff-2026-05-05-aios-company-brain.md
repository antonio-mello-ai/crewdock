# Session Handoff - AIOS Company Brain Implementation

Registro local: 2026-05-05 22:11 BRT.

Este handoff existe para a proxima sessao comecar implementacao sem reabrir a estrategia do zero.

## Estado do repo

- Repo: `/Users/antoniomello/felhencloud/projetos/felhen/aios-runtime`
- Branch: `main`
- Commit de referencia documental anterior a esta atualizacao: `6331b3d docs: add aios company brain implementation handoff`
- Estado remoto observado antes desta atualizacao: `main` local estava `ahead 2` de `origin/main`
- Mudancas Company Brain ate aqui sao documentais. Ainda nao existe implementacao de schema/API/UI Company Brain.

Antes de implementar, rode:

```bash
git status -sb
git log -1 --oneline
```

Nao assumir que `eca6ff7` ja foi pushado.

## Fontes de verdade

Ler nesta ordem:

1. `CLAUDE.md`
2. `docs/company-brain-direction.md`
3. `docs/backlog.md`
4. `../../../../corp/docs/action/aios-product-roadmap.md`
5. `../../../../corp/docs/action/aios-yc-thesis-five-week-build-plan-2026-05-05.md`
6. `../../../../corp/docs/estrategia/felhen-autoimprove-core.md`

Observacao: os docs estrategicos AIOS no repo `corp` foram consolidados no commit `41b14d2 docs: consolidate aios yc thesis roadmap`. Mesmo assim, verificar `git -C ../../../../corp status -sb` antes de assumir que nao houve mudanca posterior.

## Decisoes travadas

- O produto AIOS / Company Brain vive neste repo, `aios-runtime`.
- `corp/aios/` continua sendo dataset upstream de cultura, julgamento, qualidade, tom e governanca. Nao e o produto.
- Verticais como ERP, Juntos em Sala, PulsoOnline, saude mental/NR-1, RP e TravelCRM continuam rodando. Elas viram fontes de evidencia, signals, work items, drift e promotion candidates.
- Juntos em Sala segue separado como vertical de escolas. Nao trazer schema escolar para o core deste repo.
- O core deve falar objetos horizontais: `Source`, `Artifact`, `StrategicPriority`, `Decision`, `Signal`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `AlignmentFinding`, `GuidanceItem`, `AgentContext`, `ImprovementProposal`.
- Tickets sao `WorkItem` canonico. GitHub Issues e a primeira superficie humana para dogfood interno. Jira/Linear entram como adapters depois.
- O primeiro Workflow Blueprint e desenvolvimento ticket-to-production.
- O primeiro dogfood externo real e o refactor do ERP em `projetos/erp-desmanches`.
- QMD, embeddings, search e memory sao Context/Retrieval Layer. Nao sao o core operacional.
- O core operacional multi-area precisa modelar sources, artifacts/events, graph, goals/cadence, workflow orchestration, agent runtime, governance, context, writeback, observability/audit e UI.
- Metas e prazos precisam ser objetos operacionais, nao texto solto em roadmap. Prioridades, goals, milestones, work items, workflow runs e guidance devem carregar owner, due date/cadence e status.
- A Felhen deve operar pelo AIOS enquanto constroi o produto: projetos relevantes precisam registrar sources, work items, artifacts, workflow runs, gates, signals, guidance e improvement proposals.

## Estado atual da plataforma

O runtime atual ja tem:

- daemon Hono + SQLite/better-sqlite3 + Drizzle;
- frontend Next.js static export;
- console de agentes;
- terminal PTY;
- schedules/systemd timers;
- jobs/background runs;
- HITL;
- MCP server;
- Cloudflare Access auth;
- push notifications;
- cost tracking;
- workspaces auto-descobertos por `CLAUDE.md`.

Schema atual em `packages/daemon/src/db/schema.ts`:

- `agents`
- `jobs`
- `cost_entries`
- `schedules`
- `sessions`
- `session_messages`
- `push_subscriptions`
- `hitl_requests`

Rotas REST atuais em `packages/daemon/src/routes/`:

- `agents`
- `workspaces`
- `jobs`
- `sessions`
- `costs`
- `hitl`
- `health`
- `terminal`
- `schedules`
- `briefing`
- `push`

Paginas atuais em `packages/web/src/app/`:

- `/`
- `/agents`
- `/console`
- `/costs`
- `/inbox`
- `/jobs`
- `/schedules`
- `/settings`
- `/terminal`

MCP atual em `packages/mcp-server/src/index.ts` expoe ferramentas para briefing, workspaces, sessions, schedules e jobs. Ainda nao expoe Company Brain.

## Gap atual

Ainda nao existem:

- tabelas Company Brain;
- operating architecture kernel;
- source registry;
- raw artifact store;
- strategy layer;
- goal/cadence layer;
- work items canonicos;
- workflow blueprints/runs/gates;
- drift/alignment findings;
- guidance items;
- agent context generator;
- improvement proposals;
- conectores Slack/GitHub/docs com envelope comum;
- UI Company Brain;
- MCP tools Company Brain.
- adoption dashboard para enxergar quais frentes estao em closed loop.

## Dogfood ERP

O refactor do ERP esta sendo usado como primeiro dogfood do fluxo AIOS ticket-to-production.

Estado observado no momento deste handoff:

- Repo: `/Users/antoniomello/felhencloud/projetos/erp-desmanches`
- Issue #18 `[ERP-REF-00] Triage de worktree e contrato de execucao`: fechada em 2026-05-06T01:02:25Z.
- Issue #19 `[ERP-REF-01] Baseline de runtime, testes e ambiente local`: aberta.
- Issue #20 `[ERP-REF-02] Arquitetura base e ownership modular`: aberta.
- Branch ERP atual observada: `codex/erp-ref-01-runtime-tests`.

Como usar no AIOS:

- GitHub Issues do ERP devem entrar como `WorkItem`.
- Comentarios, PRs, testes e docs do ERP devem entrar como `Artifact`.
- O fluxo ERP-REF deve virar primeiro `WorkflowBlueprint` / `WorkflowRun` real.
- Falhas de teste, bloqueios, security issues e residuals devem virar `Signal`.
- Aprendizados recorrentes devem virar `ImprovementProposal`, nao mudanca automatica de core.

Nao fazer o AIOS depender da implementacao do ERP. O ERP e fonte de dogfood, nao pre-requisito arquitetural do runtime.

## Primeiro slice de implementacao recomendado

Objetivo: transformar o runtime de docs + control plane em primeira base consultavel de Company Brain, preservando o runtime atual.

### Slice 1 - Company Brain foundation

Implementar no menor corte util:

1. Tipos em `packages/shared/src/types.ts`.
2. Schema incremental em `packages/daemon/src/db/schema.ts` e `packages/daemon/src/db/client.ts`.
3. Rotas basicas em `packages/daemon/src/routes/`.
4. UI minima em `packages/web/src/app/`.
5. MCP tools minimas em `packages/mcp-server/src/index.ts`.

Objetos minimos do primeiro corte:

- `Source`
- `Artifact`
- `StrategicPriority`
- `Goal`
- `Milestone`
- `WorkItem`
- `WorkflowBlueprint`
- `WorkflowRun`
- `WorkflowStep` ou gate equivalente
- `ArtifactLink`

Objetos que podem entrar no mesmo corte se o diff continuar pequeno:

- `Metric`
- `Cadence`
- `Decision`
- `Signal`
- `AlignmentFinding`
- `GuidanceItem`

Se o diff crescer, deixar `Decision/Signal/Alignment/Guidance` para Slice 2.

### Aceite do Slice 1

- Build passa.
- Runtime atual nao quebra.
- Schema e migrations sao idempotentes.
- Pelo menos uma prioridade estrategica pode ser criada/listada.
- Pelo menos uma meta/prazo/cadencia pode ser ligada a uma prioridade ou work item.
- Pelo menos uma fonte pode ser criada/listada.
- Pelo menos um artifact manual/local-doc pode ser criado/listado.
- Pelo menos um `WorkItem` pode apontar para uma GitHub Issue externa.
- O Development Blueprint v0 existe como dado inicial ou seed.
- Pelo menos um `WorkflowRun` pode apontar para `ERP-REF-01` ou `ERP-REF-02`.
- O sistema consegue apontar work item sem prioridade/meta como `unlinked`.
- UI mostra uma tela minima de Evidence/Workflow ou Strategy.
- MCP consegue listar/criar pelo menos artifacts ou work items.

## Cuidados tecnicos

- O SQLite atual usa `MIGRATIONS_SQL` inline em `packages/daemon/src/db/client.ts` e migracoes incrementais manuais. Antes de adicionar tabelas, seguir esse padrao ou criar uma evolucao explicita, idempotente e testada.
- Nao remover ou renomear tabelas existentes.
- Preservar Cloudflare Access e loopback behavior.
- Preservar `AIOS_AUTH_DISABLED` somente para dev.
- Nao criar schema escolar ou ERP-specific no core.
- Nao acoplar o core a GitHub. Core fala `WorkItem`; GitHub e adapter/surface.
- Nao criar conector que so ingere dado sem provenance e sem caminho para linking/guidance.
- Nao tratar QMD/retrieval como fonte unica de verdade operacional.
- Nao deixar metas e prazos apenas em markdown quando eles impactam workflow/guidance.

## Prompt sugerido para proxima sessao

```text
Estamos em /Users/antoniomello/felhencloud/projetos/felhen/aios-runtime.

Continue do estado atual sem replanejar do zero. Leia primeiro:
- CLAUDE.md
- docs/session-handoff-2026-05-05-aios-company-brain.md
- docs/company-brain-direction.md
- docs/backlog.md
- ../../../../corp/docs/action/aios-product-roadmap.md

Objetivo da sessao: implementar o Slice 1 de Company Brain foundation.

Antes de editar, confirme git status, commit atual, schema atual e rotas atuais. Depois implemente um corte pequeno e validavel:
- tipos compartilhados;
- schema/tabelas idempotentes;
- objetos de goal/milestone/due date/cadence no menor corte util;
- rotas basicas;
- UI minima;
- MCP tool minima;
- seed ou dado inicial do Development Blueprint v0.

Nao mover logica de verticais para o core. ERP e Juntos em Sala entram como fontes/dogfood/adapters, nao como schema do runtime.

Validar com build/testes relevantes e documentar qualquer residual em docs/backlog.md ou nova nota de handoff.
```
