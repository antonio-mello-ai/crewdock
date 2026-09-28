---
title: CrewDock Operations
kind: runbook
area: operations
project: crewdock
collection: crewdock
owner: maintainers
status: current
canonical: docs/operacao.md
globalRef: crewdock://docs/operacao.md
reviewCadenceDays: 90
lastReviewedAt: 2026-09-28
sourceRefs:
  - github:antonio-mello-ai/crewdock
related:
  - README.md
  - CONTRIBUTING.md
  - docs/arquitetura.md
supersedes: []
supersededBy: []
sensitivity: public
---
# CrewDock Operations

## Prerequisites

- Docker with Docker Compose for the self-hosted stack.
- Python 3.12 for backend development.
- Node.js 20 for frontend development.
- An Anthropic API key when model-backed chat or tasks are required.

## Self-Hosted Startup

Follow the portable Quick Start in `README.md`: copy `.env.example`, generate
local secrets, set the provider key, start the stack and run Alembic migrations.

```bash
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose ps
```

Check the API and UI after startup:

```bash
curl --fail http://localhost:8001/api/v1/health
open http://localhost:3001
```

Use the equivalent browser command for your operating system if `open` is not
available.

## Development

Start infrastructure first:

```bash
docker compose -f compose.dev.yml up -d
```

Run backend checks from `backend/`:

```bash
ruff check .
ruff format --check .
mypy .
pytest -v
```

Run frontend checks from `frontend/`:

```bash
npm ci
npm run lint
npm run build
```

These commands mirror the required GitHub Actions jobs.

## Database Changes

Create and review an Alembic migration for every schema change. Apply migrations
before validating behavior against a new schema.

```bash
cd backend
alembic upgrade head
```

Do not edit a migration that has already shipped; add a new migration instead.

## Configuration And Secrets

Keep deployment configuration in the local `.env` created from `.env.example`.
Never commit provider keys, tokens, passwords, private hosts, customer data or
machine-specific paths. Before a public push, review the diff and run the
available secret scanner.

## Releases And Work Tracking

GitHub Issues and Projects own roadmap, limitations and priority. Pull requests
and closed issues provide delivery evidence. Publish version notes in GitHub
Releases; do not maintain a second changelog or roadmap file in the repository.

## Troubleshooting

Start with service state and bounded logs:

```bash
docker compose ps
docker compose logs --tail=200 backend frontend
```

Confirm database and Redis health before attributing failures to the
application. Report reproducible defects in GitHub Issues with the release,
platform, sanitized logs and minimal reproduction steps.
