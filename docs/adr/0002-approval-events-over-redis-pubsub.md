# 0002 — Approval coordination over Redis Pub/Sub

## Status

Accepted — refines [ADR-0001](./0001-architecture-foundations.md).

## Context

ADR-0001 established an event-driven, decoupled approval flow. This ADR records
the concrete transport and its semantics. When the agent reaches a gated tool
call it must suspend and later resume once a human decides — possibly in a
different process or on a different host. We need a way to deliver the
`approval.requested` and `approval.decided` events between the runner and the
people approving.

## Decision

Use **Redis Pub/Sub** behind an `EventBus` port (`publish` / `subscribe`). Two
topics carry the flow: `approval.requested` (published when the loop suspends)
and `approval.decided` (published by an approver, consumed by the runner to
resume); optional lifecycle topics carry `run.*` events for observability.

The **authoritative state is the `RunState` in the `RunStore`**. Pub/Sub carries
notifications, not durable truth. An `InMemory` `EventBus` implements the same
port for single-process use and tests.

## Alternatives considered

- **In-process / blocking human-in-the-loop** (e.g. a coroutine interrupt): the
  simplest option, but it couples the agent and the approver into one process and
  blocks while waiting. It cannot survive a restart or move across hosts.
- **A durable message queue** (RabbitMQ, NATS, Kafka): stronger delivery
  guarantees and persistence, but heavier to run and operate — disproportionate
  for this primitive. It can be added later as another `EventBus` adapter.
- **HTTP webhooks**: requires every approver to be reachable and individually
  managed; more moving parts than a shared bus.
- **Database polling**: simple but adds latency and load; the store is already the
  source of truth, and Pub/Sub gives push notifications without polling.

## Consequences

- **+** Lightweight, push-based, and decoupled; Redis already backs the run store,
  so no new infrastructure.
- **−** Redis Pub/Sub is fire-and-forget (at-most-once, non-persistent): a
  subscriber that is down misses the message. This is acceptable because
  `RunState` is durable — a missed notification is recoverable by re-reading or
  re-publishing, and **resume is idempotent, keyed by `requestId`**, so a
  duplicate decision cannot execute a tool twice.
- Moving to a durable queue later is a new adapter behind the same port; the core
  is unaffected.
