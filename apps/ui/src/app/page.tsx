import { getContainer } from "@/core/container";
import type { PendingApproval } from "@/domain/pending-approval";
import { ApprovalsBoard } from "@/features/approvals/components/approvals-board";
import { Explainer } from "@/features/approvals/components/explainer";

export const dynamic = "force-dynamic";

/** Server-render the current queue from the durable store, then hand it to the
 * client board which keeps it live over SSE. */
async function loadInitialApprovals(): Promise<PendingApproval[]> {
  const { reader, logger } = getContainer();
  try {
    return await reader.listPending();
  } catch (error) {
    logger.error("failed to load initial approvals", { error: String(error) });
    return [];
  }
}

export default async function ApprovalsPage() {
  const initialApprovals = await loadInitialApprovals();
  return (
    <div className="flex flex-col gap-6">
      <Explainer />
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">Pending approvals</h1>
        <ApprovalsBoard initialApprovals={initialApprovals} />
      </section>
    </div>
  );
}
