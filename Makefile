# Airlock — single entry point for common tasks. Run `make help`.

TS := packages/ts
COMPOSE := deploy/docker/docker-compose.yml

.PHONY: help install typecheck lint fmt fmt-check test test-integration check demo up down

help:
	@echo "Airlock — make targets:"
	@echo "  install           install dependencies (TypeScript package)"
	@echo "  typecheck         type-check the TypeScript package"
	@echo "  lint              lint the TypeScript package"
	@echo "  fmt               format the code"
	@echo "  fmt-check         check formatting"
	@echo "  test              run the unit suite with coverage"
	@echo "  test-integration  run the Redis integration tests (needs Redis)"
	@echo "  check             full local gate: typecheck + lint + fmt-check + test"
	@echo "  demo              run the in-memory support-agent demo"
	@echo "  up                start Redis + run the support-agent demo via Docker Compose"
	@echo "  down              stop and remove the Docker Compose stack"

install:
	cd $(TS) && pnpm install

typecheck:
	cd $(TS) && pnpm typecheck

lint:
	cd $(TS) && pnpm lint

fmt:
	cd $(TS) && pnpm fmt

fmt-check:
	cd $(TS) && pnpm fmt:check

test:
	cd $(TS) && pnpm test:cov

test-integration:
	cd $(TS) && pnpm test:integration

check:
	cd $(TS) && pnpm typecheck && pnpm lint && pnpm fmt:check && pnpm test:cov

demo:
	cd $(TS) && pnpm demo

up:
	docker compose -f $(COMPOSE) up --build --abort-on-container-exit --exit-code-from demo

down:
	docker compose -f $(COMPOSE) down -v
