"""Integration tests for the Redis adapters against a real Redis.

Skipped automatically when no Redis is reachable; run with `make py-test-integration`
(or directly via the integration pytest config) when Redis is up."""

import asyncio
import contextlib
import os

import pytest
import redis
from redis.asyncio import Redis

from airlock import (
    EventTopic,
    RedisEventBus,
    RedisRunStore,
    RunCompletedEvent,
    RunId,
    RunState,
    RunStatus,
)

REDIS_URL = os.environ.get("AIRLOCK_REDIS_URL", "redis://127.0.0.1:6379")
_SETTLE_SECONDS = 0.1
_TIMEOUT_SECONDS = 5.0


def _redis_reachable() -> bool:
    try:
        client = redis.Redis.from_url(REDIS_URL)
        client.ping()
        client.close()
    except redis.RedisError:
        return False
    return True


pytestmark = pytest.mark.skipif(not _redis_reachable(), reason="Redis is not reachable")


def _async_client() -> Redis:
    return Redis.from_url(REDIS_URL, decode_responses=True)


def _empty_state(run_id: str) -> RunState:
    return RunState(
        run_id=RunId(run_id),
        status=RunStatus.RUNNING,
        messages=[],
        pending_tool_calls=(),
        cursor=0,
        approval=None,
        metadata={},
    )


async def test_run_store_round_trip_and_miss() -> None:
    client = _async_client()
    store = RedisRunStore(client)
    try:
        assert await store.load(RunId("itest-missing")) is None
        state = _empty_state("itest-store")
        await store.save(state)
        assert await store.load(state.run_id) == state
    finally:
        await client.delete("airlock:run:itest-store")
        await client.aclose()


async def test_event_bus_delivers_published_events() -> None:
    publisher = _async_client()
    subscriber = _async_client()
    bus = RedisEventBus(publisher, subscriber)
    received = asyncio.Event()
    payloads: list[object] = []

    async def handler(event: object) -> None:
        payloads.append(event)
        received.set()

    await bus.subscribe(EventTopic.RUN_COMPLETED, handler)
    listener = asyncio.create_task(bus.run())
    try:
        await asyncio.sleep(_SETTLE_SECONDS)
        await bus.publish(EventTopic.RUN_COMPLETED, RunCompletedEvent(run_id=RunId("itest-evt")))
        await asyncio.wait_for(received.wait(), timeout=_TIMEOUT_SECONDS)
    finally:
        listener.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await listener
        await publisher.aclose()
        await subscriber.aclose()

    assert isinstance(payloads[0], dict)
    assert payloads[0]["run_id"] == "itest-evt"
