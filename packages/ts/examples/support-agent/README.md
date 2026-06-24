# Support-agent example (TypeScript)

A small customer-support agent that shows the gate in action. The agent has four
tools — `search_knowledge_base` and `lookup_order` (safe) and `issue_refund` and
`send_email` (sensitive). It looks up an order on its own, then **pauses** before
the refund and the email until an approver signs off.

The model is scripted (`FakeLlmProvider`), so the demo is deterministic and needs
no API key. In production you would swap in `AnthropicProvider` or `OpenAiProvider`.

## Run it

From `packages/ts`:

```bash
pnpm demo        # in-memory: agent, runner, and approver in one process
pnpm demo:redis  # over real Redis Pub/Sub (needs a Redis on AIRLOCK_REDIS_URL)
```

Or from the repo root: `make demo` (in-memory) or `make up` (Redis via Docker
Compose).

## What you'll see

```
[TOOL] lookup_order(...)                 # safe — runs automatically
[GATE] approving issue_refund(...)       # sensitive — paused for approval
[TOOL] issue_refund(...)                 # runs only after approval
[GATE] approving send_email(...)
[TOOL] send_email(...)
[RESULT] status=completed audit_events=12
```

## Files

- `wiring.ts` — the four tools and the scripted model.
- `in-memory-demo.ts` — the flow in one process over the in-memory bus.
- `redis-demo.ts` — the same flow over a real Redis bus and store.
