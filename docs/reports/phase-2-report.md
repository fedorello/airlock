# Phase 2 — implementation report

**Status:** ✅ Done (2026-06-24)
**Scope:** TypeScript infrastructure — model-agnostic providers, typed
configuration, audit sinks, and the Redis adapters with real integration tests.
**Plan:** [implementation-plan.md → Phase 2](../plans/implementation-plan.md)

## Summary

Phase 2 added the real adapters behind the ports, so the agent loop can run on
Redis and real models — without touching the core. Providers call the vendors'
HTTP APIs over an injected `fetch` and validate responses with `zod`; the Redis
event bus and run store are verified against a real `redis:8.8-alpine` instance,
not mocks.

## Delivered

Production code (`packages/ts/src`):

- `core/settings.ts` — `loadSettings(env)`: typed, `zod`-validated configuration
  from an environment map (provider, model, API key, base URL, Redis URL, system
  prompt), with defaults and fail-fast errors.
- `infrastructure/providers/http.ts` — `postJson` over an injected `FetchLike`,
  plus `ProviderHttpError` and `ProviderResponseError`.
- `infrastructure/providers/anthropic-provider.ts` — `AnthropicProvider`
  (Messages API): maps the conversation and tools to Anthropic's shape and parses
  the response with `zod`.
- `infrastructure/providers/openai-provider.ts` — `OpenAiProvider` (Chat
  Completions); a configurable base URL also serves OpenRouter and Ollama.
- `infrastructure/audit/line-audit-sink.ts` — `LineAuditSink` and the
  `stdoutAuditSink()` / `fileAuditSink(path)` factories (JSONL).
- `infrastructure/store/redis-run-store.ts` — `RedisRunStore` (run state as JSON).
- `infrastructure/events/redis-event-bus.ts` — `RedisEventBus` (Pub/Sub over a
  dedicated subscriber connection plus a publisher connection).

The Redis adapters depend on **minimal Redis command interfaces**
(`RedisStringCommands`, `RedisPublishCommand`, `RedisSubscribeCommand`), not on
`ioredis` directly.

Tests (`packages/ts/test`): `settings.test.ts`, `providers.test.ts`,
`audit.test.ts`, and `redis.integration.test.ts`.

Tooling: added `zod` and `ioredis` (pinned per `stack.md`); a separate
`vitest.integration.config.ts` and a `test:integration` script; an ESLint rule to
allow `_`-prefixed unused arguments.

## Mapping to the design

- **ADR-0005 / ADR-0007:** one `LlmProvider` port; each vendor is an adapter that
  calls the HTTP API directly over an injected `fetch` (no SDKs) and validates the
  response with `zod`. The OpenAI adapter's base URL covers OpenAI-compatible
  endpoints.
- **ADR-0002:** `RedisEventBus` uses Redis Pub/Sub with at-most-once delivery; the
  run store remains the source of truth and `resume` is idempotent, so a missed or
  duplicated notification cannot corrupt a run.
- **ADR-0004:** `RedisRunStore` persists the serializable `RunState`.

## Verification

- `tsc --noEmit` (strict): clean.
- ESLint, Prettier: clean.
- **Unit suite:** **39 tests passing**. Coverage **98.98% statements, 98.36%
  functions, 90.14% branches, 98.96% lines** (gate 90%). No network — providers
  are tested against recorded responses via an injected `fetch`.
- **Integration suite:** **3 tests passing against a real Redis**
  (`redis:8.8-alpine`, started with Docker): run-store round-trip and miss, and
  Pub/Sub delivery. The suite skips cleanly when no Redis is reachable and runs via
  `pnpm test:integration` and in CI / Docker Compose.

## CODING_PRINCIPLES adherence

- **DI / DIP (§6, §3.5):** the Redis client and the `fetch` implementation are
  injected; adapters depend on narrow interfaces, not concrete clients.
- **Validation at the edge (§2.3):** provider responses and configuration are
  validated with `zod` before use.
- **No hardcoding (§7):** model, keys, base URLs, and the Redis URL come from
  `Settings`; constants (versions, prefixes, defaults) are named.
- **Real integration tests (§10.4):** the Redis adapters are tested against a real
  Redis, never mocked; they are therefore excluded from the unit coverage gate
  (documented in `vitest.config.ts`).
- **Only current stable versions (§7.10):** `zod 4.4.3`, `ioredis 5.11.1`, verified
  against the registry.
- **English-only, ≤ 30-line methods, no `any`.**

## Decisions and deviations

- **ADR-0007 — provider adapters call the HTTP APIs directly (no vendor SDKs):**
  recorded with alternatives. `stack.md` was updated for both languages (providers
  use `fetch` / `httpx`, not the SDKs).
- **Redis integration tests gated on availability:** real when Redis is present
  (CI / Compose / a local container), skipped otherwise, so the default unit run is
  green anywhere.
- **Redis adapters excluded from the unit coverage gate:** they are covered by the
  integration suite, in line with §10.4 (adapters are integration-tested).

## Commits

- `c8a79f0` — feat(ts): add provider adapters, settings, and audit sinks
- `eb2aef3` — feat(ts): add Redis event bus and run store with real integration tests
