import type { Redis } from "ioredis";

import type { Logger } from "@/core/logger";
import type {
  ApprovalEvent,
  ApprovalEventHandler,
  ApprovalEventSource,
  Unsubscribe,
} from "@/application/ports";
import {
  EventTopic,
  approvalRequestSchema,
  runIdEventSchema,
} from "@/domain/contract";

const TOPICS = [
  EventTopic.ApprovalRequested,
  EventTopic.RunCompleted,
  EventTopic.RunFailed,
];

/** Subscribes to the Airlock event channels and forwards validated events. Uses a
 * dedicated subscriber connection (it cannot also run commands). */
export class RedisEventSource implements ApprovalEventSource {
  private subscribed = false;

  constructor(
    private readonly subscriber: Redis,
    private readonly logger: Logger,
  ) {}

  async subscribe(handler: ApprovalEventHandler): Promise<Unsubscribe> {
    const onMessage = (channel: string, message: string): void => {
      const event = this.parse(channel, message);
      if (event !== null) {
        handler(event);
      }
    };
    this.subscriber.on("message", onMessage);
    await this.ensureSubscribed();
    // Only remove this client's listener; the shared connection stays subscribed
    // so other clients keep receiving events.
    return () => {
      this.subscriber.off("message", onMessage);
      return Promise.resolve();
    };
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) {
      return;
    }
    await this.subscriber.subscribe(...TOPICS);
    this.subscribed = true;
  }

  private parse(channel: string, message: string): ApprovalEvent | null {
    const json = this.parseJson(channel, message);
    if (json === null) {
      return null;
    }
    if (channel === EventTopic.ApprovalRequested) {
      const result = approvalRequestSchema.safeParse(json);
      return result.success
        ? { topic: EventTopic.ApprovalRequested, request: result.data }
        : null;
    }
    const result = runIdEventSchema.safeParse(json);
    if (!result.success) {
      return null;
    }
    const topic =
      channel === EventTopic.RunFailed
        ? EventTopic.RunFailed
        : EventTopic.RunCompleted;
    return { topic, runId: result.data.runId };
  }

  private parseJson(channel: string, message: string): unknown {
    try {
      return JSON.parse(message);
    } catch {
      this.logger.warn("dropping event with invalid JSON", { channel });
      return null;
    }
  }
}
