import { z } from "zod";

/** The Airlock wire contract this UI speaks. The UI pairs with the TypeScript
 * Airlock agent, so the JSON is camelCase (the Python agent emits snake_case).
 * Kept here, validated with zod, so the UI stays independently deployable.
 * Source of truth: docs/design/contracts.md and packages/ts. */

export const RUN_KEY_PREFIX = "airlock:run:";

export const EventTopic = {
  ApprovalRequested: "approval.requested",
  ApprovalDecided: "approval.decided",
  RunCompleted: "run.completed",
  RunFailed: "run.failed",
} as const;
export type EventTopic = (typeof EventTopic)[keyof typeof EventTopic];

export const RiskTier = { Safe: "safe", Sensitive: "sensitive" } as const;
export type RiskTier = (typeof RiskTier)[keyof typeof RiskTier];

export const RunStatus = {
  Running: "running",
  AwaitingApproval: "awaiting_approval",
  Completed: "completed",
  Failed: "failed",
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const DecisionType = {
  Approve: "approve",
  Edit: "edit",
  Reject: "reject",
} as const;

const jsonRecord = z.record(z.string(), z.unknown());

export const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  args: jsonRecord,
});
export type ToolCall = z.infer<typeof toolCallSchema>;

export const messageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string() }),
  z.object({
    role: z.literal("assistant"),
    content: z.string(),
    toolCalls: z.array(toolCallSchema),
  }),
  z.object({
    role: z.literal("tool"),
    toolCallId: z.string(),
    content: z.string(),
  }),
]);
export type Message = z.infer<typeof messageSchema>;

export const approvalRequestSchema = z.object({
  runId: z.string(),
  requestId: z.string(),
  toolCall: toolCallSchema,
  risk: z.enum([RiskTier.Safe, RiskTier.Sensitive]),
  context: jsonRecord,
});
export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;

export const runStateSchema = z.object({
  runId: z.string(),
  status: z.enum([
    RunStatus.Running,
    RunStatus.AwaitingApproval,
    RunStatus.Completed,
    RunStatus.Failed,
  ]),
  messages: z.array(messageSchema),
  pendingToolCalls: z.array(toolCallSchema),
  cursor: z.number(),
  approval: approvalRequestSchema.nullable(),
  metadata: jsonRecord,
});
export type RunState = z.infer<typeof runStateSchema>;

export const decisionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(DecisionType.Approve), approver: z.string() }),
  z.object({
    type: z.literal(DecisionType.Edit),
    approver: z.string(),
    editedArgs: jsonRecord,
  }),
  z.object({
    type: z.literal(DecisionType.Reject),
    approver: z.string(),
    reason: z.string(),
  }),
]);
export type Decision = z.infer<typeof decisionSchema>;

export const runIdEventSchema = z.object({ runId: z.string() });

/** The event published on `approval.decided` (the Airlock runner consumes it). */
export interface ApprovalDecidedEvent {
  runId: string;
  requestId: string;
  decision: Decision;
}
