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
- `docs/operations/monitoring.md`
- `docs/operations/ssh-connections.md`
- `apps/dags/*.py`

O runtime resolve esse workspace em `POST /api/company-brain/agent-routing/resolve`. Clientes nao devem manter roteamento hardcoded por canal.

## Fonte de verdade atual

O Airflow produtivo atual roda na GCP:

```text
project: felhen-pulso-live-prod
zone: southamerica-east1-b
host: pulso-live-airflow
```

VM200, `airflow-200` e metastore `postgres-201` sao contexto legado/rollback frio. Nao usar esses hosts para responder status atual de DAGs. Se alguma skill/doc local ainda apontar para VM200 como producao, tratar como contexto desatualizado e preferir `docs/operations/monitoring.md`, `docs/operations/ssh-connections.md` e o runtime GCP.

## Regras obrigatorias

1. Comecar read-only.
2. Ler `AGENTS.md`, `docs/operations/monitoring.md`, `docs/operations/ssh-connections.md` e `.claude/skills/dag-check.md` quando existirem.
3. Usar `gcloud compute ssh pulso-live-airflow --project=felhen-pulso-live-prod --zone=southamerica-east1-b --tunnel-through-iap` para Airflow live quando acesso direto por Tailscale nao estiver previamente configurado.
4. Consultar metadados do Airflow dentro do container GCP quando necessario; em historico Pulso isso foi mais confiavel que apenas CLI.
5. Separar status de execucao, erro estrutural, frescor/volume de tabelas e impacto no cliente.
6. Categorias de DAGs ativas devem ser mutuamente exclusivas: rodaram ok, falharam, fora do schedule, anomalia.
7. Se uma DAG falhou e depois teve rerun com sucesso, reportar como ruido historico salvo se houver impacto restante.
8. Nao executar restart, rerun, retry, unpause, backfill, deploy ou alteracao em servico sem pedido explicito do usuario.
9. Se houver acao corretiva recomendada, listar como HITL: `acao sugerida`, `risco`, `comando aproximado` quando seguro.
10. Resposta para Telegram deve ficar abaixo de 4000 caracteres quando possivel.

## Comandos base read-only

```bash
# Import errors
gcloud compute ssh pulso-live-airflow \
  --project=felhen-pulso-live-prod \
  --zone=southamerica-east1-b \
  --tunnel-through-iap \
  --command "docker exec airflow_airflow-apiserver_1 airflow dags list-import-errors"

# Lista de DAGs
gcloud compute ssh pulso-live-airflow \
  --project=felhen-pulso-live-prod \
  --zone=southamerica-east1-b \
  --tunnel-through-iap \
  --command "docker exec airflow_airflow-scheduler_1 airflow dags list"

# DagRuns running/queued direto no metastore via Airflow session
gcloud compute ssh pulso-live-airflow \
  --project=felhen-pulso-live-prod \
  --zone=southamerica-east1-b \
  --tunnel-through-iap \
  --command "docker exec -i airflow_airflow-scheduler_1 python - <<'PY'
from airflow.models.dagrun import DagRun
from airflow.utils.session import create_session
with create_session() as session:
    rows = session.query(DagRun.dag_id, DagRun.run_id, DagRun.state, DagRun.start_date).order_by(DagRun.start_date.desc()).limit(30).all()
for row in rows:
    print('\\t'.join(str(x) for x in row))
PY"
```

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
