"""End-to-end flow: runner + approver + agent wired over the in-memory bus."""

from collections.abc import Mapping, Sequence
from datetime import UTC, datetime

from airlock import (
    Agent,
    AgentDependencies,
    AgentRunner,
    Approver,
    CompletionResult,
    DecisionSource,
    FakeLlmProvider,
    FixedClock,
    InMemoryAuditSink,
    InMemoryEventBus,
    InMemoryRunStore,
    RiskBasedGatePolicy,
    RiskTier,
    RunStatus,
    SequentialIdGenerator,
    Tool,
    ToolCall,
    ToolCallId,
    auto_approve_decision_source,
)
from airlock.domain.approval import ApprovalDecision, ApprovalRequest, RejectDecision


def _tool(name: str, risk: RiskTier, executed: list[str]) -> Tool:
    async def handler(args: Mapping[str, object]) -> object:
        executed.append(name)
        return "ok"

    return Tool(name=name, description=name, parameters={}, risk=risk, handler=handler)


def _call(call_id: str, name: str) -> ToolCall:
    return ToolCall(id=ToolCallId(call_id), name=name, args={})


def _completion(text: str | None, calls: Sequence[ToolCall]) -> CompletionResult:
    return CompletionResult(text=text, tool_calls=tuple(calls))


async def _wire(
    decide: DecisionSource, script: Sequence[CompletionResult]
) -> tuple[Agent, InMemoryRunStore, list[str]]:
    executed: list[str] = []
    tools = [
        _tool("lookup_order", RiskTier.SAFE, executed),
        _tool("issue_refund", RiskTier.SENSITIVE, executed),
        _tool("send_email", RiskTier.SENSITIVE, executed),
    ]
    bus = InMemoryEventBus()
    store = InMemoryRunStore()
    agent = Agent(
        AgentDependencies(
            provider=FakeLlmProvider(script),
            tools=tools,
            events=bus,
            store=store,
            audit=InMemoryAuditSink(),
            clock=FixedClock(datetime(2026, 1, 1, tzinfo=UTC)),
            ids=SequentialIdGenerator(),
            gate_policy=RiskBasedGatePolicy(),
            system_prompt="You are a support agent.",
        )
    )
    await AgentRunner(agent, bus).start()
    await Approver(bus, bus, decide).start()
    return agent, store, executed


async def test_auto_approval_drives_the_whole_flow() -> None:
    agent, store, executed = await _wire(
        auto_approve_decision_source("demo"),
        [
            _completion(None, [_call("c1", "lookup_order")]),
            _completion(None, [_call("c2", "issue_refund")]),
            _completion(None, [_call("c3", "send_email")]),
            _completion("Refund issued and confirmation emailed.", []),
        ],
    )

    started = await agent.run("Refund order ord-42 and email Alice")
    final = await store.load(started.run_id)

    assert final is not None
    assert final.status == RunStatus.COMPLETED
    assert executed == ["lookup_order", "issue_refund", "send_email"]


async def test_rejection_stops_the_sensitive_action_but_run_completes() -> None:
    async def reject(_request: ApprovalRequest) -> ApprovalDecision:
        return RejectDecision(approver="demo", reason="not allowed")

    agent, store, executed = await _wire(
        reject,
        [
            _completion(None, [_call("c1", "lookup_order")]),
            _completion(None, [_call("c2", "issue_refund")]),
            _completion("I could not issue the refund.", []),
        ],
    )

    started = await agent.run("Refund order ord-42")
    final = await store.load(started.run_id)

    assert final is not None
    assert final.status == RunStatus.COMPLETED
    assert executed == ["lookup_order"]
