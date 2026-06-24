# 0003 — Two-tier risk model with an injectable gate policy

## Status

Accepted — refines [ADR-0001](./0001-architecture-foundations.md).

## Context

The core promise of Airlock is that dangerous actions require human approval. To
deliver that, the system must classify which tool calls are dangerous and decide
when to gate them. This ADR records the classification model and where the gating
rule lives.

## Decision

Each `Tool` declares a `RiskTier` of **`safe`** (read-only, auto) or
**`sensitive`** (side-effecting, gated). Whether a *specific* call needs approval
is decided by a **`GatePolicy`** strategy injected into the agent loop. The
default policy is simply: `sensitive` → require approval, `safe` → auto. Richer,
context-aware policies implement the same interface (for example: auto-approve
small refunds but gate large ones; gate per tenant; always gate in production).

## Alternatives considered

- **Per-tool boolean (`requiresApproval`)**: the simplest model, but it cannot
  express context (amount, tenant, environment) without editing tool code.
- **Many-level tiers** (safe / low / medium / high / critical): more expressive,
  but harder to reason about and rarely needed. Two tiers plus a policy cover the
  same ground with less ceremony.
- **Capability / permission ACLs**: powerful but heavy; out of scope for the core
  primitive. Such a scheme can live inside a custom `GatePolicy` adapter.
- **Letting the model decide whether something needs approval**: rejected. The
  model is exactly the component we do not trust for this; the gate must be
  deterministic and live outside the prompt.

## Consequences

- **+** The gating rule is kept out of tool definitions and out of the prompt, so
  it is deterministic, testable, and swappable.
- **+** Tiers stay simple; complexity moves into an optional policy only when a
  project actually needs it.
- **−** Tool authors must classify each tool honestly — a tool mis-tagged `safe`
  bypasses the gate. This is a documented review/lint concern, not something the
  runtime can infer.
