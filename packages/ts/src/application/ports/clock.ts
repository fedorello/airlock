/**
 * Source of the current instant. Injected so time is deterministic in tests.
 * Implementations always return a UTC-based instant.
 */
export interface Clock {
  now(): Date;
}
