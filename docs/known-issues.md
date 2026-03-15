# CrewDock — Known Issues

**Atualizado**: 15 Mar 2026

---

## Funcionalidade

### Agent status sempre "offline"
O gateway adapter (OpenClaw) é um stub — não conecta ao runtime real. Todos os agentes mostram "offline" independente do estado real. Será resolvido com o WebSocket RPC adapter (P1).

### Agent chat não disponível
Não há interface para conversar com agentes pelo dashboard. Os agentes só podem ser gerenciados (CRUD) mas não interagidos diretamente. Prioridade P0 no roadmap.

### Task scheduler não funcional
O campo "Schedule (cron)" salva no banco mas não executa automaticamente. O APScheduler não está implementado. Prioridade P2.

### Skills e Settings usam dados placeholder
As páginas de Skills e Settings mostram dados estáticos, não conectados à API. Prioridade P2.

### Approval workflow só via API
Approvals podem ser criados e decididos via API, mas o frontend não tem interface para isso. Prioridade P2.

---

## Infraestrutura

### QMD deep_search timeout
O endpoint `/api/v1/knowledge/deep_search` pode dar timeout porque o QMD CLI `query` command carrega modelos de reranking (~1s cold start). Busca normal (`/search`) funciona rápido.

### Frontend auth token no build
O `NEXT_PUBLIC_API_TOKEN` é injetado em build time (não runtime). Mudar o token requer rebuild do frontend (`docker compose build frontend`). Limitação do Next.js com variáveis `NEXT_PUBLIC_*`.

### macOS sed vs Linux sed
O quick setup no README usa `sed -i` que funciona em Linux mas no macOS requer `sed -i ''` (com string vazia). Usuários macOS devem editar o `.env` manualmente ou usar `gsed`.

---

## UX

### Formulários sem validação client-side
Os forms de criação de agent/task não validam campos antes de enviar. Erros são retornados pelo backend como HTTP 422 mas não exibidos no frontend.

### Sem feedback visual de loading/erro nas mutations
Ao criar/editar/deletar, não há toast/notification de sucesso ou erro. A lista apenas atualiza silenciosamente via cache invalidation.

### Select de agent no form de task usa HTML nativo
O dropdown de seleção de agente no form de nova task usa `<select>` nativo em vez do componente shadcn/ui Select. Funciona mas é visualmente inconsistente em dark mode.

---

## Contribuindo

Encontrou um bug não listado aqui? Abra uma [issue no GitHub](https://github.com/antonio-mello-ai/crewdock/issues).
