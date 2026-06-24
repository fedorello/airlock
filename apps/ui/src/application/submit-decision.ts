import type { Logger } from "@/core/logger";
import type { ApprovalDecidedEvent, Decision } from "@/domain/contract";

import type { DecisionPublisher } from "./ports";

/** Publishes a human's decision back onto the bus. Logs the decision type and the
 * approver (never the arguments — they may contain PII) so the action is traceable. */
export class SubmitDecision {
  constructor(
    private readonly publisher: DecisionPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(
    runId: string,
    requestId: string,
    decision: Decision,
  ): Promise<void> {
    this.logger.info("submitting decision", {
      runId,
      requestId,
      decision: decision.type,
      approver: decision.approver,
    });
    const event: ApprovalDecidedEvent = { runId, requestId, decision };
    await this.publisher.publish(event);
  }
}
