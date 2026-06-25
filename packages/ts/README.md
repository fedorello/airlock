# @fedorello/airlock

**A human-approval gate for the dangerous things an AI agent does.** This is the
TypeScript package; see the [repository root](https://github.com/fedorello/airlock)
for the full story and the Python package (which mirrors this one one-to-one).

An agent that can act on untrusted input is dangerous: a prompt injection or a
plain mistake can make it pay, email, or delete the wrong thing — and a system
prompt won't stop it. Airlock assumes the model will be hijacked and puts the
safety boundary in the **architecture**: every tool you mark `Sensitive` pauses
for a human to approve, edit, or reject before it runs.

## Install

```bash
npm install @fedorello/airlock
# or: pnpm add @fedorello/airlock   /   yarn add @fedorello/airlock
```

Requires Node 24+. Runtime dependencies: `zod`, and `ioredis` (only if you use the
Redis adapters).

## What you get

- An `Agent` that runs a tool-use (ReAct) loop and **pauses** before any tool you
  tag `RiskTier.Sensitive`, until a human decides: `approve`, `edit` (change the
  arguments first), or `reject`.
- Model-agnostic providers (`AnthropicProvider`, `OpenAiProvider`) that call the
  APIs directly over an injected `fetch` — no vendor SDKs.
- A Redis run store + Pub/Sub bus so a run can pause, persist, and resume in
  another process, plus in-memory fakes for tests and demos.

## Quickstart

```ts
import {
  Agent,
  RiskTier,
  RiskBasedGatePolicy,
  SystemClock,
  UuidIdGenerator,
  InMemoryRunStore,
  InMemoryEventBus,
  InMemoryAuditSink,
  AnthropicProvider,
} from "@fedorello/airlock";

const agent = new Agent({
  provider: new AnthropicProvider({
    apiKey: process.env.AIRLOCK_API_KEY!,
    model: "claude-sonnet-4-6",
  }),
  systemPrompt: "You are a careful support agent.",
  tools: [
    {
      name: "lookup_order",
      description: "Look up an order by id.",
      parameters: { type: "object", properties: { orderId: { type: "string" } } },
      risk: RiskTier.Safe, // runs on its own
      handler: async (args) => db.findOrder(args.orderId as string),
    },
    {
      name: "issue_refund",
      description: "Refund an order.",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" }, amount: { type: "number" } },
      },
      risk: RiskTier.Sensitive, // pauses at the gate
      handler: async (args) => payments.refund(args),
    },
  ],
  events: new InMemoryEventBus(),
  store: new InMemoryRunStore(),
  audit: new InMemoryAuditSink(),
  clock: new SystemClock(),
  ids: new UuidIdGenerator(),
  gatePolicy: new RiskBasedGatePolicy(),
});

const run = await agent.run("Refund order ord-42 for $49.99.");
// On a sensitive tool, the run suspends. An approver — a CLI, the bundled
// Next.js dashboard, Slack, a queue — listens for the approval.requested event
// and posts a decision; the runner resumes the run.
```

For runnable end-to-end wiring (a CLI approver, Redis pause/resume across
processes, and the dashboard), see the
[`examples`](https://github.com/fedorello/airlock/tree/main/packages/ts/examples)
and the [root quickstart](https://github.com/fedorello/airlock#quickstart).

## Is this just LangGraph?

No — and it isn't trying to be. LangGraph is a graph-orchestration framework with
its own `interrupt()` for human-in-the-loop. Airlock is a small, framework-free
**primitive**: you bolt the gate onto whatever agent loop you already have, the
gate is a property of the tool (`Sensitive`) rather than a node in a graph, and
the same library exists for TypeScript and Python. If you're already on a graph
framework, use its interrupts. If you want a tiny, auditable, model-agnostic gate
without adopting a framework, that's this.

## Layout (hexagonal — imports point inward)

- `src/domain` — tools, risk tiers, messages, runs, events, errors. No I/O.
- `src/application` — the agent loop, the gate policy, and the ports (interfaces).
- `src/infrastructure` — adapters: providers, the Redis store and bus, audit sinks,
  clocks, id generators, and the in-memory fakes.
- `src/interface` — driving adapters: the runner and the approver.

## License

[MIT](./LICENSE)
