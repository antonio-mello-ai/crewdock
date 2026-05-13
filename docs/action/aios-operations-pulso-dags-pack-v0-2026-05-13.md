# AIOS Operations Pack v0 - Pulso DAGs

Este documento define a skill operacional `operations.pulso_dags`. Ela vive no AIOS Runtime e deve ser consumida por qualquer canal ou agente: Telegram, MCP/Codex, schedule futuro ou UI. Telegram e apenas transporte.

## Objetivo

Responder pedidos como:

- "olha as DAGs do Pulso"
- "verifica se as DAGs rodaram"
- "teve problema no Airflow?"
- "as tabelas foram preenchidas?"
- "tem pipeline de dados com erro?"

O resultado esperado e um relatorio operacional curto, read-only primeiro, com evidencias, impacto e proximas acoes. A skill nao deve virar artifact por padrao.

## Onde executar

Workspace default:

```text
/mnt/felhencloud/projetos/marketplace_data_intelligence/pulsoonline-backend
```

Fontes locais esperadas:

- `AGENTS.md`
- `.claude/skills/dag-check.md`
- `docs/architecture/etl-flow.md`
- `apps/dags/*.py`

O runtime resolve esse workspace em `POST /api/company-brain/agent-routing/resolve`. Clientes nao devem manter roteamento hardcoded por canal.

## Regras obrigatorias

1. Comecar read-only.
2. Ler `AGENTS.md` e `.claude/skills/dag-check.md` quando existirem.
3. Usar hostnames do SSH config, nao IP direto.
4. Consultar metadados do Airflow no PostgreSQL quando necessario; em historico Pulso isso foi mais confiavel que apenas CLI.
5. Separar status de execucao, erro estrutural, frescor/volume de tabelas e impacto no cliente.
6. Categorias de DAGs ativas devem ser mutuamente exclusivas: rodaram ok, falharam, fora do schedule, anomalia.
7. Se uma DAG falhou e depois teve rerun com sucesso, reportar como ruido historico salvo se houver impacto restante.
8. Nao executar restart, rerun, retry, unpause, backfill, deploy ou alteracao em servico sem pedido explicito do usuario.
9. Se houver acao corretiva recomendada, listar como HITL: `acao sugerida`, `risco`, `comando aproximado` quando seguro.
10. Resposta para Telegram deve ficar abaixo de 4000 caracteres quando possivel.

## Formato de resposta

```text
DAGs Pulso - status de hoje
Estado: verde|atencao|incidente

Resumo:
- X rodaram ok
- Y falharam
- Z fora do schedule
- W anomalias

Evidencia:
- ...

Impacto:
- ...

Proxima acao:
- ...

HITL:
- nada executado / confirmar antes de rerun / confirmar antes de restart
```

## Politica de memoria

Nao criar Artifact para cada briefing operacional.

Persistir no Company Brain somente quando houver:

- incidente real ou degradacao com evidencia;
- falha repetida que deva virar guidance, watcher ou work item;
- decisao operacional reutilizavel;
- aprendizado estrategico para produto/processo;
- promocao explicita pelo humano.

Saida verde ou investigacao pontual sem aprendizado novo deve ser efemera.

## Encaixe com Cofounder / areas

Esta skill pertence a `Operations`, mas pode ser invocada a partir de qualquer canal. O fluxo correto e:

```text
mensagem -> AIOS Command Router -> agent-routing/resolve -> skill operations.pulso_dags -> agente no workspace Pulso
```

Assim a regra fica compartilhada entre agentes e nao presa ao bot Telegram.
