import { listApprovalsResponse } from "@/application/handlers";
import { getContainer } from "@/core/container";

// Redis access needs the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return listApprovalsResponse(getContainer().reader);
}
