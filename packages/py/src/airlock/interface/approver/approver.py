"""The approver: surfaces approval requests and publishes the decision back."""

from collections.abc import Awaitable, Callable

from airlock.application.ports.event_bus import EventPublisher, EventSubscriber
from airlock.domain.approval import ApprovalDecision, ApprovalRequest
from airlock.domain.events import ApprovalDecidedEvent, EventTopic
from airlock.interface.event_schemas import parse_approval_requested

DecisionSource = Callable[[ApprovalRequest], Awaitable[ApprovalDecision]]
"""Decides what to do with a pending approval request (human, policy, or test)."""


class Approver:
    """Subscribes to `approval.requested`, asks its `DecisionSource`, and
    publishes `approval.decided`. The decision logic is injected, so the same
    approver serves a CLI, a web UI, or a test."""

    def __init__(
        self, publisher: EventPublisher, subscriber: EventSubscriber, decide: DecisionSource
    ) -> None:
        self._publisher = publisher
        self._subscriber = subscriber
        self._decide = decide

    async def start(self) -> None:
        await self._subscriber.subscribe(EventTopic.APPROVAL_REQUESTED, self._on_request)

    async def _on_request(self, event: object) -> None:
        request = parse_approval_requested(event)
        decision = await self._decide(request)
        await self._publisher.publish(
            EventTopic.APPROVAL_DECIDED,
            ApprovalDecidedEvent(
                run_id=request.run_id, request_id=request.request_id, decision=decision
            ),
        )
