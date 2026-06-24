import { z } from "zod";

/** Configuration read from AIRLOCK_-prefixed environment variables (server-side).
 * Validated with zod so a misconfiguration fails fast at startup. */

export const LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
] as const;

const settingsSchema = z.object({
  redisUrl: z.string().default("redis://127.0.0.1:6379"),
  logLevel: z.enum(LOG_LEVELS).default("info"),
  approverName: z.string().default("ui-operator"),
  isProduction: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

export function loadSettings(
  env: Record<string, string | undefined> = process.env,
): Settings {
  return settingsSchema.parse({
    redisUrl: env.AIRLOCK_REDIS_URL,
    logLevel: env.AIRLOCK_LOG_LEVEL,
    approverName: env.AIRLOCK_APPROVER_NAME,
    isProduction: env.NODE_ENV === "production",
  });
}
