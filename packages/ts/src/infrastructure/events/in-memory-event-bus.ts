import type {
  EventHandler,
  EventPublisher,
  EventSubscriber,
} from "../../application/ports/event-bus";
import type { EventTopic } from "../../domain/events";

/**
 * In-process event bus implementing both sides. `publish` awaits every
 * subscribed handler in turn, which keeps the event flow deterministic in tests.
 */
export class InMemoryEventBus implements EventPublisher, EventSubscriber {
  private readonly handlers = new Map<EventTopic, EventHandler<unknown>[]>();

  async publish<TEvent>(topic: EventTopic, event: TEvent): Promise<void> {
    const handlers = this.handlers.get(topic) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  subscribe<TEvent>(topic: EventTopic, handler: EventHandler<TEvent>): Promise<void> {
    const existing = this.handlers.get(topic) ?? [];
    existing.push(handler as EventHandler<unknown>);
    this.handlers.set(topic, existing);
    return Promise.resolve();
  }
}
