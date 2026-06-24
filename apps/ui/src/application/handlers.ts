import { z } from "zod";

import { decisionSchema } from "@/domain/contract";

import type { ApprovalReader } from "./ports";
import type { SubmitDecision } from "./submit-decision";

/** Pure HTTP response builders for the Route Handlers, so the routes stay thin
 * and the logic is testable with in-memory fakes. */

export const decisionRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: decisionSchema,
});

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

export async function listApprovalsResponse(
  reader: ApprovalReader,
): Promise<Response> {
  const approvals = await reader.listPending();
  return Response.json({ approvals });
}

export async function getRunResponse(
  reader: ApprovalReader,
  runId: string,
): Promise<Response> {
  const run = await reader.getRun(runId);
  if (run === null) {
    return Response.json(
      { error: "run_not_found" },
      { status: HTTP_NOT_FOUND },
    );
  }
  return Response.json({ run });
}

export async function submitDecisionResponse(
  service: SubmitDecision,
  runId: string,
  body: unknown,
): Promise<Response> {
  const parsed = decisionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: HTTP_BAD_REQUEST },
    );
  }
  await service.execute(runId, parsed.data.requestId, parsed.data.decision);
  return Response.json({ ok: true });
}
