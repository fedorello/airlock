import type { PendingApproval } from "@/domain/pending-approval";

import type { ApprovalsStatus } from "../use-approvals";
import { ApprovalCard } from "./approval-card";
import { EmptyState } from "./empty-state";

interface ApprovalsViewProps {
  approvals: PendingApproval[];
  status: ApprovalsStatus;
  busyRunId: string | null;
  onApprove: (approval: PendingApproval) => void;
  onReject: (approval: PendingApproval) => void;
}

/** Presentational queue: pure props in, no data fetching, so it is easy to test. */
export function ApprovalsView({
  approvals,
  status,
  busyRunId,
  onApprove,
  onReject,
}: ApprovalsViewProps) {
  if (status === "loading") {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }
  if (status === "error") {
    return (
      <p className="text-rejected text-sm">
        Could not load approvals. Is the agent service running?
      </p>
    );
  }
  if (approvals.length === 0) {
    return <EmptyState />;
  }
  return (
    <div className="flex flex-col gap-3">
      {approvals.map((approval) => (
        <ApprovalCard
          key={`${approval.runId}:${approval.requestId}`}
          approval={approval}
          isBusy={busyRunId === approval.runId}
          onApprove={() => {
            onApprove(approval);
          }}
          onReject={() => {
            onReject(approval);
          }}
        />
      ))}
    </div>
  );
}
