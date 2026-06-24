import type { Decision } from "@/domain/contract";
import type { PendingApproval } from "@/domain/pending-approval";

/** Browser-side client for the approval API. */

export async function fetchApprovals(): Promise<PendingApproval[]> {
  const response = await fetch("/api/approvals");
  if (!response.ok) {
    throw new Error(
      `Failed to load approvals (HTTP ${String(response.status)})`,
    );
  }
  const body = (await response.json()) as { approvals: PendingApproval[] };
  return body.approvals;
}

export async function submitDecision(
  runId: string,
  requestId: string,
  decision: Decision,
): Promise<void> {
  const response = await fetch(
    `/api/approvals/${encodeURIComponent(runId)}/decision`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, decision }),
    },
  );
  if (!response.ok) {
    throw new Error(`Decision failed (HTTP ${String(response.status)})`);
  }
}
