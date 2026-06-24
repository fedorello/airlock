"""Tests for event-payload validation at the bus edge."""

import pytest
from pydantic import ValidationError

from airlock import DecisionType, RiskTier, parse_approval_decided, parse_approval_requested


def test_parse_approval_decided_decodes_approve() -> None:
    event = parse_approval_decided(
        {
            "run_id": "run-1",
            "request_id": "req-1",
            "decision": {"type": "approve", "approver": "alice"},
        }
    )

    assert event.run_id == "run-1"
    assert event.decision.type == DecisionType.APPROVE


def test_parse_approval_decided_decodes_edit() -> None:
    event = parse_approval_decided(
        {
            "run_id": "run-1",
            "request_id": "req-1",
            "decision": {"type": "edit", "approver": "alice", "edited_args": {"to": "x"}},
        }
    )

    assert event.decision.type == DecisionType.EDIT


def test_parse_approval_decided_rejects_malformed() -> None:
    with pytest.raises(ValidationError):
        parse_approval_decided({"run_id": "run-1"})


def test_parse_approval_requested_decodes_valid() -> None:
    request = parse_approval_requested(
        {
            "run_id": "run-1",
            "request_id": "req-1",
            "tool_call": {"id": "c1", "name": "send_email", "args": {"to": "x"}},
            "risk": "sensitive",
            "context": {},
        }
    )

    assert request.tool_call.name == "send_email"
    assert request.risk == RiskTier.SENSITIVE


def test_parse_approval_requested_rejects_malformed() -> None:
    with pytest.raises(ValidationError):
        parse_approval_requested({"run_id": "run-1"})
