import {
  Agent,
  AgentRunner,
  Approver,
  autoApproveDecisionSource,
  FakeLlmProvider,
  InMemoryAuditSink,
  InMemoryEventBus,
  InMemoryRunStore,
  MessageRole,
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

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function finalAnswer(state: RunState | null): string {
  const last = state?.messages.at(-1);
  return last && last.role === MessageRole.Assistant ? last.content : "(no answer)";
}

/**
 * Runs the whole support flow in one process over an in-memory bus: the agent
 * drafts and acts; the approver auto-approves the sensitive steps; the runner
 * resumes. Deterministic — no network, no keys.
 */
async function main(): Promise<void> {
  log("=== Airlock support-agent demo (in-memory) ===");
  const bus = new InMemoryEventBus();
  const store = new InMemoryRunStore();
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

  log(`\n[USER] ${SUPPORT_REQUEST}\n`);
  const started = await agent.run(SUPPORT_REQUEST);
  const final = await store.load(started.runId);

  log(`\n[AGENT] ${finalAnswer(final)}`);
  log(`\n[RESULT] status=${final?.status ?? "unknown"} audit_events=${String(audit.all().length)}`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
