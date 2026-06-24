"use client";

import { type Decision, DecisionType } from "@/domain/contract";
import type { PendingApproval } from "@/domain/pending-approval";
import { useToast } from "@/features/notifications/toast";

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
  const { notify } = useToast();

  const run = (approval: PendingApproval, decision: Decision): void => {
    void decide(approval, decision).then((ok) => {
      if (!ok) {
        notify("Could not submit the decision. It was restored.", "error");
      }
    });
  };

  const onApprove = (approval: PendingApproval): void => {
    run(approval, { type: DecisionType.Approve, approver: APPROVER });
  };
  const onApproveWithEdits = (
    approval: PendingApproval,
    editedArgs: Record<string, unknown>,
  ): void => {
    run(approval, { type: DecisionType.Edit, approver: APPROVER, editedArgs });
  };
  const onReject = (approval: PendingApproval, reason: string): void => {
    run(approval, { type: DecisionType.Reject, approver: APPROVER, reason });
  };

  return (
    <ApprovalsView
      approvals={approvals}
      status={status}
      busyRunId={busyRunId}
      onApprove={onApprove}
      onApproveWithEdits={onApproveWithEdits}
      onReject={onReject}
    />
  );
}
