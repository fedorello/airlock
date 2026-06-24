"""An interactive terminal approver. I/O entry point — not unit-tested; the
testable path is `auto_approve_decision_source`."""

import json

from airlock.domain.approval import (
    ApprovalDecision,
    ApprovalRequest,
    ApproveDecision,
    RejectDecision,
)
from airlock.interface.approver.approver import DecisionSource


def cli_decision_source(approver: str) -> DecisionSource:
    async def decide(request: ApprovalRequest) -> ApprovalDecision:
        print(f"\n[APPROVAL NEEDED] {request.tool_call.name}({json.dumps(request.tool_call.args)})")
        answer = input("approve / reject? [a/r]: ").strip().lower()
        if answer == "a":
            return ApproveDecision(approver=approver)
        return RejectDecision(approver=approver, reason="Rejected by the operator")

    return decide
