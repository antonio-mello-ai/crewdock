# CrewDock — Known Issues

**Atualizado**: 15 Mar 2026 | **Versão**: v1.1.0

---

## Funcionalidade

### Agent status sempre "offline"
O gateway adapter (OpenClaw) tenta conectar via WebSocket mas o protocolo RPC completo não está implementado. Todos os agentes mostram "offline". Chat funciona via Anthropic API diretamente, não via gateway.

### Skills e Settings usam dados placeholder
As páginas de Skills e Settings mostram dados estáticos, não conectados à API.

### Approval workflow só via API
Approvals podem ser criados e decididos via API, mas o frontend não tem interface para isso.

### Chat history é por session, não por agente
O histórico de conversa é vinculado ao session_id. Se o usuário abre um novo chat com o mesmo agente, começa uma conversa nova. Não há lista de conversas anteriores.

---

## Infraestrutura

### QMD deep_search pode dar timeout
O endpoint `/api/v1/knowledge/deep_search` pode ser lento porque o QMD CLI carrega modelos de reranking (~1-3s cold start). Busca normal (`/search`) funciona rápido.

### Frontend auth token no build
O `NEXT_PUBLIC_API_TOKEN` é injetado em build time (não runtime). Mudar o token requer rebuild do frontend (`docker compose build frontend`). Limitação do Next.js com variáveis `NEXT_PUBLIC_*`. JWT tokens (via login) não têm essa limitação.

### macOS sed vs Linux sed
O quick setup no README usa `sed -i` que funciona em Linux mas no macOS requer `sed -i ''`. Usuários macOS devem editar o `.env` manualmente.

### Streaming cost é estimado
O endpoint de streaming (`/chat/{id}/stream`) estima tokens via caracteres/4. O endpoint não-streaming usa contagem real da API.

---

## UX

### Select de agent no form de task usa HTML nativo
O dropdown de seleção de agente no form de nova task usa `<select>` nativo em vez do componente shadcn/ui Select.

### Sem logout no sidebar
O botão de logout não está visível no sidebar. Para deslogar, o usuário precisa limpar o localStorage manualmente ou usar o console do browser.

---

## Resolvidos (v1.1.0)

- ~~Agent chat não disponível~~ — Chat funciona via Anthropic API com streaming
- ~~Task scheduler não funcional~~ — APScheduler executa tasks via LLM
- ~~Formulários sem validação~~ — Zod validation em agent e task forms
- ~~Sem feedback visual~~ — Toast notifications em todas as operações

---

## Contribuindo

Encontrou um bug? Abra uma [issue no GitHub](https://github.com/antonio-mello-ai/crewdock/issues).
