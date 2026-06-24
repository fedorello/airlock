"""The agent loop with the approval gate built in."""

import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from airlock.application.ports.audit_sink import AuditSink
from airlock.application.ports.clock import Clock
from airlock.application.ports.event_bus import EventPublisher
from airlock.application.ports.gate_policy import GateDecisionInput, GatePolicy
from airlock.application.ports.id_generator import IdGenerator
from airlock.application.ports.llm_provider import CompletionRequest, CompletionResult, LlmProvider
from airlock.application.ports.run_store import RunStore
from airlock.domain.approval import (
    ApprovalDecision,
    ApprovalRequest,
    ApproveDecision,
    EditDecision,
    RejectDecision,
)
from airlock.domain.audit import AuditEvent, AuditEventType
from airlock.domain.conversation import AssistantMessage, ToolMessage, UserMessage
from airlock.domain.errors import RunNotFoundError, UnknownToolError
from airlock.domain.events import EventTopic, RunCompletedEvent
from airlock.domain.identifiers import RequestId, RunId, ToolCallId
from airlock.domain.run import RunState, RunStatus
from airlock.domain.tool import RiskTier, Tool, ToolCall, ToolDefinition

_REJECTION_NOTICE_PREFIX = "Rejected by a human:"


@dataclass(frozen=True)
class AgentDependencies:
    """Everything the Agent needs, injected as one object."""

    provider: LlmProvider
    tools: Sequence[Tool]
    events: EventPublisher
    store: RunStore
    audit: AuditSink
    clock: Clock
    ids: IdGenerator
    gate_policy: GatePolicy
    system_prompt: str


class Agent:
    """Runs a tool-use loop with the gate. Safe tools run automatically; a
    sensitive tool call suspends for a human decision and resumes when one
    arrives. See docs/design/contracts.md for the invariants."""

    def __init__(self, deps: AgentDependencies) -> None:
        self._provider = deps.provider
        self._events = deps.events
        self._store = deps.store
        self._audit = deps.audit
        self._clock = deps.clock
        self._ids = deps.ids
        self._gate_policy = deps.gate_policy
        self._system_prompt = deps.system_prompt
        self._tools: dict[str, Tool] = {tool.name: tool for tool in deps.tools}
        self._tool_definitions: tuple[ToolDefinition, ...] = tuple(
            tool.definition() for tool in deps.tools
        )

    async def run(self, user_input: str) -> RunState:
        """Start a run and advance until it completes or suspends for approval."""
        return await self._advance(self._create_run(user_input))

    async def resume(
        self, run_id: RunId, request_id: RequestId, decision: ApprovalDecision
    ) -> RunState:
        """Apply a human decision and continue. Idempotent, keyed by request_id."""
        state = await self._store.load(run_id)
        if state is None:
            raise RunNotFoundError(run_id)
        request = state.approval
        if not self._is_awaiting(state, request_id) or request is None:
            return state
        await self._apply_decision(state, request, decision)
        state.approval = None
        state.status = RunStatus.RUNNING
        state.cursor += 1
        return await self._advance(state)

    def _create_run(self, user_input: str) -> RunState:
        return RunState(
            run_id=self._ids.run_id(),
            status=RunStatus.RUNNING,
            messages=[UserMessage(content=user_input)],
            pending_tool_calls=(),
            cursor=0,
            approval=None,
            metadata={},
        )

    async def _advance(self, state: RunState) -> RunState:
        while True:
            if await self._process_pending(state):
                return state
            completion = await self._call_model(state)
            if not completion.tool_calls:
                return await self._complete_run(state, completion.text)
            self._start_turn(state, completion)

    async def _process_pending(self, state: RunState) -> bool:
        while state.cursor < len(state.pending_tool_calls):
            call = state.pending_tool_calls[state.cursor]
            tool = self._require_tool(call.name)
            if self._gate_policy.requires_approval(GateDecisionInput(tool, call, state)):
                await self._suspend_for_approval(state, call, tool.risk)
                return True
            await self._run_tool_call(state, tool, call.args, call.id)
            state.cursor += 1
        return False

    async def _suspend_for_approval(
        self, state: RunState, tool_call: ToolCall, risk: RiskTier
    ) -> None:
        request = ApprovalRequest(
            run_id=state.run_id,
            request_id=self._ids.request_id(),
            tool_call=tool_call,
            risk=risk,
            context=state.metadata,
        )
        state.approval = request
        state.status = RunStatus.AWAITING_APPROVAL
        await self._store.save(state)
        await self._record_audit(
            state.run_id,
            AuditEventType.APPROVAL_REQUESTED,
            {"request_id": request.request_id, "tool": tool_call.name},
        )
        await self._events.publish(EventTopic.APPROVAL_REQUESTED, request)

    async def _apply_decision(
        self, state: RunState, request: ApprovalRequest, decision: ApprovalDecision
    ) -> None:
        await self._record_audit(
            state.run_id,
            AuditEventType.APPROVAL_DECIDED,
            {
                "request_id": request.request_id,
                "decision": decision.type,
                "approver": decision.approver,
            },
        )
        match decision:
            case RejectDecision():
                self._append_rejection(state, request.tool_call.id, decision.reason)
                return
            case EditDecision():
                args: Mapping[str, object] = decision.edited_args
            case ApproveDecision():
                args = request.tool_call.args
        tool = self._require_tool(request.tool_call.name)
        await self._run_tool_call(state, tool, args, request.tool_call.id)

    async def _run_tool_call(
        self, state: RunState, tool: Tool, args: Mapping[str, object], tool_call_id: ToolCallId
    ) -> None:
        result = await tool.handler(args)
        await self._record_audit(state.run_id, AuditEventType.TOOL_EXECUTED, {"tool": tool.name})
        state.messages.append(ToolMessage(tool_call_id=tool_call_id, content=_serialize(result)))

    async def _call_model(self, state: RunState) -> CompletionResult:
        completion = await self._provider.complete(
            CompletionRequest(
                system=self._system_prompt,
                messages=state.messages,
                tools=self._tool_definitions,
            )
        )
        await self._record_audit(state.run_id, AuditEventType.MODEL_CALLED, {})
        return completion

    def _start_turn(self, state: RunState, completion: CompletionResult) -> None:
        state.messages.append(
            AssistantMessage(content=completion.text or "", tool_calls=completion.tool_calls)
        )
        state.pending_tool_calls = completion.tool_calls
        state.cursor = 0

    async def _complete_run(self, state: RunState, text: str | None) -> RunState:
        state.messages.append(AssistantMessage(content=text or "", tool_calls=()))
        state.status = RunStatus.COMPLETED
        await self._store.save(state)
        await self._record_audit(state.run_id, AuditEventType.RUN_COMPLETED, {})
        await self._events.publish(EventTopic.RUN_COMPLETED, RunCompletedEvent(run_id=state.run_id))
        return state

    def _append_rejection(self, state: RunState, tool_call_id: ToolCallId, reason: str) -> None:
        state.messages.append(
            ToolMessage(tool_call_id=tool_call_id, content=f"{_REJECTION_NOTICE_PREFIX} {reason}")
        )

    def _is_awaiting(self, state: RunState, request_id: RequestId) -> bool:
        return (
            state.status == RunStatus.AWAITING_APPROVAL
            and state.approval is not None
            and state.approval.request_id == request_id
        )

    def _require_tool(self, name: str) -> Tool:
        tool = self._tools.get(name)
        if tool is None:
            raise UnknownToolError(name)
        return tool

    async def _record_audit(
        self, run_id: RunId, event_type: AuditEventType, data: Mapping[str, object]
    ) -> None:
        event = AuditEvent(
            run_id=run_id, type=event_type, at=self._clock.now().isoformat(), data=dict(data)
        )
        await self._audit.record(event)


def _serialize(result: object) -> str:
    if isinstance(result, str):
        return result
    return json.dumps(result)
