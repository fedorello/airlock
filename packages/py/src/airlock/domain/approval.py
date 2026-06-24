"""Approval requests raised by the gate and the decisions humans return."""

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from airlock.domain.identifiers import RequestId, RunId
from airlock.domain.tool import RiskTier, ToolCall


class ApprovalRequest(BaseModel):
    """Raised when a gated tool call is reached and the run suspends."""

    model_config = ConfigDict(frozen=True)

    run_id: RunId
    request_id: RequestId
    tool_call: ToolCall
    risk: RiskTier
    context: dict[str, object]


class DecisionType(StrEnum):
    APPROVE = "approve"
    EDIT = "edit"
    REJECT = "reject"


class ApproveDecision(BaseModel):
    model_config = ConfigDict(frozen=True)

    type: Literal[DecisionType.APPROVE] = DecisionType.APPROVE
    approver: str


class EditDecision(BaseModel):
    model_config = ConfigDict(frozen=True)

    type: Literal[DecisionType.EDIT] = DecisionType.EDIT
    approver: str
    edited_args: dict[str, object]


class RejectDecision(BaseModel):
    model_config = ConfigDict(frozen=True)

    type: Literal[DecisionType.REJECT] = DecisionType.REJECT
    approver: str
    reason: str


ApprovalDecision = Annotated[
    ApproveDecision | EditDecision | RejectDecision,
    Field(discriminator="type"),
]
