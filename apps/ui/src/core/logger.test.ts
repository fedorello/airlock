import { describe, expect, it, vi } from "vitest";

import {
  type Logger,
  PinoLoggerAdapter,
  SilentLogger,
  buildPinoOptions,
  createLogger,
} from "@/core/logger";
import type { Settings } from "@/core/settings";

const BASE: Settings = {
  redisUrl: "redis://x",
  logLevel: "fatal",
  approverName: "x",
  isProduction: true,
};

function fakePino() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
}

describe("PinoLoggerAdapter", () => {
  it("forwards the message and context to pino", () => {
    const logger = fakePino();
    new PinoLoggerAdapter(logger as never).info("started", { runId: "r-1" });

    expect(logger.info).toHaveBeenCalledWith({ runId: "r-1" }, "started");
  });

  it("forwards warn, error, and debug", () => {
    const logger = fakePino();
    const adapter = new PinoLoggerAdapter(logger as never);
    adapter.warn("w");
    adapter.error("e");
    adapter.debug("d");

    expect(logger.warn).toHaveBeenCalledWith({}, "w");
    expect(logger.error).toHaveBeenCalledWith({}, "e");
    expect(logger.debug).toHaveBeenCalledWith({}, "d");
  });

  it("child wraps a child pino logger", () => {
    const child = fakePino();
    const logger = { ...fakePino(), child: vi.fn(() => child) };
    new PinoLoggerAdapter(logger as never).child({ scope: "api" }).info("x");

    expect(logger.child).toHaveBeenCalledWith({ scope: "api" });
    expect(child.info).toHaveBeenCalledWith({}, "x");
  });
});

describe("SilentLogger", () => {
  it("does nothing and returns itself for child", () => {
    const logger: Logger = new SilentLogger();

    expect(() => logger.info("x", { a: 1 })).not.toThrow();
    expect(() => logger.warn("x")).not.toThrow();
    expect(() => logger.error("x")).not.toThrow();
    expect(() => logger.debug("x")).not.toThrow();
    expect(logger.child({ a: 1 })).toBe(logger);
  });
});

describe("buildPinoOptions", () => {
  it("uses no transport in production", () => {
    expect(
      buildPinoOptions({ ...BASE, isProduction: true }).transport,
    ).toBeUndefined();
  });

  it("uses pino-pretty in development", () => {
    expect(
      buildPinoOptions({ ...BASE, isProduction: false }).transport,
    ).toEqual({
      target: "pino-pretty",
      options: { colorize: true },
    });
  });
});

describe("createLogger", () => {
  it("returns a working logger", () => {
    const logger = createLogger({ ...BASE, isProduction: true });

    expect(() => logger.info("ready")).not.toThrow();
  });
});
