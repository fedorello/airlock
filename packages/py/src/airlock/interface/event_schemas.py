"""Validation at the bus edge: decode raw event payloads into domain types."""

from airlock.domain.approval import ApprovalRequest
from airlock.domain.events import ApprovalDecidedEvent


def parse_approval_decided(raw: object) -> ApprovalDecidedEvent:
    """Validate and decode an `approval.decided` payload."""
    return ApprovalDecidedEvent.model_validate(raw)


def parse_approval_requested(raw: object) -> ApprovalRequest:
    """Validate and decode an `approval.requested` payload."""
    return ApprovalRequest.model_validate(raw)
