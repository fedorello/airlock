import { z } from "zod";

/** Identifiers of the providers Airlock ships an adapter for. */
export const ProviderName = {
  Anthropic: "anthropic",
  OpenAI: "openai",
} as const;
export type ProviderName = (typeof ProviderName)[keyof typeof ProviderName];

const DEFAULT_REDIS_URL = "redis://localhost:6379";
const DEFAULT_SYSTEM_PROMPT = "You are a helpful, careful assistant.";

const settingsSchema = z.object({
  provider: z.enum([ProviderName.Anthropic, ProviderName.OpenAI]).default(ProviderName.Anthropic),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
  redisUrl: z.string().min(1).default(DEFAULT_REDIS_URL),
  systemPrompt: z.string().min(1).default(DEFAULT_SYSTEM_PROMPT),
});

/** Validated application configuration. */
export type Settings = z.infer<typeof settingsSchema>;

/**
 * Read and validate configuration from an environment map. The composition root
 * passes `process.env`; tests pass a literal. Throws if a required value is
 * missing or malformed, so misconfiguration fails fast instead of at first use.
 */
export function loadSettings(env: Readonly<Record<string, string | undefined>>): Settings {
  return settingsSchema.parse({
    provider: env["AIRLOCK_PROVIDER"],
    model: env["AIRLOCK_MODEL"],
    apiKey: env["AIRLOCK_API_KEY"],
    baseUrl: env["AIRLOCK_BASE_URL"],
    redisUrl: env["AIRLOCK_REDIS_URL"],
    systemPrompt: env["AIRLOCK_SYSTEM_PROMPT"],
  });
}
