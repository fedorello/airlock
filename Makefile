# Airlock — single entry point for common tasks. Run `make help`.

TS := packages/ts
PY := packages/py
COMPOSE := deploy/docker/docker-compose.yml

.PHONY: help install check check-all demo up down \
        ts-install ts-check ts-test-integration ts-demo \
        py-install py-check py-test-integration py-demo up-py

help:
	@echo "Airlock — make targets:"
	@echo "  TypeScript:"
	@echo "    ts-install            install dependencies"
	@echo "    ts-check / check      full gate: typecheck + lint + format + unit tests"
	@echo "    ts-test-integration   Redis integration tests (needs Redis)"
	@echo "    ts-demo / demo        run the in-memory support-agent demo"
	@echo "    up                    Redis + the TypeScript demo via Docker Compose"
	@echo "  Python:"
	@echo "    py-install            install dependencies (uv)"
	@echo "    py-check              full gate: ruff + mypy + import-linter + pytest"
	@echo "    py-test-integration   Redis integration tests (needs Redis)"
	@echo "    py-demo               run the in-memory support-agent demo"
	@echo "    up-py                 Redis + the Python demo via Docker Compose"
	@echo "  Both:"
	@echo "    check-all             run both language gates"
	@echo "    down                  stop and remove the Docker Compose stack"

install: ts-install py-install
check: ts-check
demo: ts-demo
check-all: ts-check py-check

ts-install:
	cd $(TS) && pnpm install

ts-check:
	cd $(TS) && pnpm typecheck && pnpm lint && pnpm fmt:check && pnpm test:cov

ts-test-integration:
	cd $(TS) && pnpm test:integration

ts-demo:
	cd $(TS) && pnpm demo

up:
	docker compose -f $(COMPOSE) up --build --abort-on-container-exit --exit-code-from demo redis demo

py-install:
	cd $(PY) && uv sync

py-check:
	cd $(PY) && uv run ruff check . && uv run ruff format --check . && uv run mypy \
		&& uv run lint-imports && uv run pytest

py-test-integration:
	cd $(PY) && uv run pytest tests/integration --no-cov

py-demo:
	cd $(PY) && uv run python -m examples.support_agent.in_memory_demo

up-py:
	docker compose -f $(COMPOSE) up --build --abort-on-container-exit --exit-code-from demo-py redis demo-py

down:
	docker compose -f $(COMPOSE) down -v
