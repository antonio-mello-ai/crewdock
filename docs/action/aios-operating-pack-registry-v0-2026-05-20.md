# AIOS Operating Pack Registry v0

## Decisao

O AIOS passa a tratar Operating Packs como objetos canonicos read-only no
Company Brain. Um pack nao e um bot, canal ou script solto. Ele e uma rotina
reutilizavel por area, com owner, canais, entrypoints, risk ceiling, action
policy, memory policy, docs e metricas de sucesso.

Este corte nao cria tabela nova nem editor de packs. O registry v0 e derivado em
codigo para consolidar os packs que ja existem sem abrir uma superficie mutavel
antes da governanca estar pronta.

## Packs seedados

| Pack | Area | Execucao | Policy |
| --- | --- | --- | --- |
| `marketing.nr1` | marketing | `operating_pack_runner` | cria artifacts apenas por promocao explicita |
| `operations.pulso_dags` | operations | `agent_route_skill` | observe-only, sem rerun/restart/backfill |
| `development.pr_ci` | development | `watcher_adapter` | observe-only/proposal-only para writeback |

## Contrato v0

- API read-only: `GET /api/company-brain/operating-packs`.
- MCP read-only: `get_company_brain_operating_pack_registry`.
- UI: card `Operating Pack Registry` em `/company-brain/operating`.
- Command Router e Agent Routing Resolver consomem `routingHints` do registry para
  matches de packs/skills aprovados.
- Nenhum novo writeback externo.
- Nenhum novo segredo.
- Nenhuma tabela nova.
- Canais como Telegram, MCP e web continuam transporte. A orquestracao fica no
  AIOS: area, blueprint, source, artifact, guidance, work item, proposal e agent
  run.

## Proximo corte natural

1. Adicionar health por pack: ultimo uso, ultimo artifact, ultimo erro e guidance
   aberta.
2. Promover o registry para schema persistente apenas quando houver necessidade
   real de criar/pausar/versionar packs pela UI.
3. Definir review flow para pack novo: docs -> preview -> policy -> dogfood ->
   active.
