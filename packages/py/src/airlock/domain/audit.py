"""Audit events: an immutable record of everything a run does."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict

from airlock.domain.identifiers import RunId


class AuditEventType(StrEnum):
    MODEL_CALLED = "model_called"
    TOOL_EXECUTED = "tool_executed"
    APPROVAL_REQUESTED = "approval_requested"
    APPROVAL_DECIDED = "approval_decided"
    RUN_COMPLETED = "run_completed"
    RUN_FAILED = "run_failed"


class AuditEvent(BaseModel):
    model_config = ConfigDict(frozen=True)

    run_id: RunId
    type: AuditEventType
    at: str
    """UTC ISO-8601 timestamp, taken from the Clock port."""
    data: dict[str, object]
