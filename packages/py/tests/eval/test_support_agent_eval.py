"""Agent eval suite (CODING_PRINCIPLES §10.6).

Loads the shared golden dataset and asserts the wired agent reproduces it: the
gate fires on every sensitive tool call and never on a safe one, and the tool
execution sequence is correct. The same dataset drives the TypeScript runner."""

from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path

import pytest
from pydantic import BaseModel

from airlock import (
    Agent,
    AgentDependencies,
    AgentRunner,
    Approver,
    AuditEventType,
    CompletionResult,
    FakeLlmProvider,
    FixedClock,
    InMemoryAuditSink,
    InMemoryEventBus,
    InMemoryRunStore,
    RiskBasedGatePolicy,
    RiskTier,
    RunState,
    RunStatus,
    SequentialIdGenerator,
    Tool,
    ToolCall,
    ToolCallId,
    auto_approve_decision_source,
)

_GOLDEN_PATH = Path(__file__).resolve().parents[4] / "evals" / "support-agent" / "golden-cases.json"
_RISK = {"safe": RiskTier.SAFE, "sensitive": RiskTier.SENSITIVE}


class _Turn(BaseModel):
    calls: list[str] | None = None
    final: str | None = None


class _Case(BaseModel):
    name: str
    request: str
    turns: list[_Turn]
    expected_executed: list[str]
    expected_gated: list[str]


class _Dataset(BaseModel):
    version: int
    tools: dict[str, str]
    cases: list[_Case]


GOLDEN = _Dataset.model_validate_json(_GOLDEN_PATH.read_text(encoding="utf-8"))


def _make_tools(risk_map: dict[str, str], executed: list[str]) -> list[Tool]:
    def make(name: str, risk: RiskTier) -> Tool:
        async def handler(_args: Mapping[str, object]) -> object:
            executed.append(name)
            return "ok"

        return Tool(name=name, description=name, parameters={}, risk=risk, handler=handler)

    return [make(name, _RISK[risk]) for name, risk in risk_map.items()]


def _build_script(case: _Case) -> list[CompletionResult]:
    script: list[CompletionResult] = []
    counter = 0
    for turn in case.turns:
        if turn.final is not None:
            script.append(CompletionResult(text=turn.final, tool_calls=()))
            continue
        calls: list[ToolCall] = []
        for name in turn.calls or []:
            counter += 1
            calls.append(ToolCall(id=ToolCallId(f"c{counter}"), name=name, args={}))
        script.append(CompletionResult(text=None, tool_calls=tuple(calls)))
    return script


async def _run_case(case: _Case) -> tuple[RunState | None, list[str], list[str]]:
    executed: list[str] = []
    bus = InMemoryEventBus()
    store = InMemoryRunStore()
    audit = InMemoryAuditSink()
    agent = Agent(
        AgentDependencies(
            provider=FakeLlmProvider(_build_script(case)),
            tools=_make_tools(GOLDEN.tools, executed),
            events=bus,
            store=store,
            audit=audit,
            clock=FixedClock(datetime(2026, 1, 1, tzinfo=UTC)),
            ids=SequentialIdGenerator(),
            gate_policy=RiskBasedGatePolicy(),
            system_prompt="eval",
        )
    )
    await AgentRunner(agent, bus).start()
    await Approver(bus, bus, auto_approve_decision_source("eval")).start()

    started = await agent.run(case.request)
    final = await store.load(started.run_id)
    gated = [
        str(event.data["tool"])
        for event in audit.all()
        if event.type == AuditEventType.APPROVAL_REQUESTED
    ]
    return final, executed, gated


@pytest.mark.parametrize("case", GOLDEN.cases, ids=[case.name for case in GOLDEN.cases])
async def test_support_agent_golden_case(case: _Case) -> None:
    final, executed, gated = await _run_case(case)

    assert final is not None
    assert final.status == RunStatus.COMPLETED
    assert executed == case.expected_executed
    assert gated == case.expected_gated


def test_dataset_is_large_enough() -> None:
    assert len(GOLDEN.cases) >= 30
