# 0004 — Resumable runs via a serializable RunState and a RunStore port

## Status

Accepted — refines [ADR-0001](./0001-architecture-foundations.md).

## Context

Waiting on a human must not block a thread or lose progress, and the resume may
happen in another process or after a restart (see ADR-0001 and
[ADR-0002](./0002-approval-events-over-redis-pubsub.md)). We need a way to pause a
run and continue it later, anywhere.

## Decision

Model a run as a **fully serializable `RunState` aggregate**: the conversation
messages, the status, the current turn's pending tool-call queue plus a cursor,
the open `ApprovalRequest` (if any), and metadata. Persist it through a
**`RunStore`** port (`save` / `load`).

On a gated tool call the loop saves state and returns; on a decision the runner
loads state and calls `resume`. **Resume is idempotent, keyed by `requestId`**, so
a replayed decision cannot run a tool twice.

## Alternatives considered

- **In-process continuation / coroutine suspension**: elegant within one process,
  but it cannot survive a restart or move across hosts, and it ties a waiting run
  to a live process and thread.
- **A durable execution engine** (Temporal, Restate): solves pause/resume
  robustly, but is a large dependency and operational surface — disproportionate
  for a focused library and a demonstration.
- **Event sourcing the run**: clean audit, but more machinery than needed here.
  The `AuditSink` already records what happened, while `RunState` stays a simple
  snapshot.

## Consequences

- **+** Runs survive restarts and move between processes; the runner is stateless
  between runs because all state lives in the store.
- **+** State is plain data — easy to inspect, test, and persist anywhere
  (`InMemory`, `Redis`, later `Postgres` adapters).
- **−** The whole `RunState` is saved per step (a snapshot, not a delta). This is
  fine at this scale; revisit if individual runs grow very large.
- The core must keep `RunState` strictly serializable — no functions, sockets, or
  handles stored inside it.
