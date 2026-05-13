# AIOS Marketing Operating Pack v0

Este documento transforma o inventario operacional de 2026-05-13 em um pack curto de execucao. O objetivo e produzir valor em dias, nao semanas: usar AIOS como registro, Telegram como canal de comando/HITL, e as bases ja existentes de Spa da Vida, NR-1, Google Ads e lead generation como fontes.

## Decisao

Priorizar `Marketing Operating Pack v0` antes de reativar Pulso Ops Sentinel, open source patrol ou self-evolve.

Motivo:

- Antonio identificou marketing, Ads, outbound e conteudo como a dor diaria mais cara.
- Spa da Vida Ads ja tem campanhas ativas e scripts/documentos de analise.
- Spa da Vida NR-1 tem produto praticamente pronto, playbook de outreach e deadline informado pelo owner em 26/05/2026.
- A infraestrutura de lead generation ja existe, mas nao opera como rotina diaria com HITL e evidence.
- Esse pack e vendavel como padrao para empresas menores: poucos agentes automatizando processos de area, sem exigir implantacao completa de Company Brain enterprise.

## Escopo v0

O v0 deve operar tres loops:

| Loop | Frequencia | Output | HITL |
| --- | --- | --- | --- |
| NR-1 opportunity briefing | Diario, dias uteis | Lista priorizada de segmentos/contatos/acoes para Thais e Antonio | Sim, antes de qualquer abordagem |
| Conteudo NR-1/autoridade | 2-3x por semana | Draft de post curto ou artigo LinkedIn para Thais/Spa da Vida Empresas | Sim, antes de publicar |
| Spa Ads snapshot | Semanal no v0 | Resumo de CPA/conversoes/anomalias e proxima acao recomendada | Sim, antes de mudanca em campanha |

Nao escopo v0:

- publicar diretamente no LinkedIn/Instagram;
- enviar mensagens LinkedIn automaticamente;
- disparar cold email sem aprovacao;
- importar conversoes offline de saude para Google Ads;
- alterar budget, campanha, keywords ou criativos sem proposal/HITL;
- automatizar WhatsApp outbound.

## Fontes iniciais

| Fonte | Caminho/sistema | Uso no pack |
| --- | --- | --- |
| Playbook NR-1 | `projetos/marketing/lead-generation/docs/products/nr1.md` | ICP, pitch, objecoes, metas e sequencia |
| Lead generation repo | `projetos/marketing/lead-generation/` | SQLite, scripts, templates, dashboard, listas por produto |
| Spa Ads strategy | `corp/docs/estrategia/ads-strategy.md` | Status das campanhas, framework de review e baseline documentado |
| Spa Ads attribution plan | `projetos/marketing/docs/action/spa-google-ads-attribution-loop-plan-2026-05-13.md` | Loop Google Ads -> WhatsApp -> novo cliente |
| Spa Empresas app | `projetos/spadavida/empresas/` | Produto NR-1 e material de conversao |
| n8n social snapshot | `projetos/marketing/docs/diagnostico-n8n-social-media.md` | Workflows existentes a revalidar antes de reativar |
| LinkedIn Antonio | `carreira/linkedin/` | Estrategia pessoal, banco de ideias e processo hibrido |

## Objetos AIOS

O pack deve criar/usar estes objetos no Company Brain:

| Objeto | Uso |
| --- | --- |
| `Source` | `marketing_lead_generation`, `spa_ads`, `spa_nr1_playbook`, `n8n_social`, `linkedin_content` |
| `Artifact` | briefing promovido, snapshot Ads, draft aprovado/promovido, lista de leads estrategica, feedback humano relevante |
| `Signal` | urgencia NR-1, anomalia Ads, oportunidade de segmento, conteudo com potencial, bloqueio de credencial |
| `GuidanceItem` | "aprovar estes 10 contatos", "publicar post X", "investigar CPA Y", "reativar OAuth Z" |
| `WorkItem` | tarefas com dono e prazo quando a acao nao cabe em um briefing |
| `ExternalActionProposal` | qualquer envio/publicacao/mudanca externa real |

Regra: nem todo output operacional deve virar memoria do AIOS. Briefings sob demanda sao efemeros por padrao; viram `Artifact` somente quando forem promovidos por valor estrategico, decisao, aprendizado reutilizavel, acao aprovada ou evidencia que precisa sobreviver ao dia.

## Operating Pack Runner no daemon

O pack agora tem contrato nativo no daemon:

- Endpoint: `POST /api/company-brain/operating-packs/run`.
- Pack inicial: `marketing.nr1`.
- Acoes: `run`, `promote`, `feedback`.
- `run` retorna briefing operacional e `memoryPolicy=ephemeral`; nao cria `Artifact`.
- `promote` cria `Artifact` `marketing_briefing` somente por comando explicito.
- `feedback` cria `Artifact` `marketing_feedback` somente quando existe `targetArtifactId`.
- Todas as respostas trazem `noExternalAction=true`; envio, publicacao e mudanca em Ads continuam fora do runner.
- Telegram deve chamar esse endpoint como gateway. O bot nao deve conter a logica do briefing, naming, promocao ou feedback.

Contrato de memoria:

| Acao | Persistencia | Uso |
| --- | --- | --- |
| `run` | nenhuma | briefing do dia, valor temporario |
| `promote` | `marketing_briefing` | aprendizado/decisao/evidencia que precisa sobreviver |
| `feedback` | `marketing_feedback` + update opcional da guidance | HITL sobre artifact promovido |

## Naming de artifacts promovidos

O `id` curto do Company Brain e chave tecnica gerada pelo banco. Ele nao deve ser usado como nome operacional.

Artifacts promovidos pelo pack precisam preencher:

| Campo | Regra |
| --- | --- |
| `title` | nome humano com area, produto, tipo, data/hora e assunto |
| `rawRef` | URI semantica e ordenavel |
| `metadata.artifactName` | nome canonico completo com timestamp |
| `metadata.semanticKey` | chave canonica sem timestamp para agrupamento |
| `metadata.namingScheme` | versao da convencao usada |

Convencoes iniciais:

- Briefing promovido: `marketing.nr1.briefing.YYYY-MM-DD.<segmento>.<HHMMSS>`.
- Feedback promovido: `marketing.nr1.feedback.YYYY-MM-DD.<targetArtifactId>.<status>.<HHMMSS>`.

Exemplo:

- `artifactName`: `marketing.nr1.briefing.2026-05-13.contabilidades-consultorias-50-500.210415`
- `semanticKey`: `marketing.nr1.briefing.2026-05-13.contabilidades-consultorias-50-500`
- `rawRef`: `aios://operating-packs/marketing/nr1/briefings/2026-05-13/contabilidades-consultorias-50-500/210415`

## Telegram commands v0

Os comandos abaixo devem funcionar como linguagem natural no Telegram depois do `Telegram Command Layer v0`:

| Pedido do usuario | Rota esperada | Output |
| --- | --- | --- |
| "me da o briefing de marketing de hoje" | marketing briefing | top 3 acoes, bloqueios, drafts pendentes |
| "o que a gente faz hoje para NR-1?" | NR-1 operator | contatos/segmentos + mensagem sugerida + conteudo sugerido |
| "cria um post para a Thais sobre NR-1" | content draft | draft com tom profissional, CTA para diagnostico |
| "analisa os Ads do Spa" | Ads analyst | snapshot e anomalias read-only |
| "tem alguma campanha quebrada?" | Ads/source health | alerta de tracking, queda, gasto anormal ou ausencia de dados |
| "prepara abordagem para contabilidades" | outbound draft | lista de angles + mensagem LinkedIn/email, sem envio |

## Workflow v0

### Daily NR-1 briefing

Entrada:

- playbook NR-1;
- listas existentes em `lead-generation`;
- calendario do prazo informado pelo owner;
- feedback de abordagens manuais;
- materiais/landing do Spa Empresas.

Processo:

1. Selecionar um foco diario: contabilidades, RH local, empresas 50-500, parceiros, ou conteudo.
2. Gerar 10-20 proximas acoes com contexto e prioridade.
3. Gerar mensagem de abordagem ou pauta de conteudo.
4. Enviar resumo no Telegram.
5. Registrar `Artifact` somente se o briefing for promovido explicitamente ou gerar decisao/acao relevante.
6. Criar/atualizar `GuidanceItem` somente quando houver decisao, aprendizado ou acao aprovada.

Gate:

- qualquer envio real fica fora do v0 ou vira proposal com HITL explicito.

### Content draft loop

Entrada:

- playbook NR-1;
- Spa Empresas docs;
- perguntas frequentes/objecoes;
- contexto comercial da semana.

Processo:

1. Escolher uma tese por post.
2. Gerar draft curto para LinkedIn.
3. Opcionalmente gerar versao para Thais e versao para perfil empresa.
4. Registrar draft como `Artifact`.
5. Criar `GuidanceItem` para revisao/publicacao.

Gate:

- publicar somente manualmente no v0.

### Spa Ads weekly snapshot

Entrada:

- scripts `corp/scripts/ads-performance-snapshot.py` e relacionados;
- strategy doc de Ads;
- plano de atribuicao Ads -> WhatsApp -> cliente.

Processo:

1. Rodar snapshot read-only.
2. Comparar com baseline documentado.
3. Marcar anomalias: gasto sem conversao, CPA fora da faixa, campanha sem dados, tracking suspeito.
4. Registrar `Artifact`.
5. Criar `GuidanceItem` com proxima acao.

Gate:

- mudanca em campanha, budget, keywords ou conversoes offline exige `ExternalActionProposal`.

## Implementacao em cortes

### MKT-00 - Source registry e seed manual

Criar sources canonicos para marketing, sem scheduler ainda.

Status em 2026-05-13: concluido live no Company Brain via API local do daemon em CT165.

Sources criados:

| Source | ID | Status | Observacao |
| --- | --- | --- | --- |
| Marketing Lead Generation | `eOAmaoPqP1y-` | active/unknown | Repo de lead generation, scripts, templates e SQLite |
| Spa da Vida Ads | `wB2vi5ogLNcQ` | active/unknown | Fonte read-only para Google Ads Spa; snapshot live ainda nao rodado |
| Spa da Vida NR-1 Playbook | `d28rIJkb4rHA` | active/healthy | Playbook NR-1 com ICP, objecoes e sequencia |
| n8n Social Media Workflows | `0KCMalzwPKoV` | paused/unknown | Requer revalidacao live do CT120 antes de reativar |
| LinkedIn Content Antonio | `E8BDj-jLFCid` | active/unknown | Estrategia pessoal, abaixo de NR-1 no curto prazo |

Seed:

- Artifact `etx1CCODZw09`: `Marketing Operating Pack v0 seed`.
- Guidance `R6adR2HkGBq0`: `Run the first manual NR-1 daily briefing`.

Aceite:

- Sources aparecem no Company Brain. Concluido.
- Uma importacao manual cria Artifact de briefing marketing. Concluido como artifact de seed do pack.
- Nenhuma acao externa e executada.

### MKT-01 - Daily NR-1 briefing manual

Criar endpoint/MCP ou script interno que gera o briefing de NR-1 a partir dos docs/playbooks.

Aceite:

- Telegram ou Codex consegue pedir "briefing de NR-1". Concluido via `/aios me da o briefing de marketing de hoje` no bot Telegram.
- Output cria `Artifact` + `GuidanceItem`. Revisado: briefing sob demanda nao cria Artifact por padrao; usa guidance existente `R6adR2HkGBq0` e cria Artifact apenas via promocao explicita.
- O briefing traz no maximo 3 prioridades e 10-20 acoes, para ser executavel. Concluido com 3 prioridades e 12 acoes.

Status em 2026-05-13: primeira versao manual concluida live no CT165 via Telegram Command Layer.

Implementacao:

- Handler `/aios` para marketing agora retorna um briefing concreto em vez de instruir o usuario a criar um briefing.
- Segmento escolhido: contabilidades e consultorias que atendem empresas de 50-500 colaboradores.
- Output inclui 3 prioridades, 12 acoes executaveis, abordagem para contabilidade e draft de post para Thais.
- O fluxo continua `dryRun=true` e HITL: nao envia mensagem, nao publica post e nao cria WorkItem automaticamente.
- Artifact `yUH1XkSwX39y`: `Telegram MKT-01 concrete NR-1 briefing enabled`.
- Artifacts de briefing criados nos testes live antes da revisao de politica: `P-_bdA_S62wd` e `BXk6avkp9FpT`.
- Backup do script vivo: `/home/claude/telegram-bot.py.bak-20260513-mkt01-concrete-04bba66f`.
- Hash do script antes: `04bba66f86377fa29f60e02fa057eb86be79dca9194519e3983217e6093cadd3`.
- Hash do script depois: `87f2913d6125a8a9d6ad097eea332462a865496f18f2fe4ab2eee804eaaf652e`.

Evolucao posterior em 2026-05-13:

- A persistencia automatica por briefing foi testada e depois revertida como politica padrao, para evitar acumulo de artifacts operacionais temporarios.
- Briefings sob demanda agora ficam apenas no Telegram/memoria efemera do processo.
- Para promover um briefing ao Company Brain, usar `/aios promover briefing [motivo]`.
- Promocao agora passa pelo `POST /api/company-brain/operating-packs/run` com `action=promote`; o daemon cria `Artifact` `marketing_briefing` com `sourceId=S0m6x7yd29Kj`, `area=marketing`, `humanReviewStatus=approved`, `metadata.artifactName`, `metadata.semanticKey`, `metadata.namingScheme=operating-pack-semantic-v1`, `segment`, `guidanceId` e `memoryPolicy=promoted_by_human`.
- Artifact criado no teste de promocao explicita: `9QCHgD403xfG`.
- Backup do script vivo apos revisar politica de memoria: `/home/claude/telegram-bot.py.bak-20260513-memory-promotion-policy-42cf8c83`.
- Hash do script apos revisar politica de memoria: `a6a07594e72baf830e440adc1308105ac194140975796b664894ccecd81bc7fa`.
- Evolucao posterior: artifacts promovidos agora recebem naming canonico em `title`, `rawRef`, `metadata.artifactName` e `metadata.semanticKey`; o bot mostra `Nome`, `ID tecnico` e `Ref` ao promover.
- Backup do script vivo apos naming canonico: `/home/claude/telegram-bot.py.bak-20260513-artifact-naming-a6a07594`.
- Hash do script apos naming canonico: `da033bda64e4e7468e61891c4a041b3d332fde008b36c48da1aac1ddb3319c6e`.
- Evolucao atual: a logica de briefing/promocao/feedback saiu do bot e entrou no daemon como Operating Pack Runner. O bot deve apenas encaminhar payloads e renderizar `responseText`.

### MKT-02 - Telegram HITL

Conectar output do briefing ao Telegram.

Aceite:

- Antonio recebe resumo no Telegram. Concluido no MKT-01 via `/aios me da o briefing de marketing de hoje`.
- Aprovacao/rejeicao gera feedback no `GuidanceItem`. Concluido via `/aios feedback ...`: cria artifact `marketing_feedback` e atualiza a guidance `R6adR2HkGBq0` com `feedbackStatus`/`feedbackNote`.
- Nenhum envio externo automatico acontece. Concluido.

Status em 2026-05-13: primeira versao HITL concluida live no CT165.

Comandos:

- `/aios feedback aprovado [nota]` usa o ultimo briefing promovido naquele chat.
- `/aios feedback feito [nota]` registra feedback `completed`.
- `/aios feedback rejeitado [nota]` registra feedback `rejected`.
- `/aios feedback ajustar [nota]` registra feedback `needs_adjustment`.
- `/aios feedback <artifactId> <status> [nota]` registra feedback em um briefing explicito, util apos restart do bot.

Evidencia live:

- Artifact feedback `dBjxo7uM3YAb`: feedback `aprovado` para briefing `BXk6avkp9FpT`.
- Artifact feedback `V0moQ9W81eR7`: feedback `ajustar` para briefing `P-_bdA_S62wd`.
- Artifact feedback `5XdLZVSN26Lz`: feedback `aprovado` para briefing `P-_bdA_S62wd` e guidance `R6adR2HkGBq0` atualizada para `feedbackStatus=accepted`.
- Apos revisao de politica, feedback sem artifact promovido e recusado; feedback com artifact explicito ou ultimo artifact promovido continua permitido.
- Artifact de promocao explicita `9QCHgD403xfG` e feedback `2cKrwOLu9g1T`: teste da nova politica.
- Backup final do script vivo: `/home/claude/telegram-bot.py.bak-20260513-memory-promotion-policy-42cf8c83`.
- Hash final apos MKT-02 e politica de promocao: `a6a07594e72baf830e440adc1308105ac194140975796b664894ccecd81bc7fa`.

### MKT-03 - Spa Ads snapshot

Empacotar os scripts de Ads em watcher read-only.

Aceite:

- Snapshot semanal gera `Artifact`.
- Anomalias viram `Signal`.
- Recomendacao vira `GuidanceItem`.

### MKT-04 - Content draft loop

Gerar drafts de posts/artigos de NR-1.

Aceite:

- Drafts sao salvos como artifacts.
- Cada draft tem canal, audience, CTA e owner.
- Publicacao permanece manual.

## Primeira rotina recomendada

Enquanto a implementacao completa nao existe, o operador humano/agent pode rodar diariamente:

1. Ler `projetos/marketing/lead-generation/docs/products/nr1.md`.
2. Escolher um segmento do dia.
3. Gerar 10 abordagens LinkedIn ou email draft.
4. Gerar um post curto para Thais.
5. Registrar no Company Brain como artifact manual/session result.
6. Enviar para Antonio/Thais revisarem.

## Riscos

| Risco | Mitigacao |
| --- | --- |
| Automatizar LinkedIn e violar ToS | v0 gera draft/lista; humano executa |
| Expor dados de saude em Ads conversion upload | v0 nao importa conversoes offline; apenas analise interna |
| Criar posts genericos | usar playbook, objecoes reais e contexto da semana; HITL obrigatorio |
| Misturar marketing pessoal e produto | separar outputs: NR-1/Thais/Spa Empresas vs Antonio/Felhen |
| Virar mais um cron solto | todo output precisa virar Artifact/Guidance no AIOS |

## Done do v0

Considerar o v0 pronto quando:

- Antonio consegue pedir no Telegram "briefing de marketing de hoje";
- existe briefing diario NR-1 com proximas acoes revisaveis;
- existe pelo menos um draft de conteudo NR-1 por ciclo;
- existe snapshot semanal Ads read-only;
- todos os outputs aparecem no Company Brain com provenance;
- nenhuma mutacao externa acontece sem HITL.
