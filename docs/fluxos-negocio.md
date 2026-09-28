---
title: CrewDock Product Flows
kind: reference
area: product
project: crewdock
collection: crewdock
owner: maintainers
status: current
canonical: docs/fluxos-negocio.md
globalRef: crewdock://docs/fluxos-negocio.md
reviewCadenceDays: 90
lastReviewedAt: 2026-09-28
sourceRefs:
  - github:antonio-mello-ai/crewdock
related:
  - README.md
  - docs/arquitetura.md
  - docs/operacao.md
supersedes:
  - docs/known-issues.md
supersededBy: []
sensitivity: public
---
# CrewDock Product Flows

CrewDock is a self-hosted control plane for operating focused AI agents. This
document describes the behavior available in the current public release. It is
not a roadmap; planned work and known limitations are tracked in GitHub Issues.

## 1. Install And Initialize

An operator copies the environment template, supplies local secrets and an LLM
API key, starts the Docker Compose stack, and applies the database migrations.
The first user completes the setup flow and becomes the initial administrator.
Later sessions authenticate with JWT; the static bearer token remains available
for backwards-compatible API access.

## 2. Configure Agents

Operators can create and edit agents with a name, role, model, system prompt
and related configuration. The template gallery provides ten starting profiles
that can be installed and customized. Agent configuration is stored in
PostgreSQL and exposed through the REST API and dashboard.

## 3. Chat With Knowledge And Tools

An operator opens an agent chat and sends a message. CrewDock can retrieve
relevant QMD knowledge context before invoking the model. If MCP servers are
configured, the model can call their tools within the bounded tool loop.
Streaming responses arrive over Server-Sent Events. Conversation messages are
kept by session in Redis, with an in-memory fallback.

## 4. Plan And Run Tasks

Operators create tasks, assign an agent, and move work through the Kanban state
machine. Tasks can run immediately or on a cron schedule. The scheduler invokes
the configured LLM workflow, records the outcome, and resets recurring tasks to
their scheduled state after successful execution.

## 5. Review Activity, Approvals And Cost

CrewDock records operational activity and model cost events for visibility in
the dashboard. Approval records provide the API foundation for human-in-the-loop
decisions. Webhooks can deliver HMAC-signed events to external consumers.

## 6. Extend The Runtime

The plugin system provides lifecycle hooks for packaged extensions. The MCP
registry lets operators add stdio or SSE tool servers. A gateway adapter is the
boundary for connecting an external agent runtime without coupling the core to
one gateway implementation.

## Sources Of Truth

- Current behavior: this document and executable code.
- Architecture: `docs/arquitetura.md`.
- Setup, validation and maintenance: `docs/operacao.md`.
- Roadmap, limitations and priorities: GitHub Issues and Projects.
- Delivered releases: GitHub Releases, closed issues and pull requests.
