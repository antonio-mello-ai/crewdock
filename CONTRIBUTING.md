# Contributing

Thank you for your interest in contributing to AI Platform!

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker and Docker Compose

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Lint and type check
ruff check .
mypy .

# Run tests
pytest -v

# Dev server (requires Postgres + Redis via Docker)
docker compose -f ../compose.dev.yml up -d
uvicorn app.main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install

# Dev server
npm run dev

# Lint
npm run lint

# Build
npm run build
```

## Code Standards

### Backend (Python)
- **Formatter/Linter**: ruff
- **Type checking**: mypy (strict mode)
- **Tests**: pytest
- **Async**: all routes and services are async
- **Naming**: snake_case for functions/variables, PascalCase for classes

### Frontend (TypeScript)
- **Linter**: ESLint
- **Components**: shadcn/ui, composition over inheritance
- **State**: TanStack Query for server state
- **Naming**: camelCase for functions/variables, PascalCase for components

### Git
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **PRs**: squash merge to main

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`feat/your-feature`)
3. Make your changes
4. Ensure all checks pass (`ruff`, `mypy`, `pytest`, `npm run build`, `npm run lint`)
5. Submit a pull request

## Architecture

See `docs/plan-v1.md` for the full architecture and implementation plan.
