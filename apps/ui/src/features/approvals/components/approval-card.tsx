"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";

import type { PendingApproval } from "@/domain/pending-approval";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Textarea } from "@/shared/ui/textarea";

import { humanizeAction } from "../humanize";
import { ArgsView } from "./args-view";
import { RiskBadge } from "./risk-badge";
import { Timeline } from "./timeline";

type Mode = "idle" | "editing" | "rejecting";

interface ApprovalCardProps {
  approval: PendingApproval;
  onApprove: () => void;
  onApproveWithEdits: (editedArgs: Record<string, unknown>) => void;
  onReject: (reason: string) => void;
  isBusy?: boolean;
}

function parseArgs(text: string): Record<string, unknown> | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "Arguments must be valid JSON.";
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return "Arguments must be a JSON object.";
  }
  return parsed as Record<string, unknown>;
}

export function ApprovalCard({
  approval,
  onApprove,
  onApproveWithEdits,
  onReject,
  isBusy = false,
}: ApprovalCardProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState(() =>
    JSON.stringify(approval.args, null, 2),
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitEdit = (): void => {
    const result = parseArgs(draft);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    onApproveWithEdits(result);
  };

  const { title, detail } = humanizeAction(approval.toolName, approval.args);

  return (
    <Card className="animate-in flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-muted-foreground text-xs">An AI agent wants to:</p>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base leading-tight font-semibold">{title}</h2>
          <RiskBadge risk={approval.risk} />
        </div>
        {detail !== "" && (
          <p className="text-foreground text-sm font-medium">{detail}</p>
        )}
        {approval.request !== "" && (
          <p className="text-muted-foreground text-sm">
            From the request: &ldquo;{approval.request}&rdquo;
          </p>
        )}
      </div>

      {mode === "editing" ? (
        <div className="flex flex-col gap-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`args-${approval.requestId}`}
          >
            Edit arguments (JSON)
          </label>
          <Textarea
            id={`args-${approval.requestId}`}
            rows={6}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
          />
          {error !== null && <p className="text-rejected text-xs">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">
            Exact call &middot; tool{" "}
            <code className="font-mono">{approval.toolName}</code>
          </p>
          <ArgsView args={approval.args} />
        </div>
      )}

      <Timeline messages={approval.timeline} />

      {mode === "rejecting" && (
        <div className="flex flex-col gap-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`reason-${approval.requestId}`}
          >
            Reason for rejecting
          </label>
          <Textarea
            id={`reason-${approval.requestId}`}
            rows={2}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
            placeholder="Why is this denied?"
          />
        </div>
      )}

      <div className="border-border flex justify-end gap-2 border-t pt-3">
        {mode === "idle" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("rejecting")}
              disabled={isBusy}
            >
              <X className="size-4" aria-hidden />
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode("editing")}
              disabled={isBusy}
            >
              <Pencil className="size-4" aria-hidden />
              Edit
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
          </>
        )}
        {mode === "editing" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode("idle");
                setError(null);
              }}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              variant="approve"
              size="sm"
              onClick={submitEdit}
              disabled={isBusy}
            >
              Approve with changes
            </Button>
          </>
        )}
        {mode === "rejecting" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("idle")}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              variant="reject"
              size="sm"
              onClick={() => onReject(reason)}
              disabled={isBusy || reason.trim() === ""}
            >
              Confirm reject
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
