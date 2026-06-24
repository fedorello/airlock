import { Redis } from "ioredis";

/** Redis needs a dedicated connection for SUBSCRIBE, separate from the one used
 * for commands (GET/SCAN/PUBLISH). */
export interface RedisConnections {
  command: Redis;
  subscriber: Redis;
}

export function createRedisConnections(url: string): RedisConnections {
  return { command: new Redis(url), subscriber: new Redis(url) };
}
