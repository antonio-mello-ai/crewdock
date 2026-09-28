---
title: CrewDock Architecture
kind: reference
area: engineering
project: crewdock
collection: crewdock
owner: maintainers
status: current
canonical: docs/arquitetura.md
globalRef: crewdock://docs/arquitetura.md
reviewCadenceDays: 90
lastReviewedAt: 2026-09-28
sourceRefs:
  - github:antonio-mello-ai/crewdock
related:
  - docs/fluxos-negocio.md
  - docs/operacao.md
  - docs/document-metadata.md
supersedes: []
supersededBy: []
sensitivity: public
---
# CrewDock Architecture

## System Context

CrewDock is a web application composed of a Next.js operator interface and a
FastAPI service. PostgreSQL is the durable system of record. Redis supports
ephemeral chat history and event delivery. External model, knowledge, MCP and
gateway services are reached through explicit adapters.

```text
Browser
  -> Caddy
      -> Next.js frontend
      -> FastAPI backend
          -> PostgreSQL
          -> Redis
          -> LLM provider
          -> QMD knowledge service or CLI
          -> MCP servers
          -> gateway adapter
          -> signed webhooks
```

## Backend

`backend/app/main.py` assembles the FastAPI application under `/api/v1`.
Routers separate agents, tasks, chat, auth, activity, cost, knowledge, events,
skills, approvals, webhooks, plugins, scheduling, gateways and MCP servers.

SQLAlchemy models and Alembic migrations own the PostgreSQL schema. Service
modules contain model invocation, tool-enabled chat, scheduling, knowledge
retrieval, cost tracking, chat history, activity logging and webhook delivery.
Configuration is loaded through Pydantic settings from environment variables.

## Frontend

`frontend/src/app` contains the Next.js App Router pages for the dashboard,
agents, tasks, knowledge, activity, costs, templates, skills, settings and
authentication. Shared components provide the application shell and reusable
forms and visual elements. The API client uses the signed-in JWT when available
and retains static-token compatibility.

## Runtime Data

- PostgreSQL: users, workspaces, agents, tasks, activity, costs, skills,
  approvals, webhooks, plugins and MCP registry records.
- Redis: session chat history and event transport, with bounded in-memory
  fallbacks where implemented.
- Environment: deployment-specific configuration and secrets. Secrets must not
  be committed or placed in public documentation.

## Extension Boundaries

- QMD is accessed through the knowledge client rather than embedded into the
  domain model.
- MCP integrations are registered and invoked through the MCP client.
- External agent runtimes connect through a gateway adapter.
- Plugins implement the public plugin lifecycle instead of changing core
  behavior through private coupling.

## Deployment Shape

The supported self-hosted shape is Docker Compose: Caddy fronts the Next.js and
FastAPI services, while PostgreSQL and Redis use named volumes or service-local
storage. Development runs PostgreSQL and Redis in Compose and the application
services directly on the host.
