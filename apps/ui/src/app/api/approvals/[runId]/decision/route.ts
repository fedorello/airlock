import { submitDecisionResponse } from "@/application/handlers";
import { getContainer } from "@/core/container";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  return submitDecisionResponse(getContainer().submitDecision, runId, body);
}
