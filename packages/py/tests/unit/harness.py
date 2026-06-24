"""Test helpers: an Agent wired with in-memory fakes, and small builders."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime

from airlock import (
    Agent,
    AgentDependencies,
    CompletionResult,
    EventTopic,
    FakeLlmProvider,
    FixedClock,
    InMemoryAuditSink,
    InMemoryEventBus,
    InMemoryRunStore,
    RiskBasedGatePolicy,
    RiskTier,
    RunState,
    SequentialIdGenerator,
    Tool,
    ToolCall,
    ToolCallId,
)
from airlock.domain.approval import ApprovalRequest

FIXED_INSTANT = datetime(2026, 1, 1, tzinfo=UTC)
FIXED_AT = FIXED_INSTANT.isoformat()


@dataclass(frozen=True)
class ToolSpec:
    name: str
    risk: RiskTier
    result: object = "ok"


@dataclass
class Harness:
    agent: Agent
    store: InMemoryRunStore
    audit: InMemoryAuditSink
    tool_calls: list[dict[str, object]]
    approval_requests: list[object] = field(default_factory=list)
    completed_runs: list[object] = field(default_factory=list)


async def build_harness(
    tools: Sequence[ToolSpec],
    script: Sequence[CompletionResult],
    store: InMemoryRunStore | None = None,
) -> Harness:
    tool_calls: list[dict[str, object]] = []
    events = InMemoryEventBus()
    run_store = store if store is not None else InMemoryRunStore()
    audit = InMemoryAuditSink()
    agent = Agent(
        AgentDependencies(
            provider=FakeLlmProvider(script),
            tools=[_make_tool(spec, tool_calls) for spec in tools],
            events=events,
            store=run_store,
            audit=audit,
            clock=FixedClock(FIXED_INSTANT),
            ids=SequentialIdGenerator(),
            gate_policy=RiskBasedGatePolicy(),
            system_prompt="You are a test agent.",
        )
    )
    harness = Harness(agent=agent, store=run_store, audit=audit, tool_calls=tool_calls)
    await events.subscribe(EventTopic.APPROVAL_REQUESTED, harness.approval_requests.append)
    await events.subscribe(EventTopic.RUN_COMPLETED, harness.completed_runs.append)
    return harness


def _make_tool(spec: ToolSpec, sink: list[dict[str, object]]) -> Tool:
    async def handler(args: Mapping[str, object]) -> object:
        sink.append({"name": spec.name, "args": dict(args)})
        return spec.result

    return Tool(
        name=spec.name,
        description=f"Tool {spec.name}",
        parameters={"type": "object"},
        risk=spec.risk,
        handler=handler,
    )


def tool_call(call_id: str, name: str, args: dict[str, object]) -> ToolCall:
    return ToolCall(id=ToolCallId(call_id), name=name, args=args)


def completion(text: str | None, calls: Sequence[ToolCall]) -> CompletionResult:
    return CompletionResult(text=text, tool_calls=tuple(calls))


def require_approval(state: RunState) -> ApprovalRequest:
    if state.approval is None:
        raise AssertionError("expected the run to be awaiting approval")
    return state.approval
