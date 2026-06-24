"""Event-bus topics and the payloads that travel on them."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict

from airlock.domain.approval import ApprovalDecision
from airlock.domain.identifiers import RequestId, RunId


class EventTopic(StrEnum):
    APPROVAL_REQUESTED = "approval.requested"
    APPROVAL_DECIDED = "approval.decided"
    RUN_COMPLETED = "run.completed"
    RUN_FAILED = "run.failed"


class ApprovalDecidedEvent(BaseModel):
    model_config = ConfigDict(frozen=True)

    run_id: RunId
    request_id: RequestId
    decision: ApprovalDecision


class RunCompletedEvent(BaseModel):
    model_config = ConfigDict(frozen=True)

    run_id: RunId
