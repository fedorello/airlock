# Runs the Airlock Python support-agent demo against Redis. Build context is the
# repo root so the Python package can be copied in.
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim

WORKDIR /app

# Install dependencies first for layer caching.
COPY packages/py/pyproject.toml packages/py/uv.lock packages/py/.python-version ./
RUN uv sync --frozen --no-dev --no-install-project

# Source and the example.
COPY packages/py/src ./src
COPY packages/py/examples ./examples
RUN uv sync --frozen --no-dev

CMD ["uv", "run", "--no-dev", "python", "-m", "examples.support_agent.redis_demo"]
