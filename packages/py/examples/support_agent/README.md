# Support-agent example (Python)

A small customer-support agent that shows the gate in action. The agent has four
tools — `search_knowledge_base` and `lookup_order` (safe) and `issue_refund` and
`send_email` (sensitive). It looks up an order on its own, then **pauses** before
the refund and the email until an approver signs off.

The model is scripted (`FakeLlmProvider`), so the demo is deterministic and needs
no API key. In production you would swap in `AnthropicProvider` or `OpenAiProvider`.
This is the exact same scenario as the TypeScript example, with identical output.

## Run it

From `packages/py`:

```bash
uv run python -m examples.support_agent.in_memory_demo  # one process, in-memory
uv run python -m examples.support_agent.redis_demo      # over real Redis Pub/Sub
```

Or from the repo root: `make py-demo` (in-memory) or `make up-py` (Redis via Docker
Compose).

## What you'll see

```
[TOOL] lookup_order(...)              # safe — runs automatically
[GATE] approving issue_refund(...)    # sensitive — paused for approval
[TOOL] issue_refund(...)              # runs only after approval
[GATE] approving send_email(...)
[TOOL] send_email(...)
[RESULT] status=completed audit_events=12
```

## Files

- `wiring.py` — the four tools and the scripted model.
- `in_memory_demo.py` — the flow in one process over the in-memory bus.
- `redis_demo.py` — the same flow over a real Redis bus and store.
