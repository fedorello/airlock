"""A decision source that approves every request — for demos and tests."""

import json
from collections.abc import Callable

from airlock.domain.approval import ApprovalDecision, ApprovalRequest, ApproveDecision
from airlock.interface.approver.approver import DecisionSource


def auto_approve_decision_source(
    approver: str, notify: Callable[[str], None] | None = None
) -> DecisionSource:
    """Approve everything. The optional `notify` callback observes each approval."""

    async def decide(request: ApprovalRequest) -> ApprovalDecision:
        if notify is not None:
            notify(
                f"[GATE] approving {request.tool_call.name}({json.dumps(request.tool_call.args)})"
            )
        return ApproveDecision(approver=approver)

    return decide
