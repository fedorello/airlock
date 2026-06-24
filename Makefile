# Airlock — single entry point for common tasks. Run `make help`.

TS := packages/ts
PY := packages/py
UI := apps/ui
COMPOSE := deploy/docker/docker-compose.yml

.PHONY: help install hooks check check-all demo up down \
        ts-install ts-check ts-test-integration ts-demo \
        py-install py-check py-test-integration py-demo up-py \
        ui-install ui-check ui-dev ui-agent ui-e2e up-ui

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
	@echo "  UI (approver dashboard):"
	@echo "    ui-install            install dependencies"
	@echo "    ui-check              full gate: typecheck + lint + format + tests + build"
	@echo "    ui-dev                run the dashboard dev server (needs ui-agent + Redis)"
	@echo "    ui-agent              run the agent that raises approvals (needs Redis)"
	@echo "    ui-e2e                run the Playwright end-to-end test (needs Redis)"
	@echo "    up-ui                 Redis + agent + dashboard via Docker Compose (localhost:3000)"
	@echo "  Both / all:"
	@echo "    check-all             run all language gates"
	@echo "    hooks                 install the commit-msg hook (commitlint)"
	@echo "    down                  stop and remove the Docker Compose stack"

install: ts-install py-install ui-install
check: ts-check
demo: ts-demo
check-all: ts-check py-check ui-check

hooks:
	npm install
	git config core.hooksPath .githooks
	@echo "commit-msg hook installed (commitlint enforces Conventional Commits)."

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

ui-install:
	cd $(UI) && pnpm install

ui-check:
	cd $(UI) && pnpm typecheck && pnpm lint && pnpm fmt:check && pnpm test:cov && pnpm build

ui-dev:
	cd $(UI) && pnpm dev

ui-agent:
	cd $(TS) && pnpm demo:ui-agent

ui-e2e:
	cd $(UI) && pnpm exec playwright install chromium && pnpm test:e2e

up-ui:
	docker compose -f $(COMPOSE) up --build redis ui-agent ui

down:
	docker compose -f $(COMPOSE) down -v
