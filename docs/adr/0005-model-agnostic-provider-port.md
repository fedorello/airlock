# 0005 — A normalized, model-agnostic provider port

## Status

Accepted — refines [ADR-0001](./0001-architecture-foundations.md).

## Context

ADR-0001 requires the model to be a setting, not a rewrite. But vendors differ in
their tool-use APIs — Anthropic uses messages with `tool_use` content blocks,
OpenAI uses chat completions with `tool_calls`, and others vary again. The core
must not depend on any of these shapes.

## Decision

Define one **`LlmProvider`** port with a single method:
`complete(system, messages, tools) -> { text?, toolCalls[] }`. Each vendor is an
**adapter** that translates to and from this normalized shape. The **`OpenAI`**
adapter also serves OpenRouter and any OpenAI-compatible endpoint via a
configurable `base_url`; **`Ollama`** covers local models; a **`Fake`** adapter
returns scripted output for deterministic tests.

## Alternatives considered

- **Adopt a vendor SDK's abstraction directly**: couples the core to that
  vendor's types and release cadence — the opposite of model-agnostic.
- **Use an aggregator (e.g. LiteLLM) as the boundary**: convenient, but adds a
  dependency and an abstraction we do not control. A demonstration of clean design
  benefits from owning a tiny, explicit port instead.
- **Support OpenAI-compatible endpoints only**: simplest, but excludes Anthropic's
  native API and its tool-use semantics. Claude is a first-class target, so this
  is too limiting.

## Consequences

- **+** Adding or switching a model never touches the core; tests run entirely
  against the `Fake` adapter with no network and no keys.
- **+** The normalized request/response shape keeps the agent loop fully
  vendor-neutral.
- **−** We own the per-vendor translation and must track tool-use API changes. The
  surface is one method, so the maintenance cost is small and contained in the
  adapter.
