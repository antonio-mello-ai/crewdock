# AIOS Polsia Benchmark Principles - 2026-05-14

## Contexto

Benchmark manual da Polsia feito durante onboarding de uma empresa ficticia
`MindReady`, a partir de um input B2B amplo sobre consultoria de saude mental no
trabalho para pequenas e medias empresas.

O teste foi util menos como modelo a copiar e mais como alerta de produto. A
Polsia demonstrou um loop rapido de input aberto para pesquisa, narrativa,
artifacts, tasks, landing page, e-mail, tweet e oferta de ads, mas tambem deixou
claro o risco de uma automacao generalista que executa cedo demais e captura o
projeto do usuario como promocao da plataforma.

## Veredito

A Polsia nao deve ser tratada como norte aspiracional do AIOS. O Cofounder segue
sendo o benchmark mais maduro para a visao de orquestracao por areas, ownership
claro, solicitacoes ad hoc e coordenacao de agentes.

A Polsia serve como benchmark negativo:

- mostra a forca de transformar um pedido aberto em plano, documentos e tarefas;
- mostra o perigo de external actions sem HITL consistente;
- mistura propriedade do usuario com promocao da plataforma;
- reforca a necessidade de provenance, gates e transparencia de ownership no
  AIOS.

## O que foi observado

- A partir de um input generico, a Polsia pesquisou contexto externo e inferiu
  sozinha a oportunidade de NR-1 no Brasil.
- Criou uma empresa chamada `MindReady`, com pagina publica sob dominio
  `mindready.polsia.app`.
- Gerou documentos como `Market Research Report` e `Mission`.
- Criou tarefas de produto, pesquisa e cold outreach.
- Enviou um e-mail de boas-vindas a partir de `mindready@polsia.app`.
- Publicou um post no X pelo perfil `@polsia`, promovendo o projeto criado.
- Ofereceu um modal de Meta Ads com budget diario e botao de execucao.
- A execucao teve sinais de baixa robustez: erro `401 Unauthorized`, slug
  temporario vazando no corpo do e-mail e claims sem fonte/provenance visivel.

## Anti-patterns

### Propriedade ambigua

A experiencia diz que esta criando "sua empresa", mas os principais ativos
ficam sob infraestrutura, dominio, e-mail e canal social da Polsia. O post no X
foi publicado como `@polsia`, com branding da Polsia, usando o projeto do usuario
como vitrine.

Para o AIOS, qualquer asset precisa deixar explicito:

- quem e o dono do ativo;
- qual tenant/empresa/projeto ele representa;
- qual canal sera usado;
- se a acao e privada, interna, publica ou externa;
- qual approval gate permite a promocao do draft para mundo externo.

### Autopromocao embutida

A Polsia transforma o onboarding do usuario em prova publica da propria
plataforma. Isso torna metricas como "empresas rodando" ou "clientes" pouco
transparentes, porque um projeto criado para testar a ferramenta pode virar
vitrine, post publico ou numero de tracao.

Para o AIOS, dogfood, benchmark e projetos reais precisam ser rotulados com
provenance. Um run de teste nao pode virar evidencia comercial ou promocao
externa sem consentimento explicito.

### Generalismo sem profundidade operacional

O fluxo parece capaz de empacotar quase qualquer ideia no mesmo formato:
pesquisa, landing page, tarefas, e-mail, tweet e ads. Isso e impressionante como
demonstracao, mas fraco como sistema operacional de empresa.

O AIOS deve evitar "teatro de empresa autonoma". O objetivo e coordenar trabalho
real por areas, fontes, riscos, metas, owners, cadencias e feedback.

### HITL inconsistente

Houve gate para ads, mas nao houve gate claro antes de e-mail, landing page e
post publico. O sistema pediu confirmacao onde havia pagamento, mas nao onde
havia risco reputacional.

No AIOS, o criterio de HITL deve ser baseado em risco e impacto, nao apenas em
custo financeiro. Publicar, enviar, contatar leads, alterar dados, criar gastos,
executar deploy ou escrever em sistemas externos exige approval explicito.

### Polimento insuficiente para autonomia prometida

Foram observados erro interno, mensagem com slug antigo e ausencia de
provenance para afirmacoes fortes. Isso e aceitavel em prototipo, mas perigoso
quando o produto promete operar uma empresa.

O AIOS deve expor falhas, degraded mode, fontes, confianca e limites de acao em
vez de mascarar instabilidade com uma narrativa de sucesso.

## O que aproveitar

Apesar dos problemas, ha tres padroes validos para o AIOS:

1. Um pedido aberto deve virar rapidamente plano operacional, tarefas e drafts.
2. O usuario precisa ver um log de execucao compreensivel, nao apenas estado
   final.
3. Artifacts, tasks e canais de execucao devem aparecer juntos no produto,
   conectados ao mesmo run.

Esses padroes devem ser implementados com guardrails mais fortes que os da
Polsia.

## Principios para o AIOS

1. O AIOS nao captura o trabalho do usuario como marketing da plataforma sem
   consentimento explicito.
2. Todo asset tem owner, projeto, canal, status, provenance e policy gate.
3. Draft e acao externa sao estados diferentes. O default e draft, nao envio.
4. HITL e definido por risco: reputacional, financeiro, juridico, operacional,
   seguranca e privacidade.
5. Runs temporarios nao viram Company Brain por padrao.
6. Apenas decisoes, aprendizados reutilizaveis, feedback aprovado, guidance e
   evidencias estrategicas devem ser promovidos para memoria duravel.
7. Benchmarks, testes e dogfood devem carregar provenance para nao inflar
   metricas ou contaminar narrativa comercial.
8. A experiencia deve ser ad hoc e por areas, como o Cofounder: pedido aberto,
   roteamento, contexto, skill quando existir e agente quando nao existir.
9. O sistema deve deixar claro quando esta pesquisando, planejando, criando
   draft, aguardando aprovacao, executando ou falhando.
10. Claims fortes precisam de fonte, confianca e caminho de auditoria.

## Implicacoes de produto

Para aproximar o AIOS do norte correto:

- manter Cofounder como benchmark principal de produto;
- usar Polsia como lista de anti-patterns de autonomia prematura;
- implementar o command router como entrada ad hoc, nao como biblioteca de
  scripts desconectados;
- tratar packs/skills como aceleradores reutilizaveis, nao como substitutos do
  agente;
- manter artifacts operacionais temporarios fora do Company Brain, salvo quando
  houver promocao deliberada;
- exigir preview completo antes de writeback externo;
- separar claramente canais do sistema: Telegram, Web UI, Codex, schedules e
  MCP sao interfaces para o mesmo runtime, nao mundos separados.

## Implicacoes para marketing dogfood

O caso NR-1/Spa da Vida Empresas continua sendo bom dogfood, mas o AIOS deve
operar assim:

1. receber pedido ad hoc pelo Telegram, Web UI ou Codex;
2. rotear para a area `marketing`;
3. enriquecer contexto com QMD, docs, web quando permitido e fontes internas;
4. gerar briefing, plano, tarefas e drafts;
5. manter publicacao, envio, cold outreach, ads e pagamento em HITL;
6. registrar feedback operacional;
7. promover para Company Brain apenas o que virar decisao, guidance ou
   aprendizado reutilizavel.
