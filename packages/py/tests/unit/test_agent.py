"""Behavior tests for the Agent — the contract invariants."""

import pytest
from tests.unit.harness import (
    FIXED_AT,
    ToolSpec,
    build_harness,
    completion,
    require_approval,
    tool_call,
)

from airlock import (
    ApproveDecision,
    AuditEventType,
    CompletionResult,
    EditDecision,
    RejectDecision,
    RequestId,
    RiskTier,
    RunId,
    RunNotFoundError,
    RunStatus,
    ToolMessage,
    UnknownToolError,
)

SUPPORT_TOOLS = [
    ToolSpec("search_kb", RiskTier.SAFE),
    ToolSpec("send_email", RiskTier.SENSITIVE),
]
APPROVE = ApproveDecision(approver="alice")


def support_script() -> list[CompletionResult]:
    return [
        completion(None, [tool_call("c1", "search_kb", {"query": "refund"})]),
        completion(None, [tool_call("c2", "send_email", {"to": "alice@example.test"})]),
        completion("All set — I've emailed the customer.", []),
    ]


async def test_safe_runs_and_sensitive_suspends() -> None:
    harness = await build_harness(SUPPORT_TOOLS, support_script())

    state = await harness.agent.run("Help the customer")

    assert state.status == RunStatus.AWAITING_APPROVAL
    assert require_approval(state).tool_call.name == "send_email"
    assert [call["name"] for call in harness.tool_calls] == ["search_kb"]
    assert len(harness.approval_requests) == 1


async def test_approve_executes_once_and_completes() -> None:
    harness = await build_harness(SUPPORT_TOOLS, support_script())
    request = require_approval(await harness.agent.run("Help"))

    completed = await harness.agent.resume(request.run_id, request.request_id, APPROVE)

    assert completed.status == RunStatus.COMPLETED
    assert [call["name"] for call in harness.tool_calls] == ["search_kb", "send_email"]
    assert len(harness.completed_runs) == 1


async def test_edit_replaces_arguments() -> None:
    harness = await build_harness(SUPPORT_TOOLS, support_script())
    request = require_approval(await harness.agent.run("Help"))

    await harness.agent.resume(
        request.run_id,
        request.request_id,
        EditDecision(approver="alice", edited_args={"to": "bob@example.test"}),
    )

    sent = next(call for call in harness.tool_calls if call["name"] == "send_email")
    assert sent["args"] == {"to": "bob@example.test"}


async def test_reject_does_not_execute_but_run_completes() -> None:
    harness = await build_harness(SUPPORT_TOOLS, support_script())
    request = require_approval(await harness.agent.run("Help"))

    completed = await harness.agent.resume(
        request.run_id,
        request.request_id,
        RejectDecision(approver="alice", reason="Policy forbids it"),
    )

    assert completed.status == RunStatus.COMPLETED
    assert all(call["name"] != "send_email" for call in harness.tool_calls)
    rejection = [
        message
        for message in completed.messages
        if isinstance(message, ToolMessage) and message.content.startswith("Rejected by a human:")
    ]
    assert rejection


async def test_resume_is_idempotent() -> None:
    harness = await build_harness(SUPPORT_TOOLS, support_script())
    request = require_approval(await harness.agent.run("Help"))
    await harness.agent.resume(request.run_id, request.request_id, APPROVE)

    replay = await harness.agent.resume(request.run_id, request.request_id, APPROVE)

    assert replay.status == RunStatus.COMPLETED
    assert sum(call["name"] == "send_email" for call in harness.tool_calls) == 1


async def test_resume_across_a_fresh_agent_sharing_the_store() -> None:
    first = await build_harness(SUPPORT_TOOLS, support_script()[:2])
    request = require_approval(await first.agent.run("Help"))

    second = await build_harness(SUPPORT_TOOLS, [completion("Emailed.", [])], store=first.store)
    completed = await second.agent.resume(request.run_id, request.request_id, APPROVE)

    assert completed.status == RunStatus.COMPLETED
    assert [call["name"] for call in second.tool_calls] == ["send_email"]


async def test_multiple_tool_calls_pause_and_resume_by_cursor() -> None:
    harness = await build_harness(
        [
            ToolSpec("lookup_order", RiskTier.SAFE),
            ToolSpec("issue_refund", RiskTier.SENSITIVE, result={"refunded": True}),
        ],
        [
            completion(
                None,
                [
                    tool_call("c1", "lookup_order", {"id": "ord-1"}),
                    tool_call("c2", "issue_refund", {"amount": 10}),
                ],
            ),
            completion("Refund issued.", []),
        ],
    )

    suspended = await harness.agent.run("Refund order ord-1")
    assert [call["name"] for call in harness.tool_calls] == ["lookup_order"]
    request = require_approval(suspended)

    completed = await harness.agent.resume(request.run_id, request.request_id, APPROVE)

    assert completed.status == RunStatus.COMPLETED
    assert [call["name"] for call in harness.tool_calls] == ["lookup_order", "issue_refund"]


async def test_unknown_tool_raises() -> None:
    harness = await build_harness([], [completion(None, [tool_call("c1", "ghost", {})])])

    with pytest.raises(UnknownToolError):
        await harness.agent.run("x")


async def test_resume_unknown_run_raises() -> None:
    harness = await build_harness([], [completion("hi", [])])

    with pytest.raises(RunNotFoundError):
        await harness.agent.resume(RunId("missing"), RequestId("req-1"), APPROVE)


async def test_audit_trail_uses_the_injected_clock() -> None:
    harness = await build_harness(SUPPORT_TOOLS, support_script())
    request = require_approval(await harness.agent.run("Help"))
    await harness.agent.resume(request.run_id, request.request_id, APPROVE)

    types = [event.type for event in harness.audit.all()]
    assert AuditEventType.MODEL_CALLED in types
    assert AuditEventType.TOOL_EXECUTED in types
    assert AuditEventType.APPROVAL_REQUESTED in types
    assert AuditEventType.APPROVAL_DECIDED in types
    assert AuditEventType.RUN_COMPLETED in types
    assert harness.audit.all()[0].at == FIXED_AT


async def test_non_string_tool_result_is_serialized() -> None:
    harness = await build_harness(
        [ToolSpec("as_object", RiskTier.SAFE, result={"ok": True})],
        [
            completion(None, [tool_call("c1", "as_object", {})]),
            completion("done", []),
        ],
    )

    state = await harness.agent.run("x")

    tool_messages = [m for m in state.messages if isinstance(m, ToolMessage)]
    assert tool_messages[0].content == '{"ok": true}'
