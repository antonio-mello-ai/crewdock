# Company Brain Operational Readiness

Atualizado em 2026-05-06 BRT.

Este documento consolida o estado operacional do AIOS Core / Company Brain depois da fila de foundation, watchers, closed loop, writeback governance, evidence/audit/observability, readiness e Operating Cadence v0.

Fonte runtime dogfood: DB temporario `/tmp/aios-runtime-operating-cadence-dogfood-5.sqlite`, rotas `/api/company-brain/operating-cadence/run`, `/api/company-brain/summary`, `/api/company-brain/core-readiness` e MCP `get_company_brain_operating_cadence`.

## Veredito

O AIOS Core esta minimamente utilizavel como closed loop interno.

Status derivado: `internal_closed_loop_ready`.

Evidencia dogfood:

- 15/15 modulos classificados como `operational`.
- 9/15 modulos classificados como `dogfooded` no DB temporario isolado do corte; o DB historico continua cobrindo os demais dogfoods.
- 0 modulos `missing`.
- 7 modulos ainda sao essencialmente `read_only_only`.
- 1 modulo esta `blocked_by_policy` por design: Writeback Governance para acoes externas mais fortes.
- 0 gaps de uso diario no DB temporario de Operating Cadence; no uso real, gates pendentes continuam sendo o proximo ritual operacional.
- 0 gaps bloqueiam demo interna.
- 1 gap bloqueia design partner readiness: operating pack/runbook.
- 1 gap exige nova mutacao externa: writeback mais forte que comment/reply/label/status allowlisted.
- Operating Cadence dogfood: 2 scheduled watchers ativos, 2 scheduled runs, 2 artifacts, `staleCadenceCount=0`, `dueCadenceCount=0`, `triggerRef=schedule://...`.

## Modulos

| Modulo | Classificacao | Estado |
| --- | --- | --- |
| Company Brain schema | `operational`, `dogfooded` | Objetos horizontais estao modelados e em uso: source, artifact, strategy, goal, work, workflow, closed loop e writeback governance. |
| Source Registry | `operational`, `dogfooded` | Sources carregam area, source type, owner, health, fronteira de provenance e freshness/cadencia derivada de watchers. |
| Artifact Store | `operational`, `dogfooded` | Artifacts guardam evidencia com source, raw_ref, hash, visibility e provenance. |
| Strategy/Goals/Tradeoffs | `operational`, `dogfooded` | Strategy, goals, milestones, decisions e tradeoffs existem como entidades. Tradeoffs precisam de mais exemplos reais. |
| WorkItems/WorkflowRuns | `operational`, `dogfooded` | WorkItems e WorkflowRuns conectam trabalho externo a gates, SLA e evidence. Gates pendentes ainda precisam rotina diaria. |
| Watchers | `operational`, `dogfooded`, `read_only_only` | `watcher-aios-briefing-v0` e `watcher-github-pr-ci-v0` rodam por Operating Cadence v0 com provenance `schedule://`, `nextRunAt` e artifact de snapshot. |
| Signals/Findings/Guidance | `operational`, `dogfooded` | Loop interno classifica evidence e gera guidance com feedback. |
| AgentContext/ImprovementProposal | `operational`, `dogfooded`, `read_only_only` | Conhecimento aprovado vira contexto/proposta interna sem auto-apply. Precisa uso recorrente em handoffs. |
| Source Health | `operational`, `dogfooded`, `read_only_only` | Mostra freshness, sync errors, volumes, watcher activity e gaps de cadencia por source. |
| Adoption Dashboard | `operational`, `dogfooded`, `read_only_only` | Mostra closed-loop stage, writeback maturity e audit readiness por source/projeto. |
| Writeback Governance | `operational`, `dogfooded`, `blocked_by_policy` | Proposal, HITL, preview, retry safety, audit trail e idempotencia estao ativos. Acoes mais fortes continuam bloqueadas. |
| Evidence Packets | `operational`, `dogfooded`, `read_only_only` | Pacotes exportam guidance, hashes, refs, eventos, gaps, GitHub status evidence e audit trail. |
| Audit/Timeline/Graph | `operational`, `dogfooded`, `read_only_only` | Graph, timeline, saved audit views, policy simulator e replay simulator estao em uso. |
| Briefing | `operational`, `dogfooded`, `read_only_only` | AIOS Briefing consolida operacao, writeback safety, audit readiness, execution readiness e operating cadence. |
| MCP coverage | `operational`, `dogfooded` | MCP cobre summary, briefing, adapters, review, writeback governance, audit, graph, timeline, packet export e operating cadence. |

## Gaps reais

### Impedem uso diario

1. `pending_workflow_gates`
   - Existem gates pendentes no workflow dogfood.
   - O valor operacional depende de fechar gates como rotina.
   - Proximo passo: usar WorkflowRun como checklist diario de fechamento.

### Impedem design partner readiness

1. `design_partner_operating_pack`
   - Falta pacote repetivel de demo/onboarding com fronteiras de dados, runbook e historia de uso.
   - Proximo passo: transformar o dogfood Felhen em operating pack de design partner.

### Sao polish

1. `ui_role_polish`
   - A UI esta funcional, mas densa.
   - Proximo passo: so polir depois de friccao concreta em dogfood diario.

### Exigem nova mutacao externa

1. `stronger_writeback_requires_new_approval`
   - Check-run real, assign/unassign, notification read e qualquer acao status-changing exigem novo alvo/policy explicitos.
   - Proximo passo: aprovar um alvo controlado e uma acao Risk B antes de implementar novo executor.

## Uso diario

O AIOS ja pode ser usado diariamente para:

- registrar sources e artifacts com provenance;
- ligar work items e workflow runs;
- enxergar source health e adoption maturity;
- rodar watchers manualmente;
- gerar signals, findings e guidance;
- gerar briefing operacional;
- rodar Operating Cadence v0 para criar briefing + PR/CI poll com provenance `schedule://`;
- revisar writeback governance e evidence packets;
- produzir contextos/propostas internas para agentes.

Ainda falta para uso diario fluido:

- ritual de fechamento de gates/SLA;
- uso recorrente de AgentContext antes de sessoes de agentes;
- manter o briefing como pulso de inicio/fim de dia.

## Demo

Para demo interna, o core esta pronto se a base tiver:

- uma Source real;
- um WorkItem real;
- um WorkflowRun no Development Blueprint;
- um Signal/Finding/Guidance;
- um Evidence Packet ou Writeback Proposal;
- um AIOS Briefing recente.

O dogfood atual cobre esses pontos.

## Design partner

Ainda nao considerar design-partner ready.

Faltam:

- operating pack com narrativa de onboarding;
- seed/demo reproduzivel;
- politica de dados e boundaries por fonte;
- cadencia automatizada operada por schedule aprovado em producao;
- criterios claros de quais writebacks ficam bloqueados;
- runbook para incidentes, retries e revogacao.

## Proximo corte recomendado

Operating Cadence v0 esta implementado internamente e dogfooded em DB temporario, sem instalar timer de producao.

Gate Closure Ritual v0 e AgentContext Daily Handoff v0 estao implementados internamente e dogfooded em DB temporario.

O proximo corte mais importante e **Design Partner Operating Pack v0**:

1. consolidar demo seed, runbooks e fronteiras de dados em um pacote reproduzivel;
2. documentar quais fontes entram, quais writebacks continuam bloqueados e como resetar o dogfood;
3. criar narrativa curta de demo interna/design partner;
4. manter tudo documental/read-only, sem nova mutacao externa.

Nao avancar para novo executor externo antes desse corte.
