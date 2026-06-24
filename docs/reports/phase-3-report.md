# Phase 3 — implementation report

**Status:** ✅ Done (2026-06-24)
**Scope:** TypeScript interface — the agent runner, the approver, the
support-agent example, Docker Compose, and the Makefile. The project is now
runnable end to end.
**Plan:** [implementation-plan.md → Phase 3](../plans/implementation-plan.md)

## Summary

Phase 3 turned the library into a running system. The runner and approver are the
two driving adapters that close the approval loop over the event bus, and the
support-agent example shows the whole thing working: an agent drafts and acts, the
gate pauses every sensitive action, an approver decides, and the runner resumes —
the same decoupled shape in memory and over Redis. It was verified by running both
demos, including over a real Redis via Docker Compose.

## Delivered

Production code (`packages/ts/src/interface`):

- `runner.ts` — `AgentRunner`: subscribes to `approval.decided`, validates the
  payload, and calls `Agent.resume`. Stateless between events (run state lives in
  the store), so it scales independently.
- `approver/approver.ts` — `Approver` and the `DecisionSource` type: subscribes to
  `approval.requested`, asks its injected decision source, and publishes
  `approval.decided`.
- `approver/auto-approve-decision-source.ts` — `autoApproveDecisionSource` for
  demos, smoke tests, and automated flows.
- `approver/cli-decision-source.ts` — `cliDecisionSource`, an interactive terminal
  approver (an I/O entry point, excluded from the coverage gate).
- `event-schemas.ts` — `parseApprovalDecided` / `parseApprovalRequested`, the
  `zod` validation at the bus edge.

Example (`packages/ts/examples/support-agent`):

- `wiring.ts` — the four tools (`search_knowledge_base`, `lookup_order` safe;
  `issue_refund`, `send_email` sensitive), a deterministic model script, and the
  system prompt.
- `in-memory-demo.ts` — runs the flow in one process over the in-memory bus.
- `redis-demo.ts` — runs the flow over a real Redis bus and store; used by Compose.

Tooling and ops:

- `deploy/docker/Dockerfile` and `deploy/docker/docker-compose.yml` — `redis:8.8`
  plus the demo service.
- Root `Makefile` — `help`, `install`, `typecheck`, `lint`, `fmt`, `fmt-check`,
  `test`, `test-integration`, `check`, `demo`, `up`, `down`.
- `pnpm-workspace.yaml` (`allowBuilds: esbuild`) so `pnpm run` and the Docker build
  work under pnpm 11; `.prettierignore`.

Tests (`packages/ts/test`): `schemas.test.ts` (validation) and `support-flow.test.ts`
(the full runner + approver + agent flow over the bus, for both approve and reject).

## Mapping to the design

- **Architecture §8 (event flow):** the runner subscribes to `approval.decided`;
  the approver to `approval.requested`. They never call each other — only the bus.
- **Architecture §12 (deployment):** Docker Compose runs `redis` plus the demo,
  matching the topology in the overview.
- **EventSubscriber port (ISP):** the runner and approver depend on the subscribe
  side; the core still depends only on the publish side.
- **ADR-0002:** verified over real Redis Pub/Sub — the run progresses purely
  through published/consumed events.

## Verification

- `make check` (typecheck + lint + format + unit coverage): green. **47 tests
  passing**, coverage **99.1% statements, 98.63% functions, 90.14% branches, 99.07%
  lines** (gate 90%).
- **In-memory demo** (`make demo`): prints the flow — `lookup_order` runs
  automatically, then `[GATE] approving issue_refund` and `[GATE] approving
  send_email` before each executes — and ends `status=completed`.
- **Docker Compose demo** (`make up`): built the image, started `redis:8.8-alpine`,
  and ran the demo over real Redis. Same flow, `status=completed`,
  `audit_events=12`, **`demo` exited 0**, and Redis persisted the run state. This
  exercises `RedisEventBus` + `RedisRunStore` + runner + approver + agent together.

## CODING_PRINCIPLES adherence

- **DI (§6):** the runner and approver take their dependencies via the constructor;
  the decision logic is an injected `DecisionSource`, so the same approver serves a
  CLI, a web UI, or a test.
- **Validation at the edge (§2.3):** events from the bus are validated with `zod`
  before use.
- **Hexagonal (§9):** the interface (driving) adapters depend on ports; the I/O-only
  CLI source is isolated and excluded from coverage (§10.7).
- **Tooling (CLAUDE.md):** Docker Compose + a self-documenting Makefile are the
  single entry point.
- **English-only, ≤ 30-line methods, no `any`, no magic strings.**

## Decisions and notes

- **Demos auto-approve by default** so they run unattended (CI / Compose); the
  interactive `cliDecisionSource` is wired and available for a human run.
- **The in-memory bus delivers synchronously**, so the in-memory demo's full
  approve→resume cascade completes within `agent.run` (the returned value is the
  pre-suspension snapshot; the store holds the completed run). Over Redis the bus
  is asynchronous and the demo awaits `run.completed` — the realistic decoupled
  path.
- **pnpm 11 build approval** moved from the package.json `pnpm` field to
  `pnpm-workspace.yaml` (`allowBuilds`); fixed so `pnpm run` and the Docker build
  succeed.

## Commits

- `a6b0a16` — feat(ts): add runner, approver, the support-agent example, Compose and Makefile
