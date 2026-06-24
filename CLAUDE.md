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
