# Airlock

[![CI](https://github.com/fedorello/airlock/actions/workflows/ci.yml/badge.svg)](https://github.com/fedorello/airlock/actions/workflows/ci.yml)

**A human-approval gate for the dangerous things an AI agent does.**

Airlock is a small, model-agnostic toolkit for building AI agents that can take
real actions — send an email, issue a refund, write to a database, run a
command — without letting them do it on their own. The agent reads and thinks
freely. But anything that touches the real world has to pass through an
_airlock_ first: a human approves, edits, or rejects it.

It ships for both **TypeScript** and **Python**.

> This is a demonstration project. It shows how I design and build production-grade
> AI-agent software with an AI-native workflow — clean architecture, clear
> boundaries, and code you can actually read.

---

## The problem

An AI agent that only chats is easy. An agent that _does things_ is where it
gets dangerous. The model reads untrusted text — a customer message, a web page,
the output of another tool — and the same agent can also send, pay, write, or
delete. One crafted message and it acts on the attacker's behalf, or it simply
makes the wrong call and emails the wrong person.

You can't fix this with a better prompt. "Please don't send anything risky" is a
suggestion the model is free to ignore. Safety has to be a **boundary in the
architecture**, not a line in the prompt.

Today you get two bad options:

1. Adopt a heavy agent framework just to get human-in-the-loop — and inherit its
   complexity and lock-in.
2. Hand-roll approval logic for every project — and everyone reinvents it, badly,
   with no audit trail and no way to resume.

## What Airlock does

You give each tool a **risk tier**:

- **Safe** tools (search, read, look up) run automatically.
- **Sensitive** tools (send, pay, refund, write, delete, run) **pause** and wait
  for a human to **approve / edit / reject**.

Everything in between is handled for you:

- **The agent loop** — a clean tool-use (ReAct) loop over any model.
- **The gate** — sensitive actions never execute until a human signs off.
- **Audit** — every model call, tool call, and approval decision is logged.
- **Resume** — a run can pause, persist, and continue later (even after a
  restart), so you never lose state waiting on a human.
- **Events over Redis Pub/Sub** — approval requests and decisions flow as events,
  so the human can approve from anywhere: a CLI, a web page, Slack, a queue.

The point in one line: **the agent physically cannot send or write without
passing the gate.**

## How it's different

The "AI agent governance / firewall" space is crowded, but almost everything in
it is one of two things: a **framework you must fully adopt** (you buy into the
whole orchestration engine to get an approval step), or a **heavyweight
enterprise platform** (SDK integration, policy servers, compliance suites).

Airlock is neither. It is a **small, framework-agnostic primitive** for the
builder who just wants the dangerous actions gated — and it is opinionated about
three things the convenient kits skip:

- **Security-first.** Read is separated from execute by design, because every
  input an agent reads is a place someone can inject instructions.
- **Model-agnostic.** Claude, OpenAI, OpenRouter, or a local model via Ollama —
  the model is a setting, never a rewrite.
- **Readable.** Hexagonal architecture keeps the core logic free of any vendor or
  transport, so you can read the whole thing in an afternoon and trust it.

## Architecture

- **Hexagonal (ports & adapters).** The domain core — tools, risk tiers, the
  agent loop, the approval gate — knows nothing about HTTP, Redis, or any LLM
  vendor. Those live at the edges as adapters.
- **Event-driven.** Approval requests and decisions are published and consumed
  over **Redis Pub/Sub**, so the agent and the humans approving it are decoupled
  and can live in different processes or services.
- **Model-agnostic providers.** Each LLM provider is an adapter behind one port.

## Status

Early and evolving. Built in the open as a demonstration of the approach. See
[`CLAUDE.md`](./CLAUDE.md) for the project rules and
[`CODING_PRINCIPLES.md`](./CODING_PRINCIPLES.md) for the engineering standard it
holds itself to.

## License

MIT — see [`LICENSE`](./LICENSE).
