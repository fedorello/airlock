import { useCallback, useEffect, useState } from "react";

import type { ApprovalEvent } from "@/application/ports";
import { type Decision, EventTopic } from "@/domain/contract";
import type { PendingApproval } from "@/domain/pending-approval";

import { fetchApprovals, submitDecision } from "./api";

const STREAM_URL = "/api/stream";

export type ApprovalsStatus = "loading" | "ready" | "error";

export interface ApprovalsState {
  approvals: PendingApproval[];
  status: ApprovalsStatus;
  busyRunId: string | null;
  decide: (approval: PendingApproval, decision: Decision) => Promise<boolean>;
}

/** Starts from the server-rendered queue and keeps it live over SSE. The effect
 * only subscribes; state updates happen in callbacks (the React-recommended
 * pattern). Decisions are optimistic and roll back (by reloading) on failure. */
export function useApprovals(
  initialApprovals: PendingApproval[],
): ApprovalsState {
  const [approvals, setApprovals] =
    useState<PendingApproval[]>(initialApprovals);
  const [status, setStatus] = useState<ApprovalsStatus>("ready");
  const [busyRunId, setBusyRunId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setApprovals(await fetchApprovals());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const handleEvent = useCallback(
    (event: ApprovalEvent) => {
      if (event.topic === EventTopic.ApprovalRequested) {
        void load();
      } else {
        setApprovals((current) =>
          current.filter((approval) => approval.runId !== event.runId),
        );
      }
    },
    [load],
  );

  useEffect(() => {
    const source = new EventSource(STREAM_URL);
    source.onmessage = (message: MessageEvent<string>) => {
      handleEvent(JSON.parse(message.data) as ApprovalEvent);
    };
    return () => {
      source.close();
    };
  }, [handleEvent]);

  const decide = useCallback(
    async (approval: PendingApproval, decision: Decision): Promise<boolean> => {
      setBusyRunId(approval.runId);
      setApprovals((current) =>
        current.filter((item) => item.runId !== approval.runId),
      );
      try {
        await submitDecision(approval.runId, approval.requestId, decision);
        return true;
      } catch {
        await load();
        return false;
      } finally {
        setBusyRunId(null);
      }
    },
    [load],
  );

  return { approvals, status, busyRunId, decide };
}
