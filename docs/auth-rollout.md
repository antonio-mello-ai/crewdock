# Auth Rollout — CF Access no daemon

## Arquitetura

- `api.crewdock.ai` atrás de CF Access self-hosted application
- Duas policies: (a) email allow para users interativos, (b) service token allow para MCP server
- Daemon valida `Cf-Access-Jwt-Assertion` injetado pela CF edge (via `jose.createRemoteJWKSet`)
- `/api/health` sempre público (retorna apenas `{ status: "ok" }` sem JWT; inclui detalhes se autenticado)
- Loopback (`127.0.0.1`/`::1`) bypassa para debug local no CT165
- `OPTIONS` preflight sempre passa (CORS)
- `AIOS_AUTH_DISABLED=true` bypassa tudo **apenas** em dev; daemon recusa iniciar em `NODE_ENV=production`
- `CF_ACCESS_SOFT_MODE=true` loga rejeições mas não bloqueia — usar nas primeiras 24h pós-deploy

## Envs do daemon (`.env.prod`)

```
CF_ACCESS_TEAM_DOMAIN=felhen.cloudflareaccess.com
CF_ACCESS_AUD=<aud tag do application>
CF_ACCESS_SOFT_MODE=true     # remover após validação E2E
```

## Envs do MCP (em ~/.env, lidas via shell expansion no `claude mcp add`)

```
CF_ACCESS_CLIENT_ID=<service token client id>
CF_ACCESS_CLIENT_SECRET=<service token client secret>
```

## Rollback (< 60s)

### Opção A — desativar auth no daemon
```bash
ssh proxmox "pct exec 165 -- bash -c 'echo AIOS_AUTH_DISABLED=true >> /home/claude/aios-runtime/.env.prod && systemctl restart aios-daemon'"
```
Nota: só funciona se `NODE_ENV !== production`. Como roda em prod, primeiro precisa mudar `NODE_ENV` ou usar opção B.

### Opção B — voltar para SOFT_MODE (loga mas não bloqueia)
```bash
ssh proxmox "pct exec 165 -- bash -c 'sed -i s/CF_ACCESS_SOFT_MODE=false/CF_ACCESS_SOFT_MODE=true/ /home/claude/aios-runtime/.env.prod && systemctl restart aios-daemon'"
```

### Opção C — deletar CF Access application (volta estado anterior)
```bash
source ~/.env
curl -X DELETE \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/access/apps/<APP_ID>" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```
API continua ativa, mas sem CF Access → sem JWT injetado → daemon rejeita tudo (exceto se SOFT_MODE=true).

## Smoke test checklist pós-deploy

- [ ] `curl https://api.crewdock.ai/api/health` → 200 `{ status: "ok" }`
- [ ] `curl https://api.crewdock.ai/api/briefing` → 401 (sem auth)
- [ ] `curl -H "CF-Access-Client-Id: $CID" -H "CF-Access-Client-Secret: $CSECRET" https://api.crewdock.ai/api/briefing` → 200
- [ ] Browser `ai.felhen.ai` → GET /api/briefing via frontend → 200 (cookie CF)
- [ ] Browser `ai.felhen.ai` → WebSocket `/ws/sessions/:id` conecta e recebe evento
- [ ] Browser `ai.felhen.ai` → Terminal `/ws/terminal/:id` bidirecional funciona
- [ ] Browser `ai.felhen.ai` → Push subscribe via Service Worker → 200
- [ ] MCP tool call pelo Claude Code (`list_workspaces`) → 200
- [ ] Logs do daemon mostram `email=antonio.mello@felhen.com.br` em requests browser
- [ ] Logs do daemon mostram `service_token=aios-mcp-server` em requests MCP

## Tech debt criado

- `AIOS_AUTH_DISABLED` flag: remover quando CI de staging existir
- `CF_ACCESS_SOFT_MODE`: remover após 24h de observação limpa
- Service token em `~/.env` plaintext: migrar para macOS keychain em iteração futura
