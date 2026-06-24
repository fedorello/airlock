import { Redis } from "ioredis";

import {
  Agent,
  AgentRunner,
  Approver,
  autoApproveDecisionSource,
  EventTopic,
  FakeLlmProvider,
  InMemoryAuditSink,
  MessageRole,
  RedisEventBus,
  RedisRunStore,
  RiskBasedGatePolicy,
  type RunState,
  SystemClock,
  UuidIdGenerator,
} from "../../src/index";
import {
  createSupportTools,
  SUPPORT_REQUEST,
  SUPPORT_SCRIPT,
  SUPPORT_SYSTEM_PROMPT,
} from "./wiring";

const REDIS_URL = process.env["AIRLOCK_REDIS_URL"] ?? "redis://127.0.0.1:6379";
const COMPLETION_TIMEOUT_MS = 10000;

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function finalAnswer(state: RunState | null): string {
  const last = state?.messages.at(-1);
  return last && last.role === MessageRole.Assistant ? last.content : "(no answer)";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error("timed out waiting for the run to complete"));
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

/**
 * Runs the support flow over a real Redis bus and store. The agent, the runner,
 * and the approver communicate only through Redis Pub/Sub — the same decoupled
 * shape as production. Used by Docker Compose as a smoke test.
 */
async function main(): Promise<void> {
  log("=== Airlock support-agent demo (Redis) ===");
  const publisher = new Redis(REDIS_URL);
  const subscriber = new Redis(REDIS_URL);
  const storeConnection = new Redis(REDIS_URL);
  const bus = new RedisEventBus(publisher, subscriber);
  const store = new RedisRunStore(storeConnection);
  const audit = new InMemoryAuditSink();

  const agent = new Agent({
    provider: new FakeLlmProvider(SUPPORT_SCRIPT),
    tools: createSupportTools(log),
    events: bus,
    store,
    audit,
    clock: new SystemClock(),
    ids: new UuidIdGenerator(),
    gatePolicy: new RiskBasedGatePolicy(),
    systemPrompt: SUPPORT_SYSTEM_PROMPT,
  });
  await new AgentRunner({ agent, subscriber: bus }).start();
  await new Approver({
    publisher: bus,
    subscriber: bus,
    decide: autoApproveDecisionSource("demo-operator", log),
  }).start();

  let resolveCompleted!: () => void;
  const completed = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });
  await bus.subscribe(EventTopic.RunCompleted, () => {
    resolveCompleted();
  });

  log(`\n[USER] ${SUPPORT_REQUEST}\n`);
  const started = await agent.run(SUPPORT_REQUEST);
  await withTimeout(completed, COMPLETION_TIMEOUT_MS);

  const final = await store.load(started.runId);
  log(`\n[AGENT] ${finalAnswer(final)}`);
  log(`\n[RESULT] status=${final?.status ?? "unknown"} audit_events=${String(audit.all().length)}`);

  await publisher.quit();
  await subscriber.quit();
  await storeConnection.quit();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
