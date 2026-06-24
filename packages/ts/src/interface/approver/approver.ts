import type { EventPublisher, EventSubscriber } from "../../application/ports/event-bus";
import type { ApprovalDecision, ApprovalRequest } from "../../domain/approval";
import { EventTopic } from "../../domain/events";
import { parseApprovalRequested } from "../event-schemas";

/** Decides what to do with a pending approval request. */
export type DecisionSource = (request: ApprovalRequest) => Promise<ApprovalDecision>;

export interface ApproverDependencies {
  readonly publisher: EventPublisher;
  readonly subscriber: EventSubscriber;
  readonly decide: DecisionSource;
}

/**
 * Driving adapter that surfaces approval requests to a human (or a policy) and
 * publishes the decision back. It subscribes to `approval.requested`, asks its
 * `DecisionSource`, and publishes `approval.decided`. The decision logic is
 * injected, so the same approver serves a CLI, a web UI, or a test.
 */
export class Approver {
  private readonly publisher: EventPublisher;
  private readonly subscriber: EventSubscriber;
  private readonly decide: DecisionSource;

  constructor(deps: ApproverDependencies) {
    this.publisher = deps.publisher;
    this.subscriber = deps.subscriber;
    this.decide = deps.decide;
  }

  async start(): Promise<void> {
    await this.subscriber.subscribe(EventTopic.ApprovalRequested, (event) => this.onRequest(event));
  }

  private async onRequest(event: unknown): Promise<void> {
    const request = parseApprovalRequested(event);
    const decision = await this.decide(request);
    await this.publisher.publish(EventTopic.ApprovalDecided, {
      runId: request.runId,
      requestId: request.requestId,
      decision,
    });
  }
}
