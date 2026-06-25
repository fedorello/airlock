# airlock-hitl

**A human-approval gate for the dangerous things an AI agent does.** This is the
Python package; it mirrors the
[TypeScript package](https://www.npmjs.com/package/@fedorello/airlock) one-to-one.
The full story, design notes, and a live dashboard demo are in the
[repository](https://github.com/fedorello/airlock).

An agent that can act on untrusted input is dangerous: a prompt injection or a
plain mistake can make it pay, email, or delete the wrong thing — and a system
prompt won't stop it. Airlock assumes the model will be hijacked and puts the
safety boundary in the **architecture**: every tool you mark `SENSITIVE` pauses
for a human to approve, edit, or reject before it runs.

## Install

```bash
pip install airlock-hitl      # or: uv add airlock-hitl
```

The distribution is named `airlock-hitl`; the import is `airlock`. Requires
Python 3.13+.

## Quickstart

The agent wants to send an email — the run **pauses** before it happens, and the
email is sent only once you approve.

```python
import asyncio

from airlock import (
    Agent,
    AgentDependencies,
    ApproveDecision,
    CompletionResult,
    FakeLlmProvider,
    InMemoryAuditSink,
    InMemoryEventBus,
    InMemoryRunStore,
    RiskBasedGatePolicy,
    RiskTier,
    SystemClock,
    Tool,
    ToolCall,
    ToolCallId,
    UuidIdGenerator,
)


async def send_email(args):
    print("SENDING:", dict(args))
    return "sent"


# Mark the tool SENSITIVE: it must be approved before it runs.
tool = Tool(
    name="send_email",
    description="Send an email",
    parameters={"type": "object"},
    risk=RiskTier.SENSITIVE,
    handler=send_email,
)

# A scripted model — swap for AnthropicProvider / OpenAiProvider in production.
provider = FakeLlmProvider(
    [
        CompletionResult(
            text=None,
            tool_calls=(ToolCall(id=ToolCallId("1"), name="send_email", args={"to": "alice@example.com"}),),
        ),
        CompletionResult(text="Done.", tool_calls=()),
    ]
)

agent = Agent(
    AgentDependencies(
        provider=provider,
        tools=[tool],
        events=InMemoryEventBus(),
        store=InMemoryRunStore(),
        audit=InMemoryAuditSink(),
        clock=SystemClock(),
        ids=UuidIdGenerator(),
        gate_policy=RiskBasedGatePolicy(),
        system_prompt="You are a support agent.",
    )
)


async def main():
    paused = await agent.run("Email Alice a refund confirmation")
    print(paused.status)  # "awaiting_approval" — nothing sent yet
    done = await agent.resume(
        paused.run_id, paused.approval.request_id, ApproveDecision(approver="you@example.com")
    )
    print(done.status)  # "completed" — now the email was sent


asyncio.run(main())
```

In production, swap `FakeLlmProvider` for `AnthropicProvider` or `OpenAiProvider`,
and the in-memory adapters for `RedisRunStore` + `RedisEventBus` so runs pause and
resume across processes. Runnable end-to-end demos (CLI approver, Redis, the
dashboard) are in the
[repository](https://github.com/fedorello/airlock/tree/main/packages/py/examples).

## What you get

- An `Agent` that runs a tool-use loop and **pauses** before any tool you mark
  `RiskTier.SENSITIVE`, until a human approves, edits, or rejects it.
- Model-agnostic providers (`AnthropicProvider`, `OpenAiProvider`) over an
  injected `httpx` client — no vendor SDKs.
- A Redis store and Pub/Sub bus for pause/resume across processes, plus in-memory
  fakes for tests and demos.

## Layout (hexagonal — imports point inward)

- `airlock.domain` — tools, risk tiers, messages, runs, events, errors. No I/O.
- `airlock.application` — the agent loop, the gate policy, and the ports
  (`Protocol`s).
- `airlock.infrastructure` — adapters: providers, the Redis store and bus, audit
  sinks, clocks, id generators, and the in-memory fakes.
- `airlock.interface` — driving adapters: the runner and the approver.
- `airlock.core` — `Settings` (pydantic-settings).

## License

[MIT](https://github.com/fedorello/airlock/blob/main/LICENSE) — see the
[repository](https://github.com/fedorello/airlock) for contributing and the full
engineering write-up.
