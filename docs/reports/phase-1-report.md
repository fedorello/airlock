# Phase 1 — implementation report

**Status:** ✅ Done (2026-06-24)
**Scope:** TypeScript core — the agent loop with the approval gate, in-memory
fakes, and the full unit test suite.
**Plan:** [implementation-plan.md → Phase 1](../plans/implementation-plan.md)

## Summary

Phase 1 delivered the heart of Airlock: the `Agent` use case that runs a tool-use
loop with the human-approval gate built in, verified end to end against in-memory
fakes. Safe tools run automatically; a sensitive tool call suspends the run, and
`resume` applies the human decision idempotently. No network, no Redis, no real
models are involved — only the pure core and fakes.

## Delivered

Production code (`packages/ts/src`):

- `application/agent.ts` — the `Agent`: `run(input)` and
  `resume(runId, requestId, decision)`, with the private loop methods
  (`advance`, `processPending`, `suspendForApproval`, `runToolCall`, `callModel`,
  `startTurn`, `completeRun`, `applyDecision`, `appendRejection`, `isAwaiting`,
  `requireTool`, `recordAudit`). Constructed from a single `AgentDependencies`
  object; every method ≤ 30 lines.
- `application/gate-policy.ts` — `RiskBasedGatePolicy` (default: `sensitive`
  requires approval, `safe` does not).
- In-memory / fake adapters (`infrastructure/`):
  - `providers/fake-llm-provider.ts` — scripted completions (`FakeLlmProvider`,
    `ScriptExhaustedError`).
  - `events/in-memory-event-bus.ts` — `InMemoryEventBus` (publisher + subscriber).
  - `store/in-memory-run-store.ts` — `InMemoryRunStore` (deep-copies on save/load
    to mirror a serializing store).
  - `audit/in-memory-audit-sink.ts` — `InMemoryAuditSink`.
  - `clock/system-clock.ts`, `clock/fixed-clock.ts` — `Clock` implementations.
  - `ids/uuid-id-generator.ts`, `ids/sequential-id-generator.ts` — `IdGenerator`.

Tests (`packages/ts/test`): `agent.test.ts`, `fakes.test.ts`, and the
`support/harness.ts` test harness. The Vitest coverage gate (≥ 90%) was enabled.

## Mapping to the design

Every invariant in [`contracts.md`](../design/contracts.md) has a test:

| Invariant | Verified by |
| --- | --- |
| Gate before execute: a sensitive tool never runs without approval | "runs a safe tool automatically and suspends on a sensitive tool"; "never runs the sensitive tool before approval" |
| Approve executes the handler exactly once | "approve executes the gated tool exactly once and completes" |
| Edit uses the edited args | "edit replaces the arguments of the gated tool" |
| Reject feeds back and continues (not terminal) | "reject does not execute the tool and lets the run continue" |
| Resume is idempotent (keyed by `requestId`) | "is idempotent: replaying a decision does not execute the tool again" |
| Pause/persist/resume across processes | "resumes a persisted run in a fresh agent sharing the store" |
| Multiple tool calls in one turn pause at the gated one and resume by cursor | "pauses at the gated call and resumes from the same cursor" |
| Errors | "raises UnknownToolError…"; "raises RunNotFoundError…" |
| Full audit trail, UTC from the clock | "records the full audit trail with the injected clock" |

Aligns with ADR-0003 (gate policy), ADR-0004 (resumable runs).

## Verification

- `tsc --noEmit` (strict): clean.
- ESLint (typescript-eslint strict + stylistic): clean.
- Prettier: clean.
- Vitest: **23 tests passing**. Coverage: **99.15% statements, 100% functions,
  94.87% branches, 99.14% lines** (gate 90%). All tests deterministic (FixedClock,
  SequentialIdGenerator, FakeLlmProvider) — no network, time, or keys.

## CODING_PRINCIPLES adherence

- **DI (§6):** all dependencies injected via one constructor object; in-memory
  fakes, not mocks.
- **Hexagonal (§9):** the domain and the agent depend only on ports; no
  infrastructure imports in the core.
- **Sizes (§2.2):** every method ≤ 30 lines; ≤ 4 constructor params (one object).
- **Types (§2.3):** branded identifiers, no `any`, const-object enums (no magic
  strings); the rejection notice is a named constant.
- **Datetime (§7.7):** time only via the injected `Clock`, rendered as UTC ISO.
- **Testing (§10):** behavior-focused tests, in-memory fakes, deterministic,
  ≥ 90% coverage.
- **English-only (§2.4)** comments and docstrings.

## Decisions and deviations

- **Dropped `IdGenerator.toolCallId()` (YAGNI, §5):** while wiring the loop it
  became clear tool-call ids come from the model/provider, never minted by us, so
  the method was unused. Removed from the port and both generators, and the
  contract and architecture docs were synced in the same change.

## Commits

- `1bbc05b` — feat(ts): implement the agent loop with the gate, fakes, and tests
- `9f3ea8d` — docs(plans): mark Phase 1 done, Phase 2 next
