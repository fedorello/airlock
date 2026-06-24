"use client";

import { DecisionType } from "@/domain/contract";
import type { PendingApproval } from "@/domain/pending-approval";

import { useApprovals } from "../use-approvals";
import { ApprovalsView } from "./approvals-view";

// The approver identity. A real login/identity is out of scope for v1; an
// editable name is added in a later phase.
const APPROVER = "operator";

export function ApprovalsBoard({
  initialApprovals,
}: {
  initialApprovals: PendingApproval[];
}) {
  const { approvals, status, busyRunId, decide } =
    useApprovals(initialApprovals);

  const onApprove = (approval: PendingApproval): void => {
    void decide(approval, { type: DecisionType.Approve, approver: APPROVER });
  };
  const onReject = (approval: PendingApproval): void => {
    void decide(approval, {
      type: DecisionType.Reject,
      approver: APPROVER,
      reason: "Rejected from the dashboard",
    });
  };

  return (
    <ApprovalsView
      approvals={approvals}
      status={status}
      busyRunId={busyRunId}
      onApprove={onApprove}
      onReject={onReject}
    />
  );
}
