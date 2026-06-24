# CLAUDE.md

Project rules for AI assistants (and humans) working in this repo. Keep them.

## What this is

Airlock is a small, model-agnostic toolkit that puts a human-approval gate in
front of an AI agent's dangerous actions. It ships for **TypeScript** and
**Python**. This is a **demonstration project**: it exists to show clear
understanding of agent safety and the ability to write high-quality code with an
**AI-native** workflow.

## Rules

1. **English only.** All code, comments, docs, commits, and identifiers are in
   English.
2. **Follow [`CODING_PRINCIPLES.md`](./CODING_PRINCIPLES.md) strictly.** It is the
   engineering standard for this repo — clean code, tests, and discipline. When in
   doubt, it wins.
3. **Clean, structured layout.** Everything lives in a sensible folder. No loose
   files, no dumping ground. The structure should make the design obvious.
4. **Hexagonal architecture (ports & adapters).** The domain core — tools, risk
   tiers, the agent loop, the approval gate — must not import HTTP, Redis, or any
   LLM SDK. Infrastructure (LLM providers, Redis, transports, storage) lives at
   the edges as adapters behind ports. Keep the core pure and testable.
5. **Event-driven via Redis Pub/Sub.** Approval requests and decisions move as
   events over Redis Pub/Sub, so the agent and the approving human are decoupled.
   The core depends on an event-port abstraction, not on Redis directly.
6. **Model-agnostic.** Every LLM provider is an adapter behind one port. Adding a
   provider must never touch the core.
7. **Keep TypeScript and Python in parity.** The two implementations follow the
   same design and naming so the repo reads as one coherent project.
8. **Tests are not optional.** Core logic is covered by fast, deterministic tests
   (use a fake provider — no live API calls in tests).
9. **Conventional Commits, strictly.** Every commit message follows
   [Conventional Commits](https://www.conventionalcommits.org):
   `<type>(<optional scope>): <description>`. Allowed types: `feat`, `fix`,
   `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`, `revert`.
   Use the imperative mood, keep the subject short, and add a body for the _why_
   when it isn't obvious. Breaking changes use `!` and a `BREAKING CHANGE:`
   footer. One logical change per commit.
10. **Tooling & deployment.** Local development and deployment run through
    **Docker Compose** (the app services plus Redis for the event bus). A
    well-structured **Makefile** is the single entry point for common tasks —
    `make help` lists everything, with targets such as `make up`, `make down`,
    `make test`, `make lint`, `make fmt`, and `make check` (the full local gate).
    Keep targets discoverable, self-documenting, and consistent across the
    TypeScript and Python packages.

## Documentation index

All docs live under [`docs/`](./docs/) (see [`docs/README.md`](./docs/README.md)
for the layout). Keep this index in sync — when you add a document, add it here.

- [`CODING_PRINCIPLES.md`](./CODING_PRINCIPLES.md) — the engineering standard for
  this repo (clean code, tests, discipline).
- [`docs/README.md`](./docs/README.md) — documentation layout and conventions.
- [`docs/stack.md`](./docs/stack.md) — the technology stack and pinned package
  versions (current stable, verified 2026-06-24).
- [`docs/architecture/overview.md`](./docs/architecture/overview.md) — the full
  architecture: the hexagon, domain model, ports & adapters, the agent loop, run
  lifecycle, the Redis Pub/Sub event flow, security model, package structure, and
  deployment topology.
- [`docs/design/contracts.md`](./docs/design/contracts.md) — the precise,
  language-neutral contract both packages implement (signatures, state machine,
  invariants, errors).
- [`docs/plans/implementation-plan.md`](./docs/plans/implementation-plan.md) — the
  phased implementation roadmap with a status snapshot and per-phase Definition of
  Done.
- **ADRs** (`docs/adr/`):
  - [`0001-architecture-foundations.md`](./docs/adr/0001-architecture-foundations.md)
    — hexagonal architecture, Redis Pub/Sub event-driven, model-agnostic
    providers, dual-language parity, deterministic tests.
  - [`0002-approval-events-over-redis-pubsub.md`](./docs/adr/0002-approval-events-over-redis-pubsub.md)
    — Redis Pub/Sub as the approval-event transport and its semantics.
  - [`0003-two-tier-risk-model-with-gate-policy.md`](./docs/adr/0003-two-tier-risk-model-with-gate-policy.md)
    — `safe`/`sensitive` tiers plus an injectable `GatePolicy`.
  - [`0004-resumable-runs-via-runstate-and-runstore.md`](./docs/adr/0004-resumable-runs-via-runstate-and-runstore.md)
    — serializable `RunState` + `RunStore` for pause/resume.
  - [`0005-model-agnostic-provider-port.md`](./docs/adr/0005-model-agnostic-provider-port.md)
    — one normalized `LlmProvider` port, one adapter per vendor.
  - [`0006-dual-language-parity-monorepo.md`](./docs/adr/0006-dual-language-parity-monorepo.md)
    — TypeScript + Python parity in a single monorepo.
