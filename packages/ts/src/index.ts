// Public API surface: domain types, ports, the Agent use case, and the
// in-memory / fake adapters. Real adapters (Redis, providers) are added later.

export * from "./domain/identifiers";
export * from "./domain/tool";
export * from "./domain/conversation";
export * from "./domain/approval";
export * from "./domain/run";
export * from "./domain/audit";
export * from "./domain/events";
export * from "./domain/errors";

export * from "./application/ports/clock";
export * from "./application/ports/id-generator";
export * from "./application/ports/llm-provider";
export * from "./application/ports/event-bus";
export * from "./application/ports/run-store";
export * from "./application/ports/audit-sink";
export * from "./application/ports/gate-policy";
export * from "./application/gate-policy";
export * from "./application/agent";

export * from "./infrastructure/clock/system-clock";
export * from "./infrastructure/clock/fixed-clock";
export * from "./infrastructure/ids/uuid-id-generator";
export * from "./infrastructure/ids/sequential-id-generator";
export * from "./infrastructure/audit/in-memory-audit-sink";
export * from "./infrastructure/store/in-memory-run-store";
export * from "./infrastructure/events/in-memory-event-bus";
export * from "./infrastructure/providers/fake-llm-provider";
