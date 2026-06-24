import { Check, X } from "lucide-react";

import type { PendingApproval } from "@/domain/pending-approval";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { ArgsView } from "./args-view";
import { RiskBadge } from "./risk-badge";

interface ApprovalCardProps {
  approval: PendingApproval;
  onApprove: () => void;
  onReject: () => void;
  isBusy?: boolean;
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  isBusy = false,
}: ApprovalCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <code className="font-mono text-sm font-semibold">
          {approval.toolName}
        </code>
        <RiskBadge risk={approval.risk} />
      </div>
      {approval.request !== "" && (
        <p className="text-muted-foreground text-sm">{approval.request}</p>
      )}
      <ArgsView args={approval.args} />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={isBusy}
        >
          <X className="size-4" aria-hidden />
          Reject
        </Button>
        <Button
          variant="approve"
          size="sm"
          onClick={onApprove}
          disabled={isBusy}
        >
          <Check className="size-4" aria-hidden />
          Approve
        </Button>
      </div>
    </Card>
  );
}
