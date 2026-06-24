# Phase 4 — implementation report

**Status:** ✅ Done (2026-06-24)
**Scope:** Python parity — the whole agent (core → infrastructure → interface),
the support-agent example, a Python service in Docker Compose, and Makefile
parity. The Python package mirrors the TypeScript one (ADR-0006).
**Plan:** [implementation-plan.md → Phase 4](../plans/implementation-plan.md)

## Summary

Phase 4 reimplemented Airlock in idiomatic Python with the same design, names, and
behavior as TypeScript: the same hexagonal layering, the same ports, the same
agent loop and gate, the same providers and Redis adapters, and the same
support-agent demo. It was verified the same way — ruff, mypy `--strict`, pytest
with coverage, import-linter, and both demos (in-memory and over real Redis in
Docker). The Python demo prints the exact same flow as the TypeScript one.

## Delivered

A `uv` + `hatchling` package at `packages/py` (`airlock`), built in three slices.

**4.1 Core** (`src/airlock/domain`, `src/airlock/application`):

- Domain: `pydantic` models — discriminated-union messages and decisions, a
  serializable `RunState` — `StrEnum`s, `NewType` identifiers, and domain errors.
- Ports as `Protocol`s: `Clock`, `IdGenerator`, `LlmProvider`, `EventPublisher` /
  `EventSubscriber`, `RunStore`, `AuditSink`, `GatePolicy`.
- `Agent` (the loop with the gate) and `RiskBasedGatePolicy`.
- In-memory / fake adapters: fake provider, in-memory bus / store / audit, system
  and fixed clocks, UUID and sequential id generators.

**4.2 Infrastructure** (`src/airlock/infrastructure`, `src/airlock/core`):

- Anthropic and OpenAI providers over an injected `httpx.AsyncClient` (HTTP, no
  SDK — ADR-0007), `pydantic`-validated.
- `pydantic-settings` configuration (`Settings`).
- JSONL audit sinks (`LineAuditSink`, `stdout_audit_sink`, `file_audit_sink`).
- `RedisRunStore` and `RedisEventBus` (Redis Pub/Sub — ADR-0002, ADR-0004).

**4.3 Interface, example, ops** (`src/airlock/interface`, `examples/`, `deploy/`):

- `AgentRunner`, `Approver` (+ `DecisionSource`), `auto_approve_decision_source`,
  an interactive `cli_decision_source`, and `event_schemas` (`pydantic` validation
  at the bus edge).
- The `support_agent` example: shared wiring plus in-memory and Redis demos.
- `deploy/docker/Dockerfile.py` and a `demo-py` service in `docker-compose.yml`;
  Makefile targets for both languages (`py-check`, `py-demo`, `up-py`, `check-all`).

## Mapping to the design

- **ADR-0006 (dual-language parity):** same package structure, same names, same
  behavior. The Python in-memory and Redis demos produce the same output as
  TypeScript (gate pauses `issue_refund` and `send_email`; run completes;
  `audit_events=12`).
- **ADR-0007:** providers call the HTTP APIs over an injected `httpx` client; no
  vendor SDKs.
- **ADR-0002 / ADR-0004:** Redis Pub/Sub bus and JSON run store, verified against a
  real Redis.
- **Hexagonal layering (§9):** enforced by import-linter — the layers point inward
  and the core imports no infrastructure library.

## Verification

All green (`make py-check` plus the integration suite and both demos):

- **ruff** and **mypy `--strict`** clean (64 source files).
- **pytest:** 37 unit tests, coverage **93.01%** (gate 90%). Providers are tested
  with `httpx`'s `MockTransport` (no network); settings with `monkeypatch`ed env.
- **import-linter:** both contracts kept (layers point inward; core free of
  infrastructure libraries).
- **Integration:** 2 tests against a real `redis:8.8-alpine` (run store round-trip
  and Pub/Sub delivery).
- **In-memory demo** (`make py-demo`) and **Compose demo** (`make up-py`, over real
  Redis) both run the full flow and exit 0.

## CODING_PRINCIPLES adherence

- **uv only (§7.11):** the package is built and run with `uv`; deps pinned in
  `uv.lock` and `pyproject.toml`.
- **DI via Protocols (§6, §3.5):** every dependency is a `Protocol`; the providers
  and Redis adapters take their client injected; tests use fakes, not mocks.
- **Validation at the edge (§2.3):** `pydantic` models for domain data and provider
  / event payloads.
- **Testing (§10):** behavior-focused, deterministic (`FixedClock`,
  `SequentialIdGenerator`), ≥ 90% coverage; the Redis adapters and the I/O-only CLI
  source are excluded from the unit coverage gate and covered by integration tests.
- **Datetime (§7.7):** time only via the `Clock` port; `SystemClock` returns
  timezone-aware UTC.
- **Sizes, no `Any`, no magic values, English-only**, all enforced by ruff and
  mypy `--strict`.

## Decisions and notes

- **Idiomatic Python for the sum types:** `match` statements over the message and
  decision unions (the analog of the TypeScript discriminated-union `switch`), so
  the type checker narrows each case — no ad-hoc `isinstance` branching in the loop.
- **`pydantic` discriminated unions** make `RunState` round-trip through Redis JSON
  with the right message / decision variants.
- **pnpm-style build-script friction has a Python analog:** `redis.asyncio.Redis`
  is not generic in this version, so the adapters annotate a bare `Redis`.
- **Settings tested via `monkeypatch`ed environment**, which exercises the real
  `pydantic-settings` env reading deterministically.

## Commits

- `dc9132f` — feat(py): Python core — domain, ports, agent, fakes, and tests
- `73982f8` — feat(py): Python infrastructure — providers, settings, audit, and Redis
- `5655e32` — feat(py): Python interface, example, Compose, and Makefile parity
