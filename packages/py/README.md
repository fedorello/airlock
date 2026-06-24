# airlock (Python)

A human-approval gate for the dangerous things an AI agent does. This is the
Python package; see the [repository root](../../README.md) for the full story, the
quickstart, and the TypeScript package. It mirrors the TypeScript package
one-to-one (same design, same names).

## Install

```bash
uv add airlock   # once published; for now, use it from this repo
```

Requires Python 3.13+ and [uv](https://docs.astral.sh/uv/).

## What you get

- An `Agent` that runs a tool-use loop and **pauses** before any tool you mark
  `RiskTier.SENSITIVE`, until a human approves, edits, or rejects it.
- Model-agnostic providers (`AnthropicProvider`, `OpenAiProvider`) over an injected
  `httpx` client — no SDKs.
- Redis store and Pub/Sub bus for pause/resume across processes, plus in-memory
  fakes for tests and demos.

See the [root quickstart](../../README.md#quickstart) for a ~20-line example.

## Layout (hexagonal — imports point inward)

- `src/airlock/domain` — tools, risk tiers, messages, runs, events, errors. No I/O.
- `src/airlock/application` — the agent loop, the gate policy, and the ports
  (`Protocol`s).
- `src/airlock/infrastructure` — adapters: providers, the Redis store and bus,
  audit sinks, clocks, id generators, and the in-memory fakes.
- `src/airlock/interface` — driving adapters: the runner and the approver.
- `src/airlock/core` — `Settings` (pydantic-settings).
- `examples/support_agent` — a runnable demo (see its
  [README](./examples/support_agent/README.md)).

## Commands

| Command | What it does |
| --- | --- |
| `uv run ruff check . && uv run ruff format --check .` | lint + format |
| `uv run mypy` | `mypy --strict` |
| `uv run lint-imports` | hexagonal import contracts |
| `uv run pytest` | unit + eval tests with coverage (≥ 90%) |
| `uv run pytest tests/integration --no-cov` | Redis integration tests |

Built and tested to [CODING_PRINCIPLES.md](../../CODING_PRINCIPLES.md). From the
repo root, `make py-check` runs the full gate.
