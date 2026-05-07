# AIOS GitHub Roadmap Reset - 2026-05-07

## Objetivo

Separar o roadmap ativo de AIOS / Company Brain do backlog herdado do CrewDock runtime,
sem apagar a plataforma antiga e sem perder contexto historico.

## Resultado GitHub

Milestone criada:

- `AIOS Execution Loop v0`

Labels criadas/normalizadas:

- `aios`
- `company-brain`
- `execution-loop`
- `product-surface`
- `runtime-admin`
- `legacy-runtime`
- `icebox`
- `superseded`
- `dogfood`
- `cleanup`

## Issues antigas

As issues antigas `#1` a `#6` foram preservadas com comentario de triagem,
labels de legado/icebox/superseded e fechamento `not planned`.

Elas deixam de competir com o roadmap ativo de Company Brain, mas continuam
pesquisaveis caso alguma necessidade de Runtime Admin volte a ser prioridade.

## Fila ativa inicial

| Issue | Titulo | Papel |
| --- | --- | --- |
| `#25` | `AIOS-CLEAN-00: Product Surface Split` | Separar AIOS produto de Runtime Admin legado |
| `#26` | `AIOS-CLEAN-01: AIOS GitHub Pipeline Hygiene` | Manter GitHub Issues como fila limpa e sincronizavel |
| `#27` | `AIOS-EXEC-01: Execution Command Center v0` | Fazer a tela responder "o que faco agora?" |
| `#28` | `AIOS-EXEC-02: WorkItem to GitHub Issue Flow` | Gerar issue GitHub governada a partir de WorkItem/Guidance |
| `#29` | `AIOS-EXEC-03: Symphony-compatible Agent Runner` | Usar Symphony como referencia para execucao de WorkItems por agente |
| `#30` | `AIOS-EXEC-04: Session Result Intake` | Transformar resultado de sessao em evidence/follow-up |
| `#31` | `AIOS-EXEC-05: Project Pipeline View` | Ver pipeline por projeto/repo/gate/PR |

## Atualizacao Company Operating Map

Em 07/Mai/2026, apos benchmark de produto contra Cofounder e alinhamento com o
roadmap do `corp`, a fila foi expandida:

| Issue | Titulo | Papel |
| --- | --- | --- |
| `#31` | `AIOS-EXEC-05: Company Operating Map v0` | Ver a empresa por areas/projetos com WorkItems, agent runs, gates e evidence |
| `#37` | `AIOS-EXEC-06: Company Command Router v0` | Transformar solicitacao humana em WorkItem/run/proposal roteada por area |
| `#38` | `AIOS-EXEC-07: Area Blueprint Registry v0` | Registrar areas, owners, agentes e blueprints iniciais |
| `#39` | `AIOS-EXEC-08: Goal-to-Execution Superoptimizer v0` | Transformar objetivos de negocio em execucao multi-area mensuravel |
| `#40` | `AIOS-EXEC-09: Agent Run Evaluation Loop v0` | Avaliar runs agentic e promover aprendizado |

Sync read-only em producao reconciliou a fila aberta atual apos `#39/#40`:

- `issuesSeen=7`;
- `lastIssueNumbers=[40,39,38,37,31,30,29]`;
- `workItemsCreated=2`;
- `workItemsUpdated=5`;
- `Next Work` segue recomendando `#29 AIOS-EXEC-03: Symphony-compatible Agent Runner`;
- `candidatesConsidered=7`.

## Consumo da fila

Regra operacional:

1. Issue e o WorkItem humano/agente.
2. Branch/PR implementa uma issue especifica.
3. PR deve referenciar a issue no corpo.
4. Company Brain deve sincronizar as issues como Artifact + WorkItem.
5. Session result deve voltar como Artifact/Signal/Finding/Guidance antes de fechar ciclo.

## Status Company Brain

Foi executado sync read-only de GitHub Issues para `antonio-mello-ai/crewdock`
em producao via endpoint:

`POST /api/company-brain/adapters/github/issues/sync`

O primeiro sync criou Source `AIOS GitHub Issues active roadmap` e WorkItems
para as issues inicialmente visiveis pelo GitHub Issues REST list endpoint.
Um segundo sync, apos a listagem REST refletir a fila completa, registrou as
issues restantes.

Resultado final:

- `issuesSeen=7`
- `artifactsCreated=7`
- `workItemsCreated=7`
- Source `AIOS GitHub Issues active roadmap` saudavel em producao

## Primeiro consumo

O primeiro item consumido e `#25 AIOS-CLEAN-00: Product Surface Split`.

Branch:

- `aios-clean-00-product-surface-split`

PR:

- `#32 AIOS-CLEAN-00: split product surface from runtime admin`

Escopo:

- fazer `/company-brain/operating` virar a entrada principal;
- preservar o overview antigo em `/runtime`;
- agrupar Console, Terminal, Jobs, Schedules, Costs, Inbox e Settings sob Runtime Admin;
- deixar `/company-brain` como Brain Admin / Build Mode.

Company Brain observability:

- `POST /api/company-brain/operating-cadence/run`
- `scheduleId=dogfood:aios-github-pipeline-pr-32`
- `watcherRunsCreated=2`
- `artifactsCreated=2`
- `signalsCreated=8`
- PR/CI artifact `_D8r6icRLvzL`
- briefing artifact `F5tSkeY5YWNw`
