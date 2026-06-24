# 0007 — Provider adapters call the HTTP APIs directly

## Status

Accepted — refines [ADR-0005](./0005-model-agnostic-provider-port.md).

## Context

ADR-0005 put every model behind one `LlmProvider` port, with one adapter per
vendor. This ADR records how those adapters talk to the vendors. The original
stack note listed the official SDKs (`@anthropic-ai/sdk`, `openai`); building the
adapters surfaced a better fit for this project's goals (testability, small
dependency surface, clarity).

## Decision

Provider adapters call the vendors' HTTP APIs **directly over an injected
`fetch`** (the platform `fetch`, injectable for tests), with no vendor SDKs:

- The `fetch` implementation is a constructor dependency (defaults to
  `globalThis.fetch`), so adapters are tested against recorded responses with no
  network and no keys.
- Responses are validated at the edge with `zod` before mapping to the normalized
  `CompletionResult`.
- The `OpenAI` adapter takes a configurable base URL, so it also serves OpenRouter
  and Ollama (any OpenAI-compatible endpoint).

## Alternatives considered

- **Official vendor SDKs**: convenient and handle transport details, but add a
  dependency per vendor and their own evolving types, and make unit-testing the
  mapping awkward (faking a large client surface). For a small, model-agnostic
  primitive that wants to demonstrate clean DI, owning the thin HTTP mapping is
  clearer.
- **An aggregator (LiteLLM-style)**: rejected in ADR-0005 for the same reasons.

## Consequences

- **+** Zero runtime dependencies for the providers beyond `zod`; adapters are
  fully unit-tested against recorded JSON via the injected `fetch`.
- **+** The request/response mapping is explicit and validated, not hidden in an
  SDK.
- **−** We track each vendor's HTTP request/response shape ourselves. The surface
  is small (one endpoint per provider) and changes rarely.
