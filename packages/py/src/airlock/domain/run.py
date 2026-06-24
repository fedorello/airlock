"""The run aggregate: the single, serializable source of truth for a run."""

from enum import StrEnum

from pydantic import BaseModel

from airlock.domain.approval import ApprovalRequest
from airlock.domain.conversation import Message
from airlock.domain.identifiers import RunId
from airlock.domain.tool import ToolCall


class RunStatus(StrEnum):
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"


class RunState(BaseModel):
    """Fully serializable so a run can pause and resume in another process."""

    run_id: RunId
    status: RunStatus
    messages: list[Message]
    pending_tool_calls: tuple[ToolCall, ...]
    cursor: int
    approval: ApprovalRequest | None
    metadata: dict[str, object]
