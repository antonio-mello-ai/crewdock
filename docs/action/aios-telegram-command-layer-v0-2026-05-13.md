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
| AIOS preview | comando `/aios <texto>` | Chama `POST /api/company-brain/command-router` com `dryRun=true` |
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

Status em 2026-05-13: concluido live no CT165.

Implementacao:

- O script compartilhado `/home/claude/telegram-bot.py` ganhou `CommandHandler("aios", cmd_aios)`.
- Mensagens normais continuam no fluxo legado `claude -p`; apenas `/aios <texto>` usa o AIOS Command Router.
- O payload enviado ao daemon inclui `text`, `dryRun=true`, `actor=telegram:<service>:<chat_id>`, `visibility=internal` e `area` sugerida por keywords + `CLAUDE_SESSION_PREFIX`.
- A resposta do Telegram resume `decision`, `area`, `intent`, `risk`, `confidence`, `nextActionDetail`, policy e racional.
- Backup criado antes da troca: `/home/claude/telegram-bot.py.bak-20260513-tgm01-baa70409`.
- Hash antes: `baa70409482755813a5e71808b75ded8ed38d136c61ab49c6778629a425cbbee`.
- Hash depois: `e145bc8a74d6517cf8b08eb3e168335e565baf707efd0b53dc46fa4940fc051a`.
- Services reiniciados e ativos: `claude-telegram-dev.service`, `claude-telegram-estrategista.service`, `claude-telegram-vendas-k2.service`.
- Artifact `zbQze3u9wb4P`: `Telegram /aios command router preview implemented`.
- Guidance `oJ_V8tOZzMqo` marcada como `done/completed`.
- Guidance `cYHp2xMoDPNn`: proximo corte `Define Telegram /aios commit Risk A gate`.

Aceite:

- `/aios me da o briefing de marketing de hoje` retorna classificacao marketing sem criar nada. Concluido via teste importando o script em CT165 e chamando o router local.
- `/aios tem algum repo com problema?` retorna development/platform sem mutacao externa. Concluido via teste do helper: `development/development`, Risk A, `preview_only`.
- Risk C retorna bloqueado. Concluido via teste do helper: `delete o repo antigo agora` -> Risk C, `blocked`.

### TGM-02 - Commit Risk A controlado

Permitir `/aios commit <texto>` somente para `create_guidance` e `create_work_item`.

Aceite:

- cria GuidanceItem/WorkItem no Company Brain com provenance `company_brain:command_router`;
- responde no Telegram com ID criado;
- Risk B continua preview/proposal, Risk C bloqueado.

Nota: MKT-02 nao habilita `/aios commit`. Ele habilita somente feedback HITL interno sobre artifacts de briefing. Mutacao externa e criacao generica de WorkItem/Guidance continuam fora do Telegram.

### TGM-03 - Primeiros handlers de pack

Adicionar handlers pequenos que nao reinventam agente:

- `marketing briefing` le o artifact/guidance do Marketing Operating Pack;
- `nr1 hoje` gera briefing manual MKT-01;
- `system status` consulta services/timers read-only;
- `pulso dag status` inicialmente cria guidance para Pulso Ops Sentinel, depois chama watcher.

Aceite:

- Antonio consegue receber uma resposta util pelo Telegram sem abrir Codex.
- Todo output persistente vira Artifact/Guidance.

Status em 2026-05-13: primeiro handler concluido live no CT165.

Implementacao:

- O mesmo comando `/aios <texto>` continua chamando o Command Router primeiro.
- Quando o router classifica `area=marketing` e o texto contem sinais de briefing/hoje/NR-1/marketing, o bot renderiza um briefing operacional em vez da ficha tecnica do router.
- O briefing le `GET /api/company-brain/guidance-items?status=open`, filtra `area=marketing` e usa a guidance aberta `R6adR2HkGBq0` como prioridade do dia.
- Demais pedidos continuam recebendo o preview tecnico padrao do router.
- Backup criado antes da troca: `/home/claude/telegram-bot.py.bak-20260513-marketing-briefing-e145bc8a`.
- Hash antes: `e145bc8a74d6517cf8b08eb3e168335e565baf707efd0b53dc46fa4940fc051a`.
- Hash depois: `04bba66f86377fa29f60e02fa057eb86be79dca9194519e3983217e6093cadd3`.
- Services reiniciados e ativos: `claude-telegram-dev.service`, `claude-telegram-estrategista.service`, `claude-telegram-vendas-k2.service`.
- Artifact `TG26isZIoJnq`: `Telegram marketing briefing handler added`.
- Evolucao MKT-01 aplicada depois do teste real: o mesmo handler agora entrega briefing concreto com segmento escolhido, 3 prioridades, 12 acoes, abordagem para contabilidade e draft de post para Thais.
- Artifact `yUH1XkSwX39y`: `Telegram MKT-01 concrete NR-1 briefing enabled`.
- Hash depois da evolucao MKT-01: `87f2913d6125a8a9d6ad097eea332462a865496f18f2fe4ab2eee804eaaf652e`.
- Persistencia automatica por briefing foi testada e depois revertida como default. Briefings sob demanda sao efemeros por padrao.
- Novo comando de promocao: `/aios promover briefing [motivo]`, que cria artifact `marketing_briefing` somente quando fizer sentido estrategico.
- Artifacts de briefing criados nos testes antes da revisao: `P-_bdA_S62wd`, `BXk6avkp9FpT`.
- Artifact de briefing criado no teste de promocao explicita: `9QCHgD403xfG`.
- Naming corrigido depois: artifacts promovidos usam nome canonico semantico em `metadata.artifactName`, agrupamento em `metadata.semanticKey` e URI em `rawRef`; o ID curto continua apenas como chave tecnica.
- Exemplo de nome canonico validado sem criar artifact: `marketing.nr1.briefing.2026-05-13.contabilidades-consultorias-50-500.210415`.
- Evolucao MKT-02 aplicada depois: `/aios feedback ...` cria artifact `marketing_feedback` somente quando houver artifact promovido ou `artifactId` explicito, e atualiza a guidance `R6adR2HkGBq0` com o ultimo feedback.
- Artifacts de feedback criados nos testes: `dBjxo7uM3YAb`, `V0moQ9W81eR7`, `5XdLZVSN26Lz`, `2cKrwOLu9g1T`.
- Hash depois da politica de promocao de memoria: `a6a07594e72baf830e440adc1308105ac194140975796b664894ccecd81bc7fa`.

Teste executado:

- `me da o briefing de marketing de hoje` retornou `Briefing de marketing (AIOS preview)`, foco Spa da Vida Empresas/NR-1, guidance `R6adR2HkGBq0`, 3 prioridades, 12 acoes, abordagem para contabilidade e draft de post para Thais.
- O teste de politica final retornou briefing sem registrar Artifact por default e com instrucao de promocao.
- `feedback aprovado teste sem promover` foi recusado por nao haver Artifact promovido.
- `promover briefing vale aprendizado estrategico sobre canal contabilidade` criou artifact `9QCHgD403xfG`.
- `feedback aprovado briefing promovido para memoria` criou artifact `2cKrwOLu9g1T` e atualizou `R6adR2HkGBq0` para `feedbackStatus=accepted`.
- Validados os geradores de nome de briefing e feedback sem criar artifact novo; briefing continua efemero por default.
- `tem algum repo com problema?` continuou no preview tecnico generico do router.

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
