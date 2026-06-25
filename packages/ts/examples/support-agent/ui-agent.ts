import { Redis } from "ioredis";

import {
  Agent,
  AgentRunner,
  type CompletionRequest,
  type CompletionResult,
  EventTopic,
  InMemoryAuditSink,
  type LlmProvider,
  MessageRole,
  RedisEventBus,
  RedisRunStore,
  RiskBasedGatePolicy,
  SystemClock,
  UuidIdGenerator,
} from "../../src/index";
import {
  INJECTION_REQUEST,
  INJECTION_STEPS,
  INJECTION_SYSTEM_PROMPT,
  createInjectionTools,
} from "./injection-scenario";

// The agent behind the approver dashboard: it starts a support run that pauses at
// the gate and waits for a human to approve through the UI (no auto-approver). It
// loops so the dashboard always has something to act on.

const REDIS_URL = process.env["AIRLOCK_REDIS_URL"] ?? "redis://127.0.0.1:6379";
const RESTART_DELAY_MS = 3000;

/** A stateless, conversation-driven stand-in for a real model: it picks its next
 * step from how many tools have already run, so it behaves the same across runs. */
class ScenarioProvider implements LlmProvider {
  complete(request: CompletionRequest): Promise<CompletionResult> {
    const done = request.messages.filter((message) => message.role === MessageRole.Tool).length;
    const index = Math.min(done, INJECTION_STEPS.length - 1);
    const step = INJECTION_STEPS[index] ?? { text: "Done.", toolCalls: [] };
    return Promise.resolve(step);
  }
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

async function main(): Promise<void> {
  const publisher = new Redis(REDIS_URL);
  const subscriber = new Redis(REDIS_URL);
  const storeConnection = new Redis(REDIS_URL);
  const bus = new RedisEventBus(publisher, subscriber);
  const agent = new Agent({
    provider: new ScenarioProvider(),
    tools: createInjectionTools(log),
    events: bus,
    store: new RedisRunStore(storeConnection),
    audit: new InMemoryAuditSink(),
    clock: new SystemClock(),
    ids: new UuidIdGenerator(),
    gatePolicy: new RiskBasedGatePolicy(),
    systemPrompt: INJECTION_SYSTEM_PROMPT,
  });

  await new AgentRunner({ agent, subscriber: bus }).start();
  let current = deferred();
  await bus.subscribe(EventTopic.RunCompleted, () => {
    current.resolve();
  });

  log("[ui-agent] ready — open the dashboard and approve the actions it raises");
  for (;;) {
    current = deferred();
    const started = await agent.run(INJECTION_REQUEST);
    log(`[ui-agent] started run ${started.runId}; it is waiting for approval`);
    await current.promise;
    log("[ui-agent] run completed; starting another shortly");
    await sleep(RESTART_DELAY_MS);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
