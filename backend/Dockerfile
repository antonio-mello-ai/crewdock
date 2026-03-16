FROM python:3.12-slim

WORKDIR /app

# Install system deps + Node.js for MCP stdio servers
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY . .

ENV PYTHONPATH=/app
EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2", "--log-level", "info"]
