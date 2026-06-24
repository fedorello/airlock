# 0006 — Dual-language parity in a single monorepo

## Status

Accepted — refines [ADR-0001](./0001-architecture-foundations.md).

## Context

ADR-0001 made dual-language support a goal: TypeScript clients (Next.js / Node —
the work this project is meant to demonstrate) and Python clients (FastAPI /
data). This ADR records how the two implementations are organized and kept
honest.

## Decision

Use **one monorepo** with `packages/ts` and `packages/py`. Each package follows
the **same hexagonal layering and the same names**, so the repository reads as one
coherent project. Shared design and decisions live in `docs/`. The two
implementations are written **in parallel and kept in parity by review**, not
generated.

## Alternatives considered

- **A single language**: a smaller surface to maintain, but it abandons half the
  audience the project is meant to reach.
- **Two separate repositories**: cleaner for publishing, but the parity story —
  the same design expressed idiomatically in two languages — is the point, and it
  is easier to keep aligned in one place.
- **Generate one language from the other (or from a shared schema)**: tempting for
  guaranteed parity, but idiomatic TypeScript and Python differ enough that
  generated code reads poorly. Readability is an explicit goal of this project.

## Consequences

- **+** One coherent project that demonstrates the architecture twice, each in its
  own idiom.
- **+** Shared docs and ADRs cover both packages at once.
- **−** Parity is manual: a change in one language must be mirrored and reviewed in
  the other (enforced by a rule in `CLAUDE.md`). This is the accepted cost of the
  dual-language goal.
