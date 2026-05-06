# AIOS Runtime - Company Brain Direction

Este documento alinha o `aios-runtime` com a tese AIOS / Company Brain que a Felhen quer construir nas proximas cinco semanas. A fonte unica de features continua em `corp/docs/action/aios-product-roadmap.md`; este arquivo traduz esse direcional para este repo.

## Decisao

O `aios-runtime` e o projeto dono da evolucao de produto AIOS. Ele deve evoluir de control plane de agentes para runtime + Company Brain / Strategy Execution.

O runtime atual continua valido:

- console de agentes;
- terminal;
- schedules;
- jobs;
- HITL;
- MCP server;
- auth;
- push;
- cost tracking;
- workspaces.

O alvo agora adiciona:

- source connectors;
- Company Brain schema;
- Intelligence Graph;
- Strategy Map;
- Evidence Inbox;
- Drift Inbox;
- Guidance Engine;
- Workflow Blueprint Engine;
- Work Management Layer;
- Agent Context Generator;
- AutoImprove UI/API.

## Fontes de verdade

| Documento | Papel |
|-----------|-------|
| `../../../../corp/docs/action/aios-product-roadmap.md` | Fonte unica de features do produto AIOS / Company Brain. |
| `../../../../corp/docs/action/aios-yc-thesis-five-week-build-plan-2026-05-05.md` | Plano de execucao da janela 06/Mai-10/Jun/2026. |
| `../../../../corp/docs/action/yc-application-company-brain-2026-05-04.md` | Tese submetida ao Y Combinator. |
| `../../../../corp/docs/estrategia/felhen-autoimprove-core.md` | Kernel horizontal de AutoImprove. |
| `../../../../corp/aios/` | Dataset upstream de cultura, julgamento, qualidade, tom e governanca. Nao e o produto. |

Regra: novas features de produto devem ser registradas primeiro no roadmap de produto em `corp`. Este repo pode detalhar implementacao, boundaries e backlog local, mas nao deve manter uma lista concorrente de features.

## Separacao de responsabilidades

| Camada | Dono | O que vive aqui |
|--------|------|-----------------|
| AIOS Runtime / Company Brain | `projetos/felhen/aios-runtime` | Objetos horizontais como `Source`, `Artifact`, `StrategicPriority`, `Decision`, `Signal`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `AlignmentFinding`, `GuidanceItem`, `AgentContext` e `ImprovementProposal`. |
| AutoImprove Core | `corp/docs/estrategia/felhen-autoimprove-core.md` | Contrato horizontal de signal -> hypothesis -> patch -> validation -> impact review -> promotion. |
| Juntos em Sala | `projetos/spadavida/juntos-em-sala` | Produto vertical de escolas, adapter vertical, tenant profile por escola e AutoImprove especifico do dominio. |
| `corp/aios/` | `corp` | Identidade, julgamento, guardrails, criterios de qualidade e governanca upstream. |
| Plataformas externas | Slack, GitHub Issues, Jira, Linear, Google Drive, Teams, Meet, etc. | Superficies humanas e fontes de evidencia conectadas por adapters. |

## Status da separacao com Juntos em Sala

A checagem local deste repo nao encontrou acoplamento real com Juntos em Sala, escolas ou AutoImprove escolar no codigo do `aios-runtime`. O runtime hoje permanece um control plane horizontal.

O Juntos em Sala tem a sua propria trilha de AutoImprove:

- `school_profiles`;
- `autoimprove_signals`;
- `autoimprove_patch_runs`;
- `activity_adaptations`;
- regras de tenant profile por escola;
- adapter vertical de escolas.

Portanto, a resposta pratica e: o projeto de escolas nao parece ter sido movido para dentro do `aios-runtime`. O que existe e uma relacao correta de aprendizado: o Juntos em Sala pode gerar sinais e promotion candidates para o AIOS, mas o dominio escolar deve continuar fora do core horizontal.

## Boundary obrigatorio

- Nao importar tabelas ou semantica escolar para o core do `aios-runtime`.
- Nao criar entidades como `School`, `Student`, `Teacher`, `ActivityAdaptation` ou equivalentes neste repo, exceto se estiverem encapsuladas em um adapter externo muito claro.
- O core deve falar objetos horizontais: `Source`, `Artifact`, `Signal`, `WorkItem`, `WorkflowBlueprint`, `WorkflowRun`, `GuidanceItem` e `ImprovementProposal`.
- Aprendizado vindo do Juntos entra como `Signal`, `Artifact`, `ImprovementProposal` ou `PromotionRecord`, nunca como copia direta de regra escolar.
- Configuracao local de cliente/tenant continua no vertical ou em adapter de tenant profile, nao no core global.
- Promocao para o AIOS exige evidencia recorrente, validation gate e review humano quando tocar comportamento transversal.

## Loop fechado que este repo precisa materializar

Todo fluxo novo deve ajudar a fechar este loop:

1. `Intent`: estrategia, prioridade, tradeoff, decisao ou padrao esperado.
2. `Evidence`: artifact de Slack, meeting, doc, ticket, PR, metrica, cliente ou agente.
3. `Interpretation`: extracao de decisao, signal, owner, risco, work item, status ou pergunta aberta.
4. `Linking`: conexao com prioridades, decisoes, workflows, agentes e artifacts relacionados.
5. `Drift`: classificacao de alinhado, fraco, contraditorio, obsoleto ou desconhecido.
6. `Guidance`: proxima acao para humano, time, agente ou sistema.
7. `Action`: resposta no canal certo, doc atualizado, ticket criado, spec gerada, agente acionado ou proposta criada.
8. `Feedback`: aceite, rejeicao, reply, merge, rollback, metrica ou follow-up.
9. `Learning`: signal vira proposal, patch, validation, impact review e promotion.

Se uma feature so ingere informacao e nao ajuda a fechar o loop, ela e suporte, nao core.

## Mapa de implementacao neste repo

| Area | Pasta inicial | Direcional |
|------|---------------|------------|
| Tipos canonicos | `packages/shared/src/types.ts` | Adicionar tipos horizontais de Company Brain e workflow. |
| Schema | `packages/daemon/src/db/schema.ts` | Adicionar tabelas para sources, artifacts, priorities, decisions, signals, work items, workflow blueprints/runs/gates, findings, guidance e proposals. |
| API | `packages/daemon/src/routes/` | Criar rotas por modulo: sources, artifacts, strategy, workflows, work-items, guidance e autoimprove. |
| UI | `packages/web/src/app/` | Criar telas de Strategy Map, Evidence Inbox, Drift Inbox, Workflow Runs e Guidance. |
| MCP | `packages/mcp-server/src/index.ts` | Expor ferramentas para agentes criarem/lerem artifacts, work items, workflow runs e guidance. |
| Auth/tenancy | `packages/daemon/src/middleware/` e `docs/auth-rollout.md` | Preservar CF Access e preparar separacao de fonte/tenant antes de qualquer piloto externo. |

## Primeiro slice recomendado

1. Criar schema minimo de Company Brain.
2. Criar `WorkItem` canonico com `external_provider`, `external_id` e `external_url`.
3. Criar `WorkflowBlueprint` e `WorkflowRun`.
4. Registrar o Development Blueprint v0:

   `ticket -> triagem -> plano -> execucao -> revisao -> plano de testes -> testes -> QA visual -> security QA -> deploy gate -> deploy + monitoramento -> fechamento -> documentacao oficial`

5. Implementar `Evidence Inbox` simples para artifacts manuais/local docs.
6. Implementar `Strategy Map` simples com prioridades e evidencias ligadas.
7. Implementar adapter inicial para GitHub Issues ou modo nativo espelhavel de `WorkItem`.
8. Gerar o primeiro `WorkflowRun` real a partir de um ticket pequeno deste repo.
9. Registrar failures/residuais como novos signals ou work items.
10. Fazer o fechamento do run atualizar docs oficiais.

## O que nao fazer agora

- Criar um projeto novo para a tese AIOS.
- Transformar cada vertical em AIOS.
- Mover o self-improving do Juntos em Sala para dentro deste repo.
- Acoplar o core a Jira antes de existir `WorkItem` canonico.
- Criar conectores que so fazem ingestao passiva sem linkage, drift, guidance ou feedback.
- Colocar listas paralelas de features fora do roadmap central.
