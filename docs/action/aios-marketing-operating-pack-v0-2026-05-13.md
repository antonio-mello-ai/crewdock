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
| `Artifact` | briefing diario, snapshot Ads, draft de post, lista de leads sugeridos, feedback humano |
| `Signal` | urgencia NR-1, anomalia Ads, oportunidade de segmento, conteudo com potencial, bloqueio de credencial |
| `GuidanceItem` | "aprovar estes 10 contatos", "publicar post X", "investigar CPA Y", "reativar OAuth Z" |
| `WorkItem` | tarefas com dono e prazo quando a acao nao cabe em um briefing |
| `ExternalActionProposal` | qualquer envio/publicacao/mudanca externa real |

Regra: se o output do pack nao vira pelo menos `Artifact` + `GuidanceItem`, ele ainda e script solto, nao AIOS.

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
4. Registrar `Artifact` com briefing.
5. Criar `GuidanceItem` para aprovacao/execucao humana.
6. Enviar resumo no Telegram.

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

- Telegram ou Codex consegue pedir "briefing de NR-1".
- Output cria `Artifact` + `GuidanceItem`.
- O briefing traz no maximo 3 prioridades e 10-20 acoes, para ser executavel.

### MKT-02 - Telegram HITL

Conectar output do briefing ao Telegram.

Aceite:

- Antonio recebe resumo no Telegram.
- Aprovacao/rejeicao gera feedback no `GuidanceItem`.
- Nenhum envio externo automatico acontece.

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
