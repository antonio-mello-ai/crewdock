# Auth Rollout — CF Access no daemon

## Relacao com Company Brain

O direcional AIOS / Company Brain aumenta a superficie de dados do daemon: Slack, docs, meetings, tickets, GitHub, work items, workflow runs, guidance e signals passam a ser dados sensiveis de estrategia e execucao. Qualquer conector novo deve respeitar a arquitetura abaixo antes de entrar em piloto externo.

Regras para proximas implementacoes:

- preservar CF Access para app e API;
- registrar actor humano vs agente em writes relevantes;
- preservar provenance de source/artifact sem expor segredo no frontend;
- separar fonte, workspace e futuro tenant antes de uso com design partner externo;
- manter `AIOS_AUTH_DISABLED` restrito a dev;
- usar service tokens apenas para integracoes server-to-server ou MCP confiavel.

## Arquitetura

- `ai.felhen.ai` (frontend) e `api.felhen.ai` (daemon) sob a **mesma** CF Access self-hosted application (`CrewDock`, `self_hosted_domains: ["ai.felhen.ai","api.felhen.ai"]`)
- Mesmo apex `.felhen.ai` → CF Access emite cookie apex-scoped, então sessão em ai.felhen.ai é automaticamente reconhecida em api.felhen.ai sem redirect cross-origin
- Três policies: (a) email allow Felhen team, (b) service token allow para MCP server, (c) bypass app separado cobrindo `api.felhen.ai/api/health`
- Daemon valida `Cf-Access-Jwt-Assertion` injetado pela CF edge (via `jose.createRemoteJWKSet`) — iss + aud + RS256 + clockTolerance 30s
- `/api/health` sempre público (retorna apenas `{ status: "ok" }` sem JWT; inclui detalhes se autenticado)
- Loopback (`127.0.0.1`/`::1`) bypassa para debug local no CT165, MAS requisições do cloudflared são detectadas via headers `CF-*` e passam pelo middleware normalmente
- `OPTIONS` preflight sempre passa (CORS)
- `AIOS_AUTH_DISABLED=true` bypassa tudo **apenas** em dev; daemon recusa iniciar em `NODE_ENV=production`
- `CF_ACCESS_SOFT_MODE` existe como kill switch de emergência — loga rejeições sem bloquear. Rollout inicial foi com a flag ligada, desligada após validação E2E

## Envs do daemon (`.env.prod`)

```
CF_ACCESS_TEAM_DOMAIN=felhen.cloudflareaccess.com
CF_ACCESS_AUD=<aud tag da CrewDock Access app>
CF_ACCESS_SOFT_MODE=false    # true apenas em incidente/rollout
```

## Envs do MCP (em ~/.env, lidas via shell expansion no `claude mcp add`)

```
CF_ACCESS_CLIENT_ID=<service token client id>
CF_ACCESS_CLIENT_SECRET=<service token client secret>
```

## Rollback (< 60s)

### Opção A (PRIMÁRIA em produção) — voltar para SOFT_MODE (loga mas não bloqueia)
```bash
ssh proxmox "pct exec 165 -- bash -c 'sed -i s/CF_ACCESS_SOFT_MODE=false/CF_ACCESS_SOFT_MODE=true/ /home/claude/aios-runtime/.env.prod && systemctl restart aios-daemon'"
```
Esta é a rota recomendada em incidente: preserva observabilidade (rejeições continuam logadas) mas não quebra o app.

### Opção B (dev apenas) — desativar auth completamente
```bash
ssh proxmox "pct exec 165 -- bash -c 'echo AIOS_AUTH_DISABLED=true >> /home/claude/aios-runtime/.env.prod && systemctl restart aios-daemon'"
```
**Não funciona em produção**: `validateConfig()` recusa bootar com `NODE_ENV=production` + `AIOS_AUTH_DISABLED=true`. Só serve para dev local.

### Opção C (último recurso) — deletar CF Access application (volta estado anterior)
```bash
source ~/.env
curl -X DELETE \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/access/apps/<APP_ID>" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```
API continua ativa, mas sem CF Access → sem JWT injetado → daemon rejeita tudo (exceto se SOFT_MODE=true).

## Smoke test checklist pós-deploy

- [ ] `curl https://api.felhen.ai/api/health` → 200 `{ status: "ok" }`
- [ ] `curl https://api.felhen.ai/api/briefing` → 401 (sem auth, após SOFT_MODE=false)
- [ ] `curl -H "CF-Access-Client-Id: $CID" -H "CF-Access-Client-Secret: $CSECRET" https://api.felhen.ai/api/briefing` → 200
- [ ] Browser `ai.felhen.ai` → GET /api/briefing via frontend → 200 (cookie CF)
- [ ] Browser `ai.felhen.ai` → WebSocket `/ws/sessions/:id` conecta e recebe evento
- [ ] Browser sem cookie CF (janela anônima pós-logout) → `new WebSocket(/ws/...)` **falha no handshake** (não dispara `open`)
- [ ] Browser `ai.felhen.ai` → Terminal `/ws/terminal/:id` bidirecional funciona
- [ ] Browser `ai.felhen.ai` → Push subscribe via Service Worker → 200
- [ ] MCP tool call pelo Claude Code (`list_workspaces`) → 200
- [ ] Logs do daemon mostram `email=antonio.mello@felhen.com.br` em requests browser
- [ ] Logs do daemon mostram `identity=<service-token-client-id>` em requests MCP

## Tech debt pendente

- `AIOS_AUTH_DISABLED` flag: remover quando CI de staging existir
- Service token em `~/.env` plaintext: migrar para macOS keychain em iteração futura
