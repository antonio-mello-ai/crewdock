# Agentes — Overview

## Arquitetura Multi-Agent

4 agentes especializados rodando no OpenClaw Gateway, cada um com workspace independente, memória própria, e skills dedicadas.

## Agentes

### Nexus (Admin/Orchestrator)
- **Modelo**: claude-opus-4-6
- **Papel**: Administrador do sistema. Gerencia infra, meta-tasks, coordenação entre agentes.
- **Skills**: infra-health, budget-check, update-openclaw, cleanup
- **Crons**: Infra health (6h diário), Budget check (sex 12h), Update OpenClaw (quinzenal)
- **Quando usar**: Problemas de infra, monitoramento, coordenação cross-agent

### Bernard (Developer)
- **Modelo**: claude-opus-4-6
- **Papel**: Desenvolvedor. Monitora repos, PRs, code activity, project check-ins.
- **Skills**: code-activity, project-checkin, cleanup-repos
- **Crons**: Code activity (3h diário), Project check-in (10h diário), Cleanup repos (quinzenal)
- **Quando usar**: Desenvolvimento, code review, análise de repos

### Pulse (Content/Strategist)
- **Modelo**: claude-sonnet-4-6
- **Papel**: Estrategista de conteúdo. LinkedIn, market news, content radar.
- **Skills**: content-radar, content-development, weekly-rollup, linkedin-ideas
- **Crons**: Content radar (6h diário), Content development (seg-sex 8h), Weekly rollup (sex 16h)
- **Quando usar**: Conteúdo, LinkedIn, notícias de mercado, estratégia

### Atlas (Assistant/Knowledge)
- **Modelo**: claude-sonnet-4-6
- **Papel**: Assistente pessoal. Briefings, intake, calendário, HA Voice, default no Telegram.
- **Skills**: morning-briefing, daily-synthesis, intake-processing, felhen-context
- **Crons**: Morning briefing (7h), Daily synthesis (19h), Intake processing (9h/14h/19h)
- **Binding**: Telegram → Atlas por default
- **Quando usar**: Perguntas gerais, briefings, calendário, voice

## Prioridade de Modelo

- **Opus**: Nexus e Bernard — tarefas que exigem raciocínio complexo (infra, código)
- **Sonnet**: Pulse e Atlas — tarefas de conteúdo e assistência (custo-eficiente)
- **vLLM local (futuro)**: Tasks simples que não exigem Claude (classificação, extração, resumo)

## Shared Brain

Pasta `~/.openclaw/workspaces/shared/` acessível por todos os agentes:
- `projects-status.md` — Status consolidado dos projetos
- `decisions-log.md` — Log de decisões cross-agent

Cada agente pode ler/escrever no shared brain para comunicação assíncrona.
