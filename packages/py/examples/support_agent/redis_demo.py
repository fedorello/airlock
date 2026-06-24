"""Runs the support flow over a real Redis bus and store. The agent, the runner,
and the approver communicate only through Redis Pub/Sub — the same decoupled
shape as production. Used by Docker Compose as a smoke test."""

import asyncio
import contextlib
import os

from redis.asyncio import Redis

from airlock import (
    Agent,
    AgentDependencies,
    AgentRunner,
    Approver,
    EventTopic,
    FakeLlmProvider,
    InMemoryAuditSink,
    MessageRole,
    RedisEventBus,
    RedisRunStore,
    RiskBasedGatePolicy,
    SystemClock,
    UuidIdGenerator,
    auto_approve_decision_source,
)
from airlock.domain.run import RunState
from examples.support_agent.wiring import (
    SUPPORT_REQUEST,
    SUPPORT_SCRIPT,
    SUPPORT_SYSTEM_PROMPT,
    create_support_tools,
)

REDIS_URL = os.environ.get("AIRLOCK_REDIS_URL", "redis://127.0.0.1:6379")
_SETTLE_SECONDS = 0.1
_TIMEOUT_SECONDS = 10.0


def _log(message: str) -> None:
    print(message)


def _final_answer(state: RunState | None) -> str:
    if state is None or not state.messages:
        return "(no answer)"
    last = state.messages[-1]
    return last.content if last.role == MessageRole.ASSISTANT else "(no answer)"


async def main() -> None:
    _log("=== Airlock support-agent demo (Redis) ===")
    publisher = Redis.from_url(REDIS_URL, decode_responses=True)
    subscriber = Redis.from_url(REDIS_URL, decode_responses=True)
    store_connection = Redis.from_url(REDIS_URL, decode_responses=True)
    bus = RedisEventBus(publisher, subscriber)
    store = RedisRunStore(store_connection)
    audit = InMemoryAuditSink()
    agent = Agent(
        AgentDependencies(
            provider=FakeLlmProvider(SUPPORT_SCRIPT),
            tools=create_support_tools(_log),
            events=bus,
            store=store,
            audit=audit,
            clock=SystemClock(),
            ids=UuidIdGenerator(),
            gate_policy=RiskBasedGatePolicy(),
            system_prompt=SUPPORT_SYSTEM_PROMPT,
        )
    )
    await AgentRunner(agent, bus).start()
    await Approver(bus, bus, auto_approve_decision_source("demo-operator", _log)).start()

    completed = asyncio.Event()

    async def on_completed(_event: object) -> None:
        completed.set()

    await bus.subscribe(EventTopic.RUN_COMPLETED, on_completed)
    listener = asyncio.create_task(bus.run())
    try:
        await asyncio.sleep(_SETTLE_SECONDS)
        _log(f"\n[USER] {SUPPORT_REQUEST}\n")
        started = await agent.run(SUPPORT_REQUEST)
        await asyncio.wait_for(completed.wait(), timeout=_TIMEOUT_SECONDS)
    finally:
        listener.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await listener

    final = await store.load(started.run_id)
    _log(f"\n[AGENT] {_final_answer(final)}")
    status = final.status if final is not None else "unknown"
    _log(f"\n[RESULT] status={status} audit_events={len(audit.all())}")
    await publisher.aclose()
    await subscriber.aclose()
    await store_connection.aclose()


if __name__ == "__main__":
    asyncio.run(main())
