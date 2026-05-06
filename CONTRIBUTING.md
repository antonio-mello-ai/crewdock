# Contribuindo com CrewDock

Obrigado por considerar contribuir com o CrewDock (AIOS Runtime).

## Setup de desenvolvimento

Requisitos: Node.js 22+, npm 10+.

```bash
git clone https://github.com/antonio-mello-ai/crewdock.git
cd crewdock
npm install
npm run dev
```

O `npm run dev` inicia daemon e frontend em paralelo via Turborepo:
- Daemon: `http://localhost:3101`
- Frontend: `http://localhost:3000`

Para build de produção:

```bash
npx turbo build
```

## Estrutura do monorepo

- `packages/daemon` — API server Hono + SQLite. Responsável por sessions, terminais PTY, schedules, briefing, jobs
- `packages/web` — Next.js frontend. Export estático (sem SSR)
- `packages/shared` — Types TypeScript compartilhados entre daemon e web
- `packages/mcp-server` — MCP server stdio para Claude Code

## Princípios

1. **Robustez e escalabilidade** — sem quick-fixes, sempre resolver causa raiz
2. **Zero débito técnico** — cada mudança elimina debt, não cria
3. **Uma fonte de verdade** — evitar lógica duplicada em N lugares
4. **Resiliência por design** — cada componente falha graciosamente

## Direcional atual

O `aios-runtime` esta evoluindo de control plane de agentes para AIOS / Company Brain. Antes de contribuir com features de produto, leia `docs/company-brain-direction.md` e use `../../../corp/docs/action/aios-product-roadmap.md` como fonte unica de features.

Juntos em Sala e o self-improving de escolas continuam como vertical separado. Mudancas neste repo devem preservar o core horizontal e modelar aprendizados de verticais como artifacts, signals, work items, workflow runs, guidance ou improvement proposals.

## Antes de abrir um PR

1. **Buildar sem erros**: `npx turbo build`
2. **Validar endpoints manualmente** quando mudar rotas do daemon
3. **Testar E2E** quando mudar fluxo de sessões ou terminais
4. **Não commitar segredos** — credenciais apenas em `.env.*` (gitignored)
5. **Atualizar `docs/backlog.md`** marcando itens resolvidos
6. **Atualizar `CLAUDE.md`** se adicionar nova feature que outros agentes precisam conhecer

## Estilo de commit

Commits em inglês, estilo Conventional Commits:

```
feat: add schedule manager with systemd integration
fix: use --resume with claude_session_id to preserve context
docs: update README with Docker quickstart
```

Escopo opcional após o tipo: `feat(mcp):`, `fix(terminal):`.

## Reportando bugs

Abra uma issue com:
- Descrição do comportamento esperado vs observado
- Steps to reproduce
- Ambiente (OS, Node version, Docker ou local)
- Log relevante (`journalctl -u aios-daemon` se systemd, ou console do browser)

## Licença

Ao contribuir, você concorda que seus commits ficam sob a licença MIT.
