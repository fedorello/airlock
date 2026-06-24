import { getRunResponse } from "@/application/handlers";
import { getContainer } from "@/core/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId } = await context.params;
  return getRunResponse(getContainer().reader, runId);
}
