"""Runs the whole support flow in one process over an in-memory bus: the agent
drafts and acts; the approver auto-approves the sensitive steps; the runner
resumes. Deterministic — no network, no keys."""

import asyncio

from airlock import (
    Agent,
    AgentDependencies,
    AgentRunner,
    Approver,
    FakeLlmProvider,
    InMemoryAuditSink,
    InMemoryEventBus,
    InMemoryRunStore,
    MessageRole,
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


def _log(message: str) -> None:
    print(message)


def _final_answer(state: RunState | None) -> str:
    if state is None or not state.messages:
        return "(no answer)"
    last = state.messages[-1]
    return last.content if last.role == MessageRole.ASSISTANT else "(no answer)"


async def main() -> None:
    _log("=== Airlock support-agent demo (in-memory) ===")
    bus = InMemoryEventBus()
    store = InMemoryRunStore()
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

    _log(f"\n[USER] {SUPPORT_REQUEST}\n")
    started = await agent.run(SUPPORT_REQUEST)
    final = await store.load(started.run_id)

    _log(f"\n[AGENT] {_final_answer(final)}")
    status = final.status if final is not None else "unknown"
    _log(f"\n[RESULT] status={status} audit_events={len(audit.all())}")


if __name__ == "__main__":
    asyncio.run(main())
