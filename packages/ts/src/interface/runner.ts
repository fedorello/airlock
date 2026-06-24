import type { Agent } from "../application/agent";
import type { EventSubscriber } from "../application/ports/event-bus";
import { EventTopic } from "../domain/events";
import { parseApprovalDecided } from "./event-schemas";

export interface AgentRunnerDependencies {
  readonly agent: Agent;
  readonly subscriber: EventSubscriber;
}

/**
 * Driving adapter that resumes runs. It subscribes to `approval.decided`,
 * validates the payload, and calls `Agent.resume`. The runner holds no run
 * state of its own (it lives in the store), so it is stateless between events
 * and can scale independently of the approvers.
 */
export class AgentRunner {
  private readonly agent: Agent;
  private readonly subscriber: EventSubscriber;

  constructor(deps: AgentRunnerDependencies) {
    this.agent = deps.agent;
    this.subscriber = deps.subscriber;
  }

  async start(): Promise<void> {
    await this.subscriber.subscribe(EventTopic.ApprovalDecided, (event) => this.onDecision(event));
  }

  private async onDecision(event: unknown): Promise<void> {
    const decided = parseApprovalDecided(event);
    await this.agent.resume(decided.runId, decided.requestId, decided.decision);
  }
}
