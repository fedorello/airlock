"""The agent runner: a driving adapter that resumes runs from the bus."""

from airlock.application.agent import Agent
from airlock.application.ports.event_bus import EventSubscriber
from airlock.domain.events import EventTopic
from airlock.interface.event_schemas import parse_approval_decided


class AgentRunner:
    """Subscribes to `approval.decided`, validates the payload, and calls
    `Agent.resume`. Holds no run state of its own (it lives in the store), so it
    can scale independently of the approvers."""

    def __init__(self, agent: Agent, subscriber: EventSubscriber) -> None:
        self._agent = agent
        self._subscriber = subscriber

    async def start(self) -> None:
        await self._subscriber.subscribe(EventTopic.APPROVAL_DECIDED, self._on_decision)

    async def _on_decision(self, event: object) -> None:
        decided = parse_approval_decided(event)
        await self._agent.resume(decided.run_id, decided.request_id, decided.decision)
