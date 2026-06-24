import type {
  EventHandler,
  EventPublisher,
  EventSubscriber,
} from "../../application/ports/event-bus";
import type { EventTopic } from "../../domain/events";

/** The subset of a Redis client the bus uses to publish. */
export interface RedisPublishCommand {
  publish(channel: string, message: string): Promise<number>;
}

/** The subset of a Redis client the bus uses to subscribe. */
export interface RedisSubscribeCommand {
  subscribe(channel: string): Promise<unknown>;
  on(event: "message", listener: (channel: string, message: string) => void): unknown;
}

/**
 * Event bus over Redis Pub/Sub (see ADR-0002). Needs two connections: a Redis
 * connection in subscribe mode cannot issue other commands, so publishing uses a
 * separate connection. Delivery is at-most-once; the run store stays the source
 * of truth, and resume is idempotent.
 */
export class RedisEventBus implements EventPublisher, EventSubscriber {
  private readonly handlers = new Map<string, EventHandler<unknown>[]>();
  private listening = false;

  constructor(
    private readonly publisher: RedisPublishCommand,
    private readonly subscriber: RedisSubscribeCommand,
  ) {}

  async publish<TEvent>(topic: EventTopic, event: TEvent): Promise<void> {
    await this.publisher.publish(topic, JSON.stringify(event));
  }

  async subscribe<TEvent>(topic: EventTopic, handler: EventHandler<TEvent>): Promise<void> {
    this.startListening();
    const existing = this.handlers.get(topic) ?? [];
    existing.push(handler as EventHandler<unknown>);
    this.handlers.set(topic, existing);
    await this.subscriber.subscribe(topic);
  }

  private startListening(): void {
    if (this.listening) {
      return;
    }
    this.subscriber.on("message", (channel, message) => {
      void this.dispatch(channel, message);
    });
    this.listening = true;
  }

  private async dispatch(channel: string, message: string): Promise<void> {
    const handlers = this.handlers.get(channel) ?? [];
    const event: unknown = JSON.parse(message);
    for (const handler of handlers) {
      await handler(event);
    }
  }
}
