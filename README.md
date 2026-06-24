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

## Quickstart

The packages live in [`packages/ts`](./packages/ts) and
[`packages/py`](./packages/py). `make install` installs both; the snippets below
import from `airlock` (the package name once published).

Gate a dangerous action in ~20 lines. The agent wants to send an email — the run
**pauses** before it happens, and the email is sent only once you approve.

**TypeScript**

```ts
import {
  Agent, DecisionType, FakeLlmProvider, InMemoryAuditSink, InMemoryEventBus,
  InMemoryRunStore, RiskBasedGatePolicy, RiskTier, SystemClock, UuidIdGenerator,
} from "airlock";

const sendEmail = {
  name: "send_email", description: "Send an email", parameters: { type: "object" },
  risk: RiskTier.Sensitive, // sensitive: must be approved before it runs
  handler: async (args) => { console.log("SENDING:", args); return "sent"; },
};

// A scripted model — swap for AnthropicProvider / OpenAiProvider in production.
const provider = new FakeLlmProvider([
  { text: null, toolCalls: [{ id: "1", name: "send_email", args: { to: "alice@example.com" } }] },
  { text: "Done.", toolCalls: [] },
]);

const agent = new Agent({
  provider, tools: [sendEmail], events: new InMemoryEventBus(), store: new InMemoryRunStore(),
  audit: new InMemoryAuditSink(), clock: new SystemClock(), ids: new UuidIdGenerator(),
  gatePolicy: new RiskBasedGatePolicy(), systemPrompt: "You are a support agent.",
});

const paused = await agent.run("Email Alice a refund confirmation");
console.log(paused.status); // "awaiting_approval" — nothing sent yet
const done = await agent.resume(paused.runId, paused.approval!.requestId, {
  type: DecisionType.Approve, approver: "you@example.com",
});
console.log(done.status); // "completed" — now the email was sent
```

**Python**

```python
import asyncio
from airlock import (
    Agent, AgentDependencies, ApproveDecision, CompletionResult, FakeLlmProvider,
    InMemoryAuditSink, InMemoryEventBus, InMemoryRunStore, RiskBasedGatePolicy,
    RiskTier, SystemClock, Tool, ToolCall, ToolCallId, UuidIdGenerator,
)

async def send_email(args):
    print("SENDING:", dict(args)); return "sent"

tool = Tool(name="send_email", description="Send an email", parameters={"type": "object"},
            risk=RiskTier.SENSITIVE, handler=send_email)  # sensitive: must be approved

# A scripted model — swap for AnthropicProvider / OpenAiProvider in production.
provider = FakeLlmProvider([
    CompletionResult(text=None, tool_calls=(
        ToolCall(id=ToolCallId("1"), name="send_email", args={"to": "alice@example.com"}),)),
    CompletionResult(text="Done.", tool_calls=()),
])

agent = Agent(AgentDependencies(
    provider=provider, tools=[tool], events=InMemoryEventBus(), store=InMemoryRunStore(),
    audit=InMemoryAuditSink(), clock=SystemClock(), ids=UuidIdGenerator(),
    gate_policy=RiskBasedGatePolicy(), system_prompt="You are a support agent."))

async def main():
    paused = await agent.run("Email Alice a refund confirmation")
    print(paused.status)  # "awaiting_approval" — nothing sent yet
    done = await agent.resume(paused.run_id, paused.approval.request_id,
                              ApproveDecision(approver="you@example.com"))
    print(done.status)  # "completed" — now the email was sent

asyncio.run(main())
```

Want to see it end to end? Run the support-agent demo — no API key needed:

```bash
make demo     # TypeScript, in-memory
make py-demo  # Python, in-memory
make up       # TypeScript over real Redis (Docker Compose)
make up-py    # Python over real Redis (Docker Compose)
```

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

See the [full architecture, with diagrams](./docs/architecture/overview.md), the
[language-neutral contract](./docs/design/contracts.md), and the
[decision records](./docs/adr/).

## Does it actually work?

Yes — and we proved it end to end, against the real package, in both languages, on a
real Redis. The highlights:

- **The gate holds under attack.** A fully compromised model reads a poisoned ticket
  and _obeys_ it, trying to wire **$1,000,000** to an attacker. The gate pauses it,
  the human rejects it, **$0 moves** — and the attempt is logged.
- **Resume survives a process dying.** Across three separate OS processes sharing
  only Redis: one starts a run and exits at the gate, a **different** process resumes
  it after a **separate** approver approves — the dangerous action runs only then.
- **The human stays in control.** Approve, **edit** (a $10,000 refund becomes $50),
  and reject all work end to end.
- **A solid floor.** TypeScript 84 tests, Python 74 tests, Redis integration tests on
  a real instance, a 36-case agent eval suite in both languages, and green CI.

The takeaway: the safety property is enforced by the **architecture, not a prompt**.

📄 **Read the full story — the problem, the build, and the proof with log excerpts:
[`docs/reports/project-report.md`](./docs/reports/project-report.md)** (and the
[end-to-end verification](./docs/reports/e2e-verification.md)).

## Status

**v0.1.0** — complete and tested in both languages: the agent loop and gate,
providers, Redis adapters, the runnable example, CI, and an eval suite. Built in
the open as a demonstration of the approach. See the
[changelog](./CHANGELOG.md), [`CONTRIBUTING.md`](./CONTRIBUTING.md), the project
rules in [`CLAUDE.md`](./CLAUDE.md), and the engineering standard it holds itself
to in [`CODING_PRINCIPLES.md`](./CODING_PRINCIPLES.md).

## License

MIT — see [`LICENSE`](./LICENSE).
