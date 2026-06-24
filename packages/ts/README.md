# airlock (TypeScript)

A human-approval gate for the dangerous things an AI agent does. This is the
TypeScript package; see the [repository root](../../README.md) for the full story,
the quickstart, and the Python package.

## Install

```bash
pnpm add airlock   # once published; for now, use it from this repo
```

Requires Node 24+.

## What you get

- An `Agent` that runs a tool-use loop and **pauses** before any tool you mark
  `RiskTier.Sensitive`, until a human approves, edits, or rejects it.
- Model-agnostic providers (`AnthropicProvider`, `OpenAiProvider`) over an injected
  `fetch` — no SDKs.
- Redis store and Pub/Sub bus for pause/resume across processes, plus in-memory
  fakes for tests and demos.

See the [root quickstart](../../README.md#quickstart) for a ~20-line example.

## Layout (hexagonal — imports point inward)

- `src/domain` — tools, risk tiers, messages, runs, events, errors. No I/O.
- `src/application` — the agent loop, the gate policy, and the ports (interfaces).
- `src/infrastructure` — adapters: providers, the Redis store and bus, audit sinks,
  clocks, id generators, and the in-memory fakes.
- `src/interface` — driving adapters: the runner and the approver.
- `examples/support-agent` — a runnable demo (see its
  [README](./examples/support-agent/README.md)).

## Scripts

| Command                         | What it does                                                   |
| ------------------------------- | -------------------------------------------------------------- |
| `pnpm typecheck`                | strict `tsc`                                                   |
| `pnpm lint`                     | ESLint, including the hexagonal import-boundary rule           |
| `pnpm test:cov`                 | unit + eval tests with coverage (≥ 90%)                        |
| `pnpm test:integration`         | Redis integration tests (needs a Redis on `AIRLOCK_REDIS_URL`) |
| `pnpm demo` / `pnpm demo:redis` | run the support-agent demo                                     |

Built and tested to [CODING_PRINCIPLES.md](../../CODING_PRINCIPLES.md). From the
repo root, `make ts-check` runs the full gate.
