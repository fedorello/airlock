import type { ApprovalEventSource, ApprovalReader } from "@/application/ports";
import { SubmitDecision } from "@/application/submit-decision";
import { RedisApprovalGateway } from "@/infrastructure/redis/redis-approval-gateway";
import { createRedisConnections } from "@/infrastructure/redis/redis-connections";
import { RedisEventSource } from "@/infrastructure/redis/redis-event-source";

import { type Logger, createLogger } from "./logger";
import { type Settings, loadSettings } from "./settings";

/** The single composition root: wires the real adapters behind the ports. */
export interface Container {
  settings: Settings;
  logger: Logger;
  reader: ApprovalReader;
  submitDecision: SubmitDecision;
  eventSource: ApprovalEventSource;
}

export function buildContainer(settings: Settings = loadSettings()): Container {
  const logger = createLogger(settings);
  const connections = createRedisConnections(settings.redisUrl);
  const gateway = new RedisApprovalGateway(connections.command, logger);
  return {
    settings,
    logger,
    reader: gateway,
    submitDecision: new SubmitDecision(gateway, logger),
    eventSource: new RedisEventSource(connections.subscriber, logger),
  };
}

let container: Container | null = null;

/** Lazily built once per server process and shared across requests (the Redis
 * connections are long-lived). The only place concrete adapters are assembled. */
export function getContainer(): Container {
  container ??= buildContainer();
  return container;
}
