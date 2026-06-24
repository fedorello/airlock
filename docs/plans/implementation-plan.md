# Implementation plan

How Airlock is built, in phases. Each phase is a vertical slice that ends with
every quality gate green and the work pushed. The plan is consistent with the
[architecture](../architecture/overview.md), the [design contract](../design/contracts.md),
the [ADRs](../adr/), and the [pinned stack](../stack.md), and it holds itself to
[`CODING_PRINCIPLES.md`](../../CODING_PRINCIPLES.md).

## Principles for the plan

- **Vertical slices, always green.** No phase is "done" until typecheck, lint,
  format, and tests (with the coverage gate) pass and the commit is pushed.
- **Core before infrastructure.** Build the pure domain and the agent loop
  against in-memory fakes first; add Redis and real providers after.
- **TypeScript leads, Python mirrors.** TypeScript establishes the shape; Python
  follows the same design and names (ADR-0006). Parity is reviewed, not generated.
- **Adapters, not edits.** New capability is a new adapter behind a port; the core
  never changes to add a model, a transport, or a store.
- **YAGNI.** Build the two-tier gate, in-memory and Redis adapters, and the
  support-agent example. Nothing speculative.

## Definition of Done (every phase)

- `typecheck`, `lint`, `format`, and `test` (coverage ≥ 90% in key areas) all green
  — locally and in CI.
- New logic covered by deterministic unit tests using in-memory fakes (no network,
  no real time, no API keys).
- Public functions/classes documented; comments explain *why*; English only.
- Commits follow Conventional Commits; one logical change per commit.
- Docs updated when behavior or decisions change (a systemic decision → an ADR).

## Status snapshot

| Phase | Title | Status |
| --- | --- | --- |
| 0 | Foundations & documentation | ✅ Done |
| 1 | TypeScript core — agent loop, fakes, tests | ✅ Done |
| 2 | TypeScript infrastructure — Redis, providers, config | ⬜ Next |
| 3 | TypeScript interface — runner, approver, Compose, Makefile, example | ⬜ |
| 4 | Python parity — core → infrastructure → interface | ⬜ |
| 5 | CI/CD, enforcement, and agent evals | ⬜ |
| 6 | Polish & release readiness | ⬜ |

---

## Phase 0 — Foundations & documentation ✅

Goal: a clean, well-documented repository whose architecture is decided and
pinned before any logic is written.

- [x] Repo created (public), `README`, `LICENSE`, `.gitignore`.
- [x] `CODING_PRINCIPLES.md` (English) and `CLAUDE.md` (rules: English-only,
      hexagonal, Redis Pub/Sub, model-agnostic, parity, Conventional Commits,
      Docker Compose + Makefile, tests).
- [x] `docs/stack.md` — pinned current-stable versions (Node 24, Python 3.14,
      Redis 8.8, and the dependency sets).
- [x] `docs/architecture/overview.md` — the full architecture.
- [x] `docs/adr/0001..0006` — the key decisions with alternatives.
- [x] `docs/design/contracts.md` — the cross-language contract.
- [x] TypeScript scaffold: toolchain (strict tsconfig, ESLint, Prettier, Vitest)
      + the pure `domain` types and the `application` ports. `tsc`, ESLint, and
      Prettier clean.

---

## Phase 1 — TypeScript core: the agent loop

Goal: a working, fully-tested agent loop with the gate built in, running entirely
against in-memory fakes. This is the heart of the product.

Deliverables (`packages/ts/src`):

- [x] `application/gate-policy.ts` → `RiskBasedGatePolicy` (default: `sensitive`
      requires approval, `safe` does not) — implements the `GatePolicy` port.
- [x] `application/agent.ts` → the `Agent` use case: `run(input)` and
      `resume(runId, requestId, decision)`, with private `advance`,
      `processPending`, `suspendForApproval`, `runToolCall`, `callModel`,
      `completeRun`, `applyDecision`. Constructor takes one dependencies object.
      Every method ≤ 30 lines.
- [x] In-memory fakes (`infrastructure/`):
  - `providers/fake-llm-provider.ts` — returns scripted completions.
  - `events/in-memory-event-bus.ts` — `EventPublisher` + `EventSubscriber`.
  - `store/in-memory-run-store.ts` — `RunStore`.
  - `audit/in-memory-audit-sink.ts` — `AuditSink`.
  - `clock/fixed-clock.ts` and `clock/system-clock.ts` — `Clock`.
  - `ids/sequential-id-generator.ts` and `ids/uuid-id-generator.ts` — `IdGenerator`.
- [x] Export the Agent, the gate policy, and the in-memory fakes from `index.ts`.

Tests (`packages/ts/test`) — assert the contract invariants directly:

- [x] `safe` tool auto-executes; `sensitive` tool suspends and publishes
      `approval.requested`.
- [x] `approve` executes the handler exactly once; `edit` uses the edited args.
- [x] `reject` feeds a tool message back and continues (not terminal).
- [x] A run reloaded from the store resumes correctly.
- [x] `resume` is idempotent: a replayed decision is a no-op (no double execute).
- [x] Multiple tool calls in one turn pause at the gated one and resume by cursor.
- [x] An unknown tool name raises `UnknownToolError`; unknown run raises
      `RunNotFoundError`.

Done when: the above are green and coverage on `application/` and
`infrastructure/` (fakes) is ≥ 90%. Enable the Vitest coverage gate.

Aligns with: contract invariants, ADR-0003 (gate policy), ADR-0004 (resume),
CODING_PRINCIPLES §6 (DI + in-memory fakes), §10 (coverage).

---

## Phase 2 — TypeScript infrastructure: Redis, providers, config

Goal: the real adapters behind the ports, so the loop runs on Redis and real
models — without touching the core.

Deliverables:

- [ ] `infrastructure/events/redis-event-bus.ts` — Redis Pub/Sub `EventPublisher`
      + `EventSubscriber` (ioredis). At-most-once semantics per ADR-0002; run
      state in the store is the source of truth.
- [ ] `infrastructure/store/redis-run-store.ts` — `RunStore` on Redis.
- [x] `infrastructure/providers/anthropic-provider.ts` — `LlmProvider` (Claude).
- [x] `infrastructure/providers/openai-provider.ts` — `LlmProvider` for OpenAI and
      any OpenAI-compatible endpoint (OpenRouter, Ollama) via a configurable base
      URL (ADR-0005).
- [x] `infrastructure/audit/jsonl-audit-sink.ts` and `stdout-audit-sink.ts`.
- [x] `core/settings.ts` — typed configuration read from the environment in one
      place (no scattered `process.env`); model id, base URLs, Redis URL, etc.
- [ ] Validation of tool inputs and event payloads with `zod` at the adapter edges.

Tests:

- [ ] Integration tests for the Redis adapters against a real Redis (Testcontainers
      or a Compose service), per CODING_PRINCIPLES §10.4.
- [x] Provider adapters tested against recorded responses (no live calls in CI).

Done when: integration tests pass; the loop runs end to end on Redis with a real
or recorded provider; gates green.

Aligns with: ADR-0002, ADR-0005, `stack.md` (ioredis, SDKs, Redis 8.8).

---

## Phase 3 — TypeScript interface: runner, approver, Compose, example

Goal: a runnable system and the hero example, wired through Docker Compose with a
Makefile entry point.

Deliverables:

- [ ] `interface/runner.ts` — the Agent Runner driving adapter: subscribes to
      `approval.decided` (EventSubscriber) and calls `Agent.resume`.
- [ ] `interface/approver/cli.ts` — a CLI approver: subscribes to
      `approval.requested`, shows the proposed action, and publishes
      `approval.decided` (approve / edit / reject).
- [ ] `examples/support-agent/` — the hero example: a customer-service agent with
      tools `search_knowledge_base` and `lookup_order` (safe) and `send_email` and
      `issue_refund` (sensitive). It drafts autonomously and gates send/refund.
      Runs deterministically with the fake provider and optionally a real one.
- [ ] `deploy/docker/` — `Dockerfile` and a `docker-compose.yml` with `redis`
      (8.8-alpine), `agent-runner`, and `approver` services.
- [ ] Root `Makefile` — `help`, `up`, `down`, `test`, `lint`, `fmt`, `check`,
      wired to the TypeScript package and Compose.

Tests:

- [ ] An end-to-end test of the full pause/approve/resume flow over the in-memory
      bus (deterministic), plus a Compose smoke check.

Done when: `make up` runs the example; a sensitive action visibly pauses for the
CLI approver and only fires on approval; gates green.

Aligns with: architecture §8 (event flow) and §12 (deployment), CLAUDE.md
tooling rule, ADR-0002.

---

## Phase 4 — Python parity

Goal: the same design in idiomatic Python (ADR-0006), mirroring Phases 1–3.

- [ ] **4.1 Core.** `packages/py` with `uv` + `pyproject.toml` (hatchling),
      `ruff`, `mypy --strict`, `pytest`. `domain` (with `pydantic` where input is
      validated) + ports as `Protocol`s + the `Agent` + in-memory fakes + unit
      tests ≥ 90%.
- [ ] **4.2 Infrastructure.** Redis adapters (`redis` async), Anthropic + OpenAI
      providers, JSONL/stdout audit, `pydantic-settings` config, integration tests.
- [ ] **4.3 Interface.** Runner + CLI approver + the support-agent example; a
      Python service in the same `docker-compose.yml`; Makefile parity.
- [ ] `import-linter` enforces that `domain` imports no infrastructure
      (CODING_PRINCIPLES §9.2).

Done when: `ruff`, `mypy --strict`, and `pytest` (coverage ≥ 90%) are green; the
Python example behaves identically to the TypeScript one.

Aligns with: ADR-0006, `stack.md` (Python 3.14, uv, the Python deps),
CODING_PRINCIPLES §7.11 (uv only), §9.2 (layer boundaries).

---

## Phase 5 — CI/CD, enforcement, and evals

Goal: machines enforce the standard on every push.

- [ ] GitHub Actions: run both packages' gates (typecheck/lint/format/test +
      coverage) on Node 24 and Python 3.14.
- [ ] `commitlint` with `@commitlint/config-conventional` in CI; a local git hook.
- [ ] `import-linter` (Python) and an ESLint boundary rule (TypeScript) in CI to
      enforce hexagonal imports.
- [ ] Dependency scanning (SCA) on PRs; a Critical/High CVE blocks merge
      (CODING_PRINCIPLES §7.10).
- [ ] **Agent eval suite** for the support-agent (CODING_PRINCIPLES §10.6): a
      golden dataset (≥ 30 cases) asserting the gate fires on every sensitive
      action and never on safe ones, and that tool sequences are correct.

Done when: CI is green on a clean checkout and the eval suite passes ≥ 90%.

Aligns with: CODING_PRINCIPLES §10.6, §13 (commitlint), §7.10 (SCA), §9.2.

---

## Phase 6 — Polish & release readiness

Goal: a repository that reads as a finished, trustworthy code sample.

- [ ] README quickstart: the "gate a dangerous action in ~20 lines" example for
      both languages, plus a short architecture diagram link.
- [ ] Per-package READMEs and the example's README.
- [ ] Versioning and changelog conventions; package metadata ready for publish
      (publishing itself is optional).
- [ ] A final consistency pass across docs, ADRs, and code.

---

## Out of scope (for now)

Deliberately excluded to stay small (YAGNI); each can later be a new adapter or a
new ADR:

- A web dashboard / hosted approver UI (the CLI approver is enough to demonstrate).
- A Postgres `RunStore` / `AuditSink` (in-memory + Redis cover the MVP; noted as
  future adapters in the overview and stack).
- A durable message queue instead of Redis Pub/Sub (ADR-0002 records this as a
  future adapter behind the same port).
- Authentication / multi-tenant approver routing, Kubernetes, and autoscaling.
