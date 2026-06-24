import type { EventTopic } from "../../domain/events";

export type EventHandler<TEvent> = (event: TEvent) => Promise<void> | void;

/**
 * Publish side of the event bus. The agent core depends only on this
 * (Interface Segregation): it emits approval requests and lifecycle events.
 */
export interface EventPublisher {
  publish<TEvent>(topic: EventTopic, event: TEvent): Promise<void>;
}

/**
 * Subscribe side of the event bus. Driving adapters (the runner, approvers)
 * depend on this; the core does not.
 */
export interface EventSubscriber {
  subscribe<TEvent>(topic: EventTopic, handler: EventHandler<TEvent>): Promise<void>;
}
