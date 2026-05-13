# Inventario operacional de agentes, bots, timers e automacoes

Este inventario registra o estado observado em 2026-05-13 para organizar a camada curta de agentes e automacoes Felhen sem criar um mundo paralelo ao AIOS. O foco e separar o que esta vivo, o que esta desligado, o que esta documentado mas precisa de revalidacao, e quais blocos devem virar blueprints/packs operacionais no Company Brain.

## Leitura executiva

O estado atual confirma uma inversao operacional:

- O AIOS daemon esta ativo e o Company Brain Operating Loop esta rodando em modo observe-only.
- Tres bots Telegram legados estao ativos no CT165.
- O unico timer de negocio ativo no CT165 e `import-trading-scoring.timer`, ligado a um projeto pausado, e o servico correspondente esta falhando.
- Os timers que ja tiveram valor operacional direto - Pulso data quality/DAGs, open source patrol/scout, self-evolve report, infra healthcheck, comment sentinel - estao desabilitados.
- Os bots Telegram ativos ainda sao wrappers diretos de `claude -p`, nao uma camada AIOS: nao ha voice/transcription, command router, registro de artifact/signal/guidance, gates de writeback ou provenance no Company Brain.
- Marketing e go-to-market sao hoje a frente com maior valor de curto prazo: Spa da Vida Ads esta documentado como ativo, Spa da Vida NR-1 tem playbook de outreach pronto e janela operacional curta, mas esses fluxos ainda nao estao integrados a timers, watchers, Telegram ou Company Brain.

Conclusao pratica: o AIOS robusto deve continuar sendo a fonte de verdade, mas o proximo valor vem de transformar as automacoes existentes em "Operating Packs" pequenos, com Telegram como canal e Company Brain como registro/auditoria. O primeiro pack recomendado e Marketing/Spa da Vida NR-1, antes de reativar automacoes menos urgentes.

## Fontes verificadas nesta passada

Estado vivo verificado:

- CT165 via `systemctl list-timers --all`.
- CT165 via `systemctl list-units --type=service --all`.
- CT165 via `systemctl show` e `systemctl cat` para unidades AIOS, Telegram, timers e servicos legados.
- CT165 via leitura read-only de `/home/claude/telegram-bot.py`.
- AIOS daemon local no CT165 via `http://127.0.0.1:3101/api/company-brain/summary`.

Estado documentado, nao revalidado live nesta passada:

- `corp/docs/estrategia/agent-team-organization.md`.
- `corp/docs/estrategia/harness-evolution-analysis.md`.
- `corp/docs/estrategia/ads-strategy.md`.
- `projetos/marketing/lead-generation/AGENTS.md`.
- `projetos/marketing/lead-generation/docs/products/nr1.md`.
- `projetos/marketing/docs/action/spa-google-ads-attribution-loop-plan-2026-05-13.md`.
- `projetos/marketing/docs/diagnostico-n8n-social-media.md`.
- `carreira/linkedin/tracking.md`.
- `carreira/linkedin/content-strategy.md`.
- `docs/company-brain-direction.md`.
- `docs/backlog.md`.
- `corp/docs/action/aios-product-roadmap.md`.

## Control planes atuais

| Camada | Estado | Papel atual | Lacuna principal |
| --- | --- | --- | --- |
| AIOS daemon | Ativo | Runtime/Company Brain, watchers, briefing, source health, writeback governance | Ainda observa principalmente o proprio AIOS/GitHub; nao cobre Telegram, marketing, Pulso DAGs, Ads, calendario ou n8n como fontes vivas |
| Company Brain Operating Loop | Ativo | Runner interno observe-only para watchers permitidos | Apenas 2 watchers automatizados: briefing e GitHub PR/CI do `crewdock` |
| Telegram bots CT165 | Ativos | Canal humano para `claude -p` em contextos diferentes | Nao passam pelo command router nem registram evidence/provenance no AIOS |
| systemd timers CT165 | Desorganizado | Historico de automacoes autonomas | Timer ativo e de projeto pausado; timers uteis estao desabilitados |
| n8n CT120 | Parcial/documentado | Social/content workflows e HITL Telegram | Estado live nao revalidado; docs indicam fragmentacao e OAuth expirado em LinkedIn |
| Lead generation repo | Documentado | Infra de outbound por produto | Tem scripts/playbooks/dados, mas nao virou rotina diaria automatizada com HITL |
| Google Ads scripts | Documentado | Analise/acoes pontuais de campanhas | Nao ha watcher semanal/diario governado pelo AIOS |

## CT165 - servicos vivos

| Unidade | Estado verificado | Execucao | Escopo | Observacao |
| --- | --- | --- | --- | --- |
| `aios-daemon.service` | `active/running`, enabled | `/usr/bin/node /home/claude/aios-runtime/packages/daemon/dist/index.js` | AIOS Runtime | Roda como `claude`, cwd `/home/claude/aios-runtime` |
| `claude-telegram-dev.service` | `active/running`, enabled | `/usr/bin/python3 /home/claude/telegram-bot.py` | Bot Dev, cwd `/mnt/felhencloud/projetos`, modelo `opus` | Usa `.env` + `.env.telegram-dev`; wrapper direto de Claude CLI |
| `claude-telegram-estrategista.service` | `active/running`, enabled | `/usr/bin/python3 /home/claude/telegram-bot.py` | Bot Estrategista, cwd `/mnt/felhencloud/corp`, modelo `opus` | Usa `.env` + `.env.telegram-estrategista`; wrapper direto de Claude CLI |
| `claude-telegram-vendas-k2.service` | `active/running`, enabled | `/usr/bin/python3 /home/claude/telegram-bot.py` | Bot Vendas K2, cwd `/home/claude/vendas-k2-bot`, modelo `haiku` | Usa `.env` + `.env.telegram-vendas-k2`; wrapper direto de Claude CLI |
| `import-trading-scoring.service` | `failed`, service disabled | `/home/claude/import-trading/scripts/run_transform.sh` | Import Trading | Ultima execucao saiu com status 1; projeto informado como pausado |

## CT165 - timers

Estado inicial observado: `import-trading-scoring.timer` era o unico timer de negocio ativo. Remediacao executada em 2026-05-13: `systemctl disable --now import-trading-scoring.timer`. Verificacao posterior: timer `inactive/dead`, `UnitFileState=disabled`, sem proxima execucao. O servico `import-trading-scoring.service` permanece `failed` como evidencia historica da ultima execucao.

| Timer | Estado verificado | Proxima execucao | Servico | Diagnostico |
| --- | --- | --- | --- | --- |
| `import-trading-scoring.timer` | Remediado: disabled/inactive | nenhuma | `import-trading-scoring.service` | Quarentenado: era o unico timer ativo e pertence a projeto pausado |
| `data-quality-check.timer` | disabled/inactive | nenhuma | `run-orchestrator.sh "verificar saude de dados e pipelines K2Digital"` | Candidato a reativar como Pulso Ops Sentinel, mas migrando para AIOS watcher/source |
| `opensource-ops-patrol.timer` | disabled/inactive | nenhuma | `run-orchestrator.sh "patrulhar PRs open source..."` | Candidato a reativar depois de marketing/Pulso, se ainda houver valor |
| `opensource-ops-scout.timer` | disabled/inactive | nenhuma | `run-orchestrator.sh "buscar novas oportunidades..."` | Baixa urgencia frente a marketing e Pulso |
| `claude-dag-check.timer` | disabled/inactive | nenhuma | `run-skill.sh ... dag-check --no-notify` | Candidato a absorver em Pulso Ops Sentinel |
| `claude-clickhouse-check.timer` | disabled/inactive | nenhuma | `run-skill.sh ... clickhouse-check --no-notify` | Candidato a absorver em Pulso Ops Sentinel |
| `claude-daily-report.timer` | disabled/inactive | nenhuma | `run-skill.sh ... daily-report` | Candidato a briefing operacional, mas via AIOS |
| `self-evolve-daily-report.timer` | disabled/inactive | nenhuma | `run-orchestrator.sh "compilar relatorio de auto-evolucao..."` | Reativar so se o self-evolve voltar a operar com evidence real |
| `claude-comment-sentinel.timer` | disabled/inactive | nenhuma | `/home/claude/run-comment-sentinel.sh` | Pode entrar no Marketing Pack, mas LinkedIn OAuth/HITL precisam ser revalidados |
| `infra-healthcheck.timer` | disabled/inactive | nenhuma | `/home/claude/check-infra-health.sh` | Pode virar watcher de infra com alerta Telegram/AIOS |

Nota: `agent-team-organization.md` ainda descreve alguns timers como ativos. O CT165 mostra o oposto para `data-quality-check`, `opensource-ops-patrol` e `opensource-ops-scout`. A doc antiga precisa ser tratada como historico, nao como estado atual.

## CT165 - scripts operacionais encontrados

| Caminho | Uso provavel | Status recomendado |
| --- | --- | --- |
| `/home/claude/telegram-bot.py` | Bot Telegram compartilhado pelos tres servicos ativos | Manter ate substituicao, mas reduzir risco e plugar no AIOS |
| `/home/claude/run-orchestrator.sh` | Wrapper legado de orquestracao autonoma por objetivo | Inventariar logs e decidir quais objetivos viram blueprints |
| `/home/claude/run-agent.sh` | Execucao direta de agente por projeto | Manter como compatibilidade/debug |
| `/home/claude/run-comment-sentinel.sh` | Sentinel de comentarios LinkedIn | Candidato a Marketing Pack apos revalidar credenciais |
| `/home/claude/check-infra-health.sh` | Healthcheck infra local | Candidato a watcher de infra |
| `/home/claude/notify.sh` | Notificacao Telegram legada | Deve ser substituido/absorvido por Notification/Guidance no AIOS |

## Telegram bots - comportamento real

Remediacao/ativacao executada apos o inventario inicial: `TGM-00` do Telegram Command Layer foi seedado live no Company Brain em 2026-05-13. Isso adicionou a source `Telegram Bot Gateway CT165` (`S0m6x7yd29Kj`), o artifact `28qggBUysYk5` e a guidance `oJ_V8tOZzMqo` para implementar o primeiro caminho `/aios` com Command Router preview. `TGM-01` tambem foi implementado live no script compartilhado dos bots em CT165 no mesmo dia, registrado no artifact `zbQze3u9wb4P`; a guidance `oJ_V8tOZzMqo` foi concluida e a proxima guidance aberta e `cYHp2xMoDPNn` para definir `/aios commit` Risk A.

O script atual:

- aceita apenas mensagens de texto (`filters.TEXT & ~filters.COMMAND`);
- nao trata `voice`, `audio`, arquivos ou transcricao;
- usa comandos `/new`, `/model`, `/status` e `/aios <texto>`;
- executa `claude -p <mensagem> --output-format stream-json --include-partial-messages --verbose --dangerously-skip-permissions`;
- usa `--continue` por padrao, retomando a ultima sessao do diretorio;
- limita concorrencia por `chat_id`;
- devolve uma previa editando a mensagem "Processando...";
- chama o Company Brain Command Router apenas no comando `/aios`, sempre com `dryRun=true`;
- nao cria `Artifact`, `Signal`, `GuidanceItem`, `WorkItem`, `AgentRun` ou `ExternalActionProposal`;
- mensagens normais ainda nao aplicam gates de risco do AIOS antes de executar `claude -p`.

Risco: os bots sao uteis como canal rapido, mas hoje estao mais proximos de um terminal remoto com Claude do que de um agente governado. Isso explica por que a experiencia existia, mas nao se organizou como produto AIOS.

## AIOS Company Brain - estado vivo

Resumo live do daemon local:

| Medida | Valor |
| --- | --- |
| Sources | 11 |
| Artifacts | 100 |
| WorkItems | 97 |
| Watchers | 4 |
| WatcherRuns | 89 |
| Signals | 100 |
| GuidanceItems | 71 |
| Open Guidance | 71 |
| Core readiness | `demo_ready` |
| Operating loop | enabled, idle |
| Scheduled watchers ativos | 2 |

Watchers registrados:

| Watcher | Estado | Cadencia | Policy | Observacao |
| --- | --- | --- | --- | --- |
| `watcher-github-pr-ci-v0` | active | every 2 hours | observe_only | Observa PR/CI do `antonio-mello-ai/crewdock` |
| `watcher-aios-briefing-v0` | active | daily 09:00 BRT | observe_only | Gera briefing AIOS |
| `watcher-github-issues-manual-v0` | active | manual | create_work_items | Sem agenda |
| `watcher-github-notifications-v0` | active | poll on demand | observe_only | Sem agenda |

Leitura: o AIOS esta vivo, mas ainda nao e o operador diario da Felhen. Ele observa o proprio desenvolvimento, nao as dores operacionais que Antonio citou: marketing, Ads, NR-1, LinkedIn, Pulso DAGs, agenda, email, WhatsApp e server recovery.

## Marketing e go-to-market - ativos documentados

Remediacao/ativacao executada apos o inventario inicial: `MKT-00` do Marketing Operating Pack foi seedado live no Company Brain em 2026-05-13. Isso elevou o total de sources de 11 para 16 e adicionou as sources `Marketing Lead Generation`, `Spa da Vida Ads`, `Spa da Vida NR-1 Playbook`, `n8n Social Media Workflows` e `LinkedIn Content Antonio`, alem do artifact `etx1CCODZw09` e da guidance aberta `R6adR2HkGBq0` para rodar o primeiro briefing NR-1 manual.

### Spa da Vida Ads

`corp/docs/estrategia/ads-strategy.md` documenta Spa da Vida como campanha de aquisicao ativa, com conta Google Ads `189-660-7697`, budget aproximado de R$85/dia e baseline recente registrado como R$1.770/mes, 455 conversoes e CPA medio de R$3,89. Tambem existem scripts em `corp/scripts/` para snapshot, investigacao, criacao/reativacao e avaliacao de campanhas.

`projetos/marketing/docs/action/spa-google-ads-attribution-loop-plan-2026-05-13.md` ja define um plano concreto para fechar o loop Google Ads -> WhatsApp -> novo cliente. Esse e um candidato forte a primeiro watcher de marketing porque transforma clique/conversao em evidence operacional.

Observacao: estes numeros nao foram reconsultados live no Google Ads nesta passada; foram extraidos da documentacao local.

### Spa da Vida NR-1

`projetos/marketing/lead-generation/docs/products/nr1.md` ja contem um playbook de outreach:

- produto: diagnostico + plano de acao + acompanhamento continuo;
- ticket: R$500-800/mes;
- entry point: diagnostico gratuito de 30min com Thais;
- ICP: empresas de 50-500 funcionarios em SP/Alphaville/Barueri/Osasco;
- decisores: RH, People, SESMT, CEO;
- canal inicial recomendado: LinkedIn, porque nao depende de warmup de dominio;
- target 30 dias: 200 empresas contactadas, 5-8 diagnosticos, 2-3 contratos.

Antonio informou nesta conversa que 26/05/2026 e o prazo operacional critico para comecar a valer a legislacao. Este inventario trata essa data como deadline informado pelo owner e prioriza NR-1 por urgencia comercial, nao como parecer juridico.

### Lead generation repo

`projetos/marketing/lead-generation/AGENTS.md` define uma infraestrutura centralizada de outbound para PulsoOnline, Spa da Vida NR-1, TravelCRM e escolas:

- SQLite `data/leads.db` como fonte de verdade;
- Apify, Hunter, Instantly, Dux-Soup, ML Highlights API e n8n;
- scripts de scraping, enrichment, personalizacao e export para Instantly;
- templates por produto em YAML;
- regras criticas: nao usar `@felhen.com.br` em cold email, nao fazer cold outreach via WhatsApp, aprovar templates antes de envio.

Esse repo ja e quase um "Marketing Operating Pack", mas falta scheduler, HITL, evidence no AIOS e rotina diaria/semana de execucao.

### LinkedIn pessoal Antonio

`carreira/linkedin/content-strategy.md` e `tracking.md` tem estrategia, dados e banco de ideias. A decisao documentada e usar modelo hibrido:

- n8n para curadoria mecanica;
- Claude Code com agente `linkedin-content-strategist` para criacao;
- Claude.ai/Opus para revisao critica;
- Antonio como HITL.

O estado documentado do workflow n8n de LinkedIn e desabilitado, com API key n8n e OAuth LinkedIn expirados. Isso torna LinkedIn pessoal importante, mas abaixo de NR-1 e Ads no curto prazo.

### n8n social media

`projetos/marketing/docs/diagnostico-n8n-social-media.md` registra uma instalacao n8n no CT120 com 46 workflows totais, 15 relevantes para social media, e poucos workflows ativos. O pipeline Spa da Vida Instagram aparece como o mais maduro, com HITL via Telegram e publicacao no Instagram. O LinkedIn Antonio aparece inativo por OAuth expirado.

Esse snapshot e de 2026-01-02 e deve ser revalidado live antes de qualquer reativacao.

## Productizacao recomendada

Os packs abaixo nao substituem o roadmap de produto do AIOS. Eles sao formas de dogfood operacional sobre capacidades ja previstas: Workflow Blueprints por area, Watcher/Operating Loop, Voice Channel, Conversational Operator Shell, LinkedIn/content connector e Source Health.

### 1. Marketing Operating Pack v0 - prioridade maxima

Objetivo: atacar o que doi agora e produzir valor antes de sofisticar a plataforma.

Escopo v0:

- NR-1 daily lead/opportunity briefing.
- Sugestao diaria de 10-20 contatos LinkedIn para Thais/Antonio.
- Draft de mensagem/connection request por segmento.
- Geracao de post/artigo curto para Thais sobre NR-1.
- Weekly Google Ads snapshot Spa da Vida com alertas simples.
- Registro de cada output como `Artifact` e cada acao recomendada como `GuidanceItem`.
- HITL via Telegram antes de qualquer envio/publicacao.

Nao fazer no v0:

- enviar cold email automatico sem aprovacao;
- automatizar LinkedIn em volume agressivo;
- importar offline conversions sensiveis para Google;
- publicar posts sem HITL.

### 2. Telegram Command Layer v0

Objetivo: manter a experiencia que Antonio quer - mandar texto/voz no Telegram e receber acao util - mas passando pelo AIOS.

Fluxo-alvo:

1. Telegram recebe texto ou audio.
2. Audio vira transcricao.
3. Command router classifica area, risco, intencao e destino.
4. Requisicoes read-only executam direto quando seguras.
5. Requisicoes com mutacao viram proposal/HITL.
6. Resposta volta no Telegram com links para artifact/guidance/work item.

Primeiros comandos:

- "olha as DAGs do Pulso e me diz se tem problema";
- "me passa o briefing de marketing de hoje";
- "quais proximos passos do PulsoOnline?";
- "cria um draft de post de NR-1 para a Thais";
- "tem algum repo ou PR com problema?";

### 3. Pulso Ops Sentinel v0

Objetivo: reativar o valor dos timers antigos sem voltar ao caos de cron solto.

Fontes a absorver:

- `data-quality-check.timer`;
- `claude-dag-check.timer`;
- `claude-clickhouse-check.timer`;
- `claude-daily-report.timer`;
- scripts/skills existentes do Pulso.

Forma correta: registrar Pulso DAG/ClickHouse/data quality como sources/watchers no AIOS, produzir briefing read-only e abrir guidance/work item quando houver falha. O timer legado pode ser mantido somente como ponte enquanto o watcher AIOS nao estiver pronto.

### 4. Infra/System Status Pack v0

Objetivo: responder "servidor caiu?" e "reinicia se precisar" com gates.

Escopo v0:

- healthcheck read-only a cada 15min;
- alerta Telegram/AIOS se pfSense, DNS, tunnel, AIOS daemon ou services criticos falharem;
- restart apenas como proposal aprovada ou comando explicito com risco classificado.

### 5. Open source/self-evolve - reativar depois

`opensource-ops-patrol`, `opensource-ops-scout` e `self-evolve-daily-report` tem valor, mas nao resolvem a dor atual de receita/marketing. Eles devem ficar como candidatos de segunda onda.

## Acoes imediatas recomendadas

1. Concluido em 2026-05-13: desativar/quarentenar `import-trading-scoring.timer`, pois era o unico timer de negocio ativo, estava falhando e pertence a projeto pausado.
2. Criar `Source`/watcher AIOS para `systemd timers CT165`, com snapshot diario de timers ativos, disabled e failed.
3. Criar `Source`/watcher AIOS para Telegram bots, registrando uptime, script, cwd, modelo, permissao e ultimo erro.
4. Implementar `Marketing Operating Pack v0` com NR-1 + Spa Ads antes de LinkedIn pessoal.
5. Parcialmente concluido em 2026-05-13: implementar `Telegram Command Layer v0` com `/aios <texto>` em preview. Ainda falta suporte a voz e commits Risk A controlados.
6. Revalidar live CT120/n8n antes de reativar workflow social.
7. Reativar Pulso Ops Sentinel depois de Marketing Pack, mas ja como watcher AIOS e nao como cron solto.

## Criterios para considerar o inventario organizado

- Todo bot/servico/timer tem owner, escopo, estado, risco e decisao: manter, migrar, desativar, reativar ou investigar.
- Timers legados nao ficam ativos sem source no AIOS.
- Nenhum agente novo de Telegram executa mutacao sem passar por policy/HITL.
- Marketing tem pelo menos um briefing diario/semana governado pelo AIOS.
- NR-1 tem rotina de outbound assistido antes do prazo operacional de 26/05/2026.
- Pulso DAG/data quality volta como watcher com evidence e alertas, nao como script invisivel.
