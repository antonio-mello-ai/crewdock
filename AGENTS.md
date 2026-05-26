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
