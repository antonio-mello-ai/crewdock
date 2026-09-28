---
title: AGENTS.md — CrewDock OSS
kind: policy
area: engineering
project: crewdock
collection: crewdock
owner: maintainers
status: current
canonical: AGENTS.md
globalRef: crewdock://AGENTS.md
reviewCadenceDays: 90
lastReviewedAt: 2026-09-28
sourceRefs: []
related:
  - docs/index.md
  - docs/fluxos-negocio.md
  - docs/arquitetura.md
  - docs/operacao.md
supersedes: []
supersededBy: []
sensitivity: public
---
# AGENTS.md — CrewDock OSS

## Purpose

CrewDock is the public open-source control plane for orchestrating, monitoring
and managing multiple AI agents. Keep this repository generic, self-hostable and
safe for public collaboration.

## Boundary

This repository must not contain private downstream implementation details,
production topology, customer context, internal runbooks, real credentials,
private hostnames or local machine paths.

Only generic, sanitized code and documentation should be ported here.

## Stack

- Backend: Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2
- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- Database: PostgreSQL
- Cache: Redis
- Deployment: Docker Compose

## Commands

```bash
# Backend
cd backend
pip install -e ".[dev]"
ruff check .
ruff format .
mypy .
pytest
alembic upgrade head
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm install
npm run dev
npm run build
npm run lint

# Full stack
docker compose up -d
```

## Public Push Checklist

Before pushing or opening a public PR:

Run secret scanning and review any references to private infrastructure,
customer names, local paths, private hostnames or non-placeholder credentials.

## Documentation Sources Of Truth

The active documentation kit is:

- `AGENTS.md` for repository rules;
- `docs/fluxos-negocio.md` for current product behavior;
- `docs/arquitetura.md` for the implementation model;
- `docs/operacao.md` for technical and operational procedures;
- `docs/index.md` for document navigation.

Roadmap, backlog and priority live in GitHub Issues and Projects. Delivery
history lives in closed issues, pull requests and GitHub Releases. Do not add a
repository roadmap, backlog or changelog file that competes with those sources.

Specialized references and evidence can remain under `docs/` when they add
durable information that does not belong in the five-file active kit.
