# AIOS Telegram Command Layer v0

Este documento define como comecar a usar os bots Telegram existentes sem recriar os mesmos agentes com nomes diferentes. A decisao e tratar Telegram como canal de entrada e resposta, nao como a unidade de orquestracao. A unidade de orquestracao fica no AIOS: area, blueprint, source, artifact, guidance, work item, proposal e agent run.

## Decisao

Nao criar novos bots por area no v0.

Usar os tres services existentes como canais:

| Service atual | Papel v0 | Area default | Observacao |
| --- | --- | --- | --- |
| `claude-telegram-dev.service` | Canal tecnico/operacional | development/operations/platform | Bom para comandos sobre repos, DAGs, servidor e status |
| `claude-telegram-estrategista.service` | Canal estrategia/marketing | strategy/marketing/sales | Bom para briefing NR-1, conteudo, prioridades e proximos passos |
| `claude-telegram-vendas-k2.service` | Canal especializado K2/Vendas | sales/customer | Manter isolado ate avaliarmos se deve entrar no command router geral |

Criar bot novo so quando houver uma fronteira real de audiencia, seguranca ou produto externo. Exemplos: bot de cliente Pulso, bot publico de atendimento, bot de WhatsApp para pacientes. Internamente, novo dominio deve virar area/blueprint/source no AIOS, nao novo bot.

## Arquitetura alvo

Fluxo:

1. Telegram recebe texto ou audio.
2. O gateway identifica o canal (`dev`, `estrategista`, `vendas-k2`) e monta hints.
3. Mensagem vai primeiro para o AIOS Command Router quando estiver em modo AIOS.
4. Command Router classifica area, intent, target e risco.
5. Risk A interno pode criar `GuidanceItem` ou `WorkItem`.
6. Risk B externo retorna preview/proposal/HITL.
7. Risk C e bloqueado.
8. Quando a solicitacao exige raciocinio livre, o bot ainda pode cair no Claude CLI atual como fallback.
9. Toda resposta operacional deve trazer, quando existir, ids de Artifact/Guidance/WorkItem/Proposal.

Modelo mental:

```text
Telegram bot = canal
AIOS Command Router = despacho
Area Blueprint Registry = departamentos
Operating Pack = rotina por area
Agent/Claude CLI = executor quando necessario
Company Brain = memoria/evidencia/auditoria
```

## Modo de transicao

O script atual `/home/claude/telegram-bot.py` ja funciona e nao deve ser substituido de uma vez.

Adicionar um modo incremental:

| Modo | Como aciona | Comportamento |
| --- | --- | --- |
| Legado | mensagem normal | Continua rodando `claude -p` como hoje |
| AIOS preview | prefixo `/aios` ou env por service | Chama `POST /api/company-brain/command-router` com `dryRun=true` |
| AIOS commit Risk A | prefixo `/aios commit` | Chama command router com `dryRun=false` apenas para intents Risk A |
| Fallback | router retorna `needs_clarification` ou `preview_only` sem executor | Bot responde com proxima acao e nao executa mutacao |

Essa transicao evita quebrar o que ja e util e permite testar por comando antes de mudar o default dos bots.

## Primeiro conjunto de interacoes

Estas sao as interacoes que devem funcionar primeiro, sem automacao externa:

| Pedido no Telegram | Canal recomendado | Rota AIOS | Resultado v0 |
| --- | --- | --- | --- |
| "me da o briefing de marketing de hoje" | estrategista | marketing | lista top 3 acoes + guidance aberta |
| "o que a gente faz hoje para NR-1?" | estrategista | marketing | foco diario + 10-20 proximas acoes + draft |
| "cria um post para a Thais sobre NR-1" | estrategista | marketing | artifact/draft + guidance para revisao |
| "tem algum repo ou PR com problema?" | dev | development | resumo de GitHub PR/CI watcher + guidance |
| "olha as DAGs do Pulso" | dev | operations | no v0 cria guidance/work item; watcher Pulso vem depois |
| "o servidor caiu?" | dev | platform/operations | checa health read-only ou cria guidance se ainda nao houver watcher |
| "quais proximos passos do PulsoOnline?" | dev ou estrategista | product/operations | responde a partir de Company Brain/QMD e cria guidance se necessario |

## Encaixe com areas estilo Cofounder

O equivalente aos "departamentos" nao deve ser uma colecao de bots. Deve ser o `Area Blueprint Registry` do AIOS:

| Area | Canal Telegram inicial | Primeiro pack/uso |
| --- | --- | --- |
| Strategy | estrategista | prioridades, decisoes, tradeoffs |
| Development | dev | repos, PRs, AgentRuns, issues |
| Marketing | estrategista | NR-1, Ads, conteudo, LinkedIn |
| Sales | estrategista/vendas-k2 | design partners, outbound, K2 |
| Operations | dev | DAGs, infra, rotinas |
| Finance | estrategista | futuro |
| Customer | vendas-k2 ou bot externo | futuro |
| Platform | dev | AIOS daemon, CT165, tunnels, timers |

Assim o produto futuro parece Cofounder: usuario fala com a empresa, AIOS roteia para uma area, e agentes especializados executam. Mas no curto prazo a gente reaproveita os canais existentes.

## Implementacao em cortes

### TGM-00 - Registrar Telegram como source operacional

Criar uma source unica `Telegram Bot Gateway CT165` com metadata dos services atuais, sem alterar os bots.

Status em 2026-05-13: concluido live no Company Brain via API local do daemon em CT165.

Seed:

- Source `S0m6x7yd29Kj`: `Telegram Bot Gateway CT165`.
- Artifact `28qggBUysYk5`: `Telegram Command Layer v0 plan`.
- Guidance `oJ_V8tOZzMqo`: `Implement Telegram /aios command router preview`.

Aceite:

- Source aparece no Company Brain. Concluido.
- Artifact registra o plano Telegram Command Layer v0. Concluido.
- Guidance aberta aponta para TGM-01. Concluido.

### TGM-01 - Command Router preview no script atual

Adicionar ao `/home/claude/telegram-bot.py` um caminho opcional:

- novo comando `/aios <texto>`;
- chama `POST http://127.0.0.1:3101/api/company-brain/command-router`;
- envia `dryRun=true`, `actor`, `area` inferida pelo service e `text`;
- devolve `decision`, `area`, `intent`, `risk`, `nextActionDetail`;
- nao chama Claude CLI nesse modo, exceto fallback explicito.

Aceite:

- `/aios me da o briefing de marketing de hoje` retorna classificacao marketing sem criar nada.
- `/aios tem algum repo com problema?` retorna development/platform sem mutacao externa.
- Risk C retorna bloqueado.

### TGM-02 - Commit Risk A controlado

Permitir `/aios commit <texto>` somente para `create_guidance` e `create_work_item`.

Aceite:

- cria GuidanceItem/WorkItem no Company Brain com provenance `company_brain:command_router`;
- responde no Telegram com ID criado;
- Risk B continua preview/proposal, Risk C bloqueado.

### TGM-03 - Primeiros handlers de pack

Adicionar handlers pequenos que nao reinventam agente:

- `marketing briefing` le o artifact/guidance do Marketing Operating Pack;
- `nr1 hoje` gera briefing manual MKT-01;
- `system status` consulta services/timers read-only;
- `pulso dag status` inicialmente cria guidance para Pulso Ops Sentinel, depois chama watcher.

Aceite:

- Antonio consegue receber uma resposta util pelo Telegram sem abrir Codex.
- Todo output persistente vira Artifact/Guidance.

### TGM-04 - Voz

Adicionar suporte a `voice`/`audio`:

- baixar arquivo do Telegram;
- transcrever;
- enviar texto transcrito ao mesmo pipeline do `/aios`;
- responder com "transcricao + decisao + proxima acao".

Aceite:

- audio curto no Telegram vira comando roteado.
- transcricao fica em artifact quando gerar acao.

## Guardrails

- Nao habilitar mutacao externa direta pelo Telegram no v0.
- Nao usar `--dangerously-skip-permissions` no caminho AIOS.
- Nao transformar cada pack em um bot.
- Nao misturar `vendas-k2` com operador geral antes de revisar audiencia e dados.
- Nao ativar voice como default antes de testar texto.
- Nao reativar timers antigos sem Source/Watcher no AIOS.

## Primeiro teste manual recomendado

Antes de alterar codigo, testar via API:

```bash
curl -sS http://127.0.0.1:3101/api/company-brain/command-router \
  -H 'Content-Type: application/json' \
  -d '{"text":"me da o briefing de marketing de hoje","area":"marketing","dryRun":true}'
```

Depois disso, ligar o mesmo POST ao comando `/aios` no bot existente.
