"""Unit tests for the gate policy and the in-memory / fake adapters."""

from datetime import datetime

import pytest

from airlock import (
    CompletionResult,
    EventTopic,
    FakeLlmProvider,
    InMemoryAuditSink,
    InMemoryEventBus,
    InMemoryRunStore,
    RiskBasedGatePolicy,
    RiskTier,
    RunId,
    RunState,
    RunStatus,
    ScriptExhaustedError,
    SystemClock,
    Tool,
    ToolCall,
    ToolCallId,
    UuidIdGenerator,
)
from airlock.application.ports.gate_policy import GateDecisionInput
from airlock.application.ports.llm_provider import CompletionRequest
from airlock.domain.audit import AuditEvent, AuditEventType


def _empty_state() -> RunState:
    return RunState(
        run_id=RunId("run-1"),
        status=RunStatus.RUNNING,
        messages=[],
        pending_tool_calls=(),
        cursor=0,
        approval=None,
        metadata={},
    )


async def _noop_handler(args: object) -> object:
    return "ok"


def _tool(name: str, risk: RiskTier) -> Tool:
    return Tool(name=name, description="", parameters={}, risk=risk, handler=_noop_handler)


_A_CALL = ToolCall(id=ToolCallId("c1"), name="x", args={})


def test_gate_policy_passes_safe_and_gates_sensitive() -> None:
    policy = RiskBasedGatePolicy()

    safe = GateDecisionInput(_tool("x", RiskTier.SAFE), _A_CALL, _empty_state())
    sensitive = GateDecisionInput(_tool("x", RiskTier.SENSITIVE), _A_CALL, _empty_state())

    assert policy.requires_approval(safe) is False
    assert policy.requires_approval(sensitive) is True


async def test_fake_provider_returns_scripted_then_raises() -> None:
    provider = FakeLlmProvider(
        [
            CompletionResult(text="first", tool_calls=()),
            CompletionResult(text="second", tool_calls=()),
        ]
    )
    request = CompletionRequest(system="s", messages=(), tools=())

    assert (await provider.complete(request)).text == "first"
    assert (await provider.complete(request)).text == "second"
    with pytest.raises(ScriptExhaustedError):
        await provider.complete(request)


async def test_run_store_round_trips_and_misses() -> None:
    store = InMemoryRunStore()
    assert await store.load(RunId("nope")) is None

    state = _empty_state()
    await store.save(state)
    loaded = await store.load(state.run_id)

    assert loaded == state
    assert loaded is not state


async def test_audit_sink_collects_events() -> None:
    sink = InMemoryAuditSink()
    await sink.record(
        AuditEvent(run_id=RunId("run-1"), type=AuditEventType.MODEL_CALLED, at="t", data={})
    )

    assert len(sink.all()) == 1
    assert sink.all()[0].type == AuditEventType.MODEL_CALLED


async def test_event_bus_delivers_and_ignores_empty() -> None:
    bus = InMemoryEventBus()
    received: list[object] = []
    await bus.subscribe(EventTopic.RUN_COMPLETED, received.append)

    await bus.publish(EventTopic.RUN_COMPLETED, _empty_state())

    assert len(received) == 1
    await bus.publish(EventTopic.APPROVAL_REQUESTED, _empty_state())
    assert len(received) == 1


def test_system_clock_returns_aware_datetime() -> None:
    now = SystemClock().now()

    assert isinstance(now, datetime)
    assert now.tzinfo is not None


def test_uuid_ids_are_distinct_and_prefixed() -> None:
    ids = UuidIdGenerator()

    assert ids.run_id() != ids.run_id()
    assert ids.run_id().startswith("run-")
    assert ids.request_id().startswith("req-")
