# Benchmark: Sintra.ai

**Data**: 15 Mar 2026
**Fonte**: sintra.ai, reviews (Lindy, Gmelius, Salesforge, CyberNews)

---

## Overview

Sintra é uma plataforma SaaS de "AI employees" com 12 agentes especializados, 90+ power-ups, e integrações com apps comuns. Target: solopreneurs e pequenos negócios. 40K+ usuários em 100+ países. Pricing: $47-97/mês.

---

## Os 12 Helpers

| Helper | Papel | Capabilities |
|--------|-------|-------------|
| **Buddy** | Business Development | Insights para estratégia de crescimento, marketing strategy generator |
| **Cassie** | Customer Support | Respostas a queries de clientes, FAQ, tickets, mantém brand voice |
| **Commet** | eCommerce | Suporte e-commerce, product descriptions, store optimization |
| **Dexter** | Data Analyst | Datasets → recomendações acionáveis, predictions, reports |
| **Emmie** | Email Marketing | Campanhas de email, win-back flows, outreach, personalização |
| **Gigi** | Personal Development | Produtividade, planejamento, organização, rotinas, task lists |
| **Milli** | Sales Manager | Cold call scripts, cold emails, proposals, negociação |
| **Penn** | Copywriter | Copy para ads, blog posts, websites, landing pages, campanhas |
| **Scouty** | Recruiter | Shortlist CVs, match skills, score experience, hiring pipeline |
| **Seomi** | SEO Specialist | Audits, keywords, meta descriptions, content optimization, monitoring |
| **Soshie** | Social Media Manager | Curadoria social, posts, visuals, trends, LinkedIn, Instagram |
| **Vizzy** | Virtual Assistant | Tasks admin, scheduling, image generation, tarefas repetitivas |

---

## Power-Ups (90+)

Exemplos conhecidos:
- Cold email generator
- LinkedIn post writer ("LinkedIn Nuke")
- Landing page writer
- Product description writer
- SEO blog writer
- SEO content strategy generator
- SEO audit tool
- SEO description generator
- Keyword generator
- Customer chat responder
- Speech-to-text
- Video script generation
- Image generation/editing

**Modelo**: formulários simples (preenche campos, AI gera resultado). Não são workflows multi-step.

---

## Integrações

| App | Tipo | O que faz |
|-----|------|-----------|
| Gmail | Email | Ler, enviar drafts, resumir inbox |
| Google Calendar | Scheduling | Agendar eventos, verificar agenda |
| Google Drive | Storage | Acessar documentos, referências |
| Notion | Notes/Docs | Atualizar notas, criar páginas |
| LinkedIn | Social | Criar e publicar posts |
| Instagram | Social | Criar posts, acessar conta |
| Facebook | Social | Publicar, acessar página |
| Google Analytics | Analytics | Insights de tráfego, recomendações |

**Gaps reportados**: Sem Zapier, CRM limitado, sem project management avançado, sem vídeo nativo.

---

## Brain AI (Knowledge Base)

- Armazena: brand voice, product details, URLs, writing samples, FAQs
- Múltiplos profiles (diferentes marcas/clientes)
- Helpers referenciam o profile ativo durante tasks
- Input: URLs, PDFs, documentos, textos
- **Limitação**: sem memória cross-conversation (cada chat é independente)

---

## Auto-Mode

- Seomi roda SEO tasks em auto-mode 24/7 (audit, monitor, optimize)
- **Limitação real**: não suporta workflows multi-step, triggers, conditional logic
- Cada helper opera independentemente — sem coordenação entre helpers
- Sem custom agents ou ajuste de prompts

---

## Pricing (2026)

| Tier | Preço | Inclui |
|------|-------|--------|
| Pro | $47/mês | Todos os 12 helpers, Brain AI, power-ups limitados |
| Business | $67/mês | Colaboração, workspaces, mais power-ups |
| X | $97/mês | Tudo, multilingual, todos os power-ups |

Sem free trial web (só mobile limitado).

---

## Limitações Identificadas (Reviews)

1. **Helpers não se comunicam** — operam em silos, sem contexto compartilhado
2. **Sem workflows** — não faz automação multi-step, triggers, conditional logic
3. **Integrações rasas** — ações simples (enviar email), não workflows complexos
4. **Sem custom agents** — não dá para criar helpers novos ou ajustar prompts
5. **Output repetitivo** — sem manipulação profunda de prompts, respostas ficam genéricas
6. **Scaling difícil** — preço per-user, sem shared workflows para times
7. **Sem memória cross-session** — cada conversa começa do zero

---

## O que CrewDock pode fazer melhor

| Limitação Sintra | Oportunidade CrewDock |
|-----------------|---------------------|
| Helpers em silos | Agentes com contexto compartilhado (shared brain, QMD) |
| Sem workflows | Task scheduler + approval workflows + webhooks |
| Integrações rasas | Plugin system extensível + MCP tools |
| Sem custom agents | Totalmente customizável (IDENTITY.md, model, tools) |
| Output genérico | Brain/knowledge base profundo, memória persistente |
| Preço per-user | Open-source, self-hosted, custo zero de licença |
| Sem cross-session memory | Gateway adapter com session history |
| Fechado | Open-source, community-driven |
