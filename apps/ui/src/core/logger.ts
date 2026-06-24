import { type Logger as PinoLogger, type LoggerOptions, pino } from "pino";

import type { Settings } from "./settings";

/** Structured logging, behind an interface so it can be injected and silenced in
 * tests. Every Route Handler and gateway logs through this so failures are
 * traceable. Never log secrets or PII (CODING_PRINCIPLES security checklist). */
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger;
}

export class PinoLoggerAdapter implements Logger {
  constructor(private readonly logger: PinoLogger) {}

  info(message: string, context: Record<string, unknown> = {}): void {
    this.logger.info(context, message);
  }

  warn(message: string, context: Record<string, unknown> = {}): void {
    this.logger.warn(context, message);
  }

  error(message: string, context: Record<string, unknown> = {}): void {
    this.logger.error(context, message);
  }

  debug(message: string, context: Record<string, unknown> = {}): void {
    this.logger.debug(context, message);
  }

  child(context: Record<string, unknown>): Logger {
    return new PinoLoggerAdapter(this.logger.child(context));
  }
}

/** A no-op logger for tests, so test output stays quiet and deterministic. */
export class SilentLogger implements Logger {
  info(): void {}
  warn(): void {}
  error(): void {}
  debug(): void {}

  child(): Logger {
    return this;
  }
}

export function buildPinoOptions(settings: Settings): LoggerOptions {
  if (settings.isProduction) {
    return { level: settings.logLevel };
  }
  // Human-readable logs in development; JSON lines in production.
  return {
    level: settings.logLevel,
    transport: { target: "pino-pretty", options: { colorize: true } },
  };
}

export function createLogger(settings: Settings): Logger {
  return new PinoLoggerAdapter(pino(buildPinoOptions(settings)));
}
