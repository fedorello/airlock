# 0001 — Architecture foundations

## Status

Accepted

## Context

Airlock is a model-agnostic, human-in-the-loop approval gate for AI agents,
shipped for both TypeScript and Python. It is a demonstration project, so the
design has to be clean, readable, and obviously correct — the architecture is
part of what it demonstrates.

The central risk we are guarding against is an agent that reads untrusted input
**and** can take irreversible actions. Safety therefore has to be a structural
property, not a prompt instruction. That requirement drives the decisions below.

## Decision

1. **Hexagonal architecture (ports & adapters).** The domain core — tools, risk
   tiers, the agent loop, and the approval gate — depends only on ports
   (interfaces). It must not import any HTTP client, Redis, or LLM SDK.
   Infrastructure lives at the edges as adapters: LLM providers, the event bus,
   transports, and storage.
2. **Event-driven via Redis Pub/Sub.** Approval requests and decisions are
   modeled as events and move over a Redis Pub/Sub adapter that sits behind an
   event port. This decouples the agent from whoever approves it — they can run
   in different processes or services. An in-memory event adapter is provided for
   local development and tests.
3. **Model-agnostic providers.** Every LLM provider (Anthropic, OpenAI,
   OpenRouter, Ollama, …) is an adapter behind a single provider port. Adding or
   switching a model must never touch the core.
4. **Dual-language parity.** TypeScript and Python implementations follow the
   same design, names, and boundaries, so the repository reads as one coherent
   project.
5. **Deterministic tests.** Core logic is covered by fast, deterministic tests
   using a fake provider and the in-memory event adapter. No live API calls in
   tests.

## Consequences

**Positive**

- The core is pure and trivially testable; behavior can be verified without a
  network, Redis, or API keys.
- Vendors and transports are swappable without changing business logic.
- The codebase stays small and readable, which is the point of the project.

**Trade-offs**

- Maintaining two language implementations in parity is extra work; we accept it
  because dual-language support is a goal.
- The event-driven path introduces Redis as an infrastructure dependency; the
  in-memory event adapter keeps local use and tests dependency-free.
