import { type ApprovalDecision, type ApprovalRequest, DecisionType } from "../domain/approval";
import { AuditEventType } from "../domain/audit";
import { MessageRole } from "../domain/conversation";
import { EventTopic } from "../domain/events";
import { RunNotFoundError, UnknownToolError } from "../domain/errors";
import type { RequestId, RunId, ToolCallId } from "../domain/identifiers";
import { type RunState, RunStatus } from "../domain/run";
import type { RiskTier, Tool, ToolCall, ToolDefinition } from "../domain/tool";
import type { AuditSink } from "./ports/audit-sink";
import type { Clock } from "./ports/clock";
import type { EventPublisher } from "./ports/event-bus";
import type { GatePolicy } from "./ports/gate-policy";
import type { IdGenerator } from "./ports/id-generator";
import type { CompletionResult, LlmProvider } from "./ports/llm-provider";
import type { RunStore } from "./ports/run-store";

/** Prefix of the tool message recorded when a human rejects an action. */
const REJECTION_NOTICE_PREFIX = "Rejected by a human:";

/** Everything the Agent needs, injected as one object (constructor injection). */
export interface AgentDependencies {
  readonly provider: LlmProvider;
  readonly tools: readonly Tool[];
  readonly events: EventPublisher;
  readonly store: RunStore;
  readonly audit: AuditSink;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly gatePolicy: GatePolicy;
  readonly systemPrompt: string;
}

/**
 * The agent loop with the approval gate built in. Safe tools run automatically;
 * a sensitive tool call suspends the run for a human decision and resumes when
 * one arrives. See docs/design/contracts.md for the invariants.
 */
export class Agent {
  private readonly provider: LlmProvider;
  private readonly events: EventPublisher;
  private readonly store: RunStore;
  private readonly audit: AuditSink;
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly gatePolicy: GatePolicy;
  private readonly systemPrompt: string;
  private readonly tools: ReadonlyMap<string, Tool>;
  private readonly toolDefinitions: readonly ToolDefinition[];

  constructor(deps: AgentDependencies) {
    this.provider = deps.provider;
    this.events = deps.events;
    this.store = deps.store;
    this.audit = deps.audit;
    this.clock = deps.clock;
    this.ids = deps.ids;
    this.gatePolicy = deps.gatePolicy;
    this.systemPrompt = deps.systemPrompt;
    this.tools = new Map(deps.tools.map((tool) => [tool.name, tool]));
    this.toolDefinitions = deps.tools.map((tool) => toDefinition(tool));
  }

  /** Start a run and advance until it completes or suspends for approval. */
  async run(input: string): Promise<RunState> {
    return this.advance(this.createRun(input));
  }

  /** Apply a human decision and continue. Idempotent, keyed by `requestId`. */
  async resume(runId: RunId, requestId: RequestId, decision: ApprovalDecision): Promise<RunState> {
    const state = await this.store.load(runId);
    if (state === null) {
      throw new RunNotFoundError(runId);
    }
    const request = state.approval;
    if (!this.isAwaiting(state, requestId) || request === null) {
      return state;
    }
    await this.applyDecision(state, request, decision);
    state.approval = null;
    state.status = RunStatus.Running;
    state.cursor += 1;
    return this.advance(state);
  }

  private createRun(input: string): RunState {
    return {
      runId: this.ids.runId(),
      status: RunStatus.Running,
      messages: [{ role: MessageRole.User, content: input }],
      pendingToolCalls: [],
      cursor: 0,
      approval: null,
      metadata: {},
    };
  }

  private async advance(state: RunState): Promise<RunState> {
    for (;;) {
      if (await this.processPending(state)) {
        return state;
      }
      const completion = await this.callModel(state);
      if (completion.toolCalls.length === 0) {
        return this.completeRun(state, completion.text);
      }
      this.startTurn(state, completion);
    }
  }

  private async processPending(state: RunState): Promise<boolean> {
    while (state.cursor < state.pendingToolCalls.length) {
      const call = state.pendingToolCalls[state.cursor];
      if (call === undefined) {
        break;
      }
      const tool = this.requireTool(call.name);
      if (this.gatePolicy.requiresApproval({ tool, toolCall: call, state })) {
        await this.suspendForApproval(state, call, tool.risk);
        return true;
      }
      await this.runToolCall(state, tool, call.args, call.id);
      state.cursor += 1;
    }
    return false;
  }

  private async suspendForApproval(
    state: RunState,
    toolCall: ToolCall,
    risk: RiskTier,
  ): Promise<void> {
    const request: ApprovalRequest = {
      runId: state.runId,
      requestId: this.ids.requestId(),
      toolCall,
      risk,
      context: state.metadata,
    };
    state.approval = request;
    state.status = RunStatus.AwaitingApproval;
    await this.store.save(state);
    await this.recordAudit(state.runId, AuditEventType.ApprovalRequested, {
      requestId: request.requestId,
      tool: toolCall.name,
    });
    await this.events.publish(EventTopic.ApprovalRequested, request);
  }

  private async applyDecision(
    state: RunState,
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ): Promise<void> {
    await this.recordAudit(state.runId, AuditEventType.ApprovalDecided, {
      requestId: request.requestId,
      decision: decision.type,
      approver: decision.approver,
    });
    if (decision.type === DecisionType.Reject) {
      this.appendRejection(state, request.toolCall.id, decision.reason);
      return;
    }
    const tool = this.requireTool(request.toolCall.name);
    const args = decision.type === DecisionType.Edit ? decision.editedArgs : request.toolCall.args;
    await this.runToolCall(state, tool, args, request.toolCall.id);
  }

  private async runToolCall(
    state: RunState,
    tool: Tool,
    args: Readonly<Record<string, unknown>>,
    toolCallId: ToolCallId,
  ): Promise<void> {
    const result = await tool.handler(args);
    await this.recordAudit(state.runId, AuditEventType.ToolExecuted, { tool: tool.name });
    state.messages.push({ role: MessageRole.Tool, toolCallId, content: serialize(result) });
  }

  private async callModel(state: RunState): Promise<CompletionResult> {
    const completion = await this.provider.complete({
      system: this.systemPrompt,
      messages: state.messages,
      tools: this.toolDefinitions,
    });
    await this.recordAudit(state.runId, AuditEventType.ModelCalled, {});
    return completion;
  }

  private startTurn(state: RunState, completion: CompletionResult): void {
    state.messages.push({
      role: MessageRole.Assistant,
      content: completion.text ?? "",
      toolCalls: completion.toolCalls,
    });
    state.pendingToolCalls = completion.toolCalls;
    state.cursor = 0;
  }

  private async completeRun(state: RunState, text: string | null): Promise<RunState> {
    state.messages.push({ role: MessageRole.Assistant, content: text ?? "", toolCalls: [] });
    state.status = RunStatus.Completed;
    await this.store.save(state);
    await this.recordAudit(state.runId, AuditEventType.RunCompleted, {});
    await this.events.publish(EventTopic.RunCompleted, { runId: state.runId });
    return state;
  }

  private appendRejection(state: RunState, toolCallId: ToolCallId, reason: string): void {
    state.messages.push({
      role: MessageRole.Tool,
      toolCallId,
      content: `${REJECTION_NOTICE_PREFIX} ${reason}`,
    });
  }

  private isAwaiting(state: RunState, requestId: RequestId): boolean {
    return (
      state.status === RunStatus.AwaitingApproval &&
      state.approval !== null &&
      state.approval.requestId === requestId
    );
  }

  private requireTool(name: string): Tool {
    const tool = this.tools.get(name);
    if (tool === undefined) {
      throw new UnknownToolError(name);
    }
    return tool;
  }

  private async recordAudit(
    runId: RunId,
    type: AuditEventType,
    data: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await this.audit.record({ runId, type, at: this.clock.now().toISOString(), data });
  }
}

/** Strip the handler so only the model-visible definition is sent to the provider. */
function toDefinition(tool: Tool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    risk: tool.risk,
  };
}

/** Render a tool result as a string for the tool message. */
function serialize(result: unknown): string {
  return typeof result === "string" ? result : (JSON.stringify(result) ?? "null");
}
