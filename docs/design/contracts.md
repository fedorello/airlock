# Design contract

The precise, language-neutral contract that both the TypeScript and Python
packages implement. It pins the signatures, the run state machine, and the
invariants so the two implementations stay in parity (see
[ADR-0006](../adr/0006-dual-language-parity-monorepo.md)). The narrative lives in
[`../architecture/overview.md`](../architecture/overview.md).

Signatures are written language-neutrally; each package uses its idiomatic types
(branded strings / `NewType` for identifiers, `zod` / `pydantic` for schemas).

## Identifiers

`RunId`, `RequestId`, and `ToolCallId` are distinct identifier types (not raw
strings). They are produced only by the `IdGenerator` port.

## Domain types

- `RiskTier` = `safe` | `sensitive`.
- `ToolDefinition` = { `name`, `description`, `parameters` (JSON Schema),
  `risk` }. This is what the model sees.
- `Tool` = `ToolDefinition` + `handler(args) -> result`. The handler is the only
  place a side effect happens; the model never sees it.
- `ToolCall` = { `id`: ToolCallId, `name`, `args` }.
- `Message` = `UserMessage` | `AssistantMessage` | `ToolMessage`.
- `ApprovalRequest` = { `runId`, `requestId`, `toolCall`, `risk`, `context` }.
- `ApprovalDecision` = `Approve{approver}` | `Edit{approver, editedArgs}` |
  `Reject{approver, reason}`.
- `RunState` = { `runId`, `status`, `messages`, `pendingToolCalls`, `cursor`,
  `approval` (or null), `metadata` }. Fully serializable.
- `RunStatus` = `running` | `awaiting_approval` | `completed` | `failed`.
- `AuditEvent` = { `runId`, `type`, `at` (UTC ISO-8601), `data` }.

## Ports

| Port | Method(s) |
| --- | --- |
| `LlmProvider` | `complete({ system, messages, tools }) -> { text, toolCalls }` |
| `EventPublisher` | `publish(topic, event)` |
| `EventSubscriber` | `subscribe(topic, handler)` |
| `RunStore` | `save(state)`, `load(runId) -> state \| null` |
| `AuditSink` | `record(event)` |
| `Clock` | `now() -> instant` (UTC) |
| `IdGenerator` | `runId()`, `requestId()` (tool-call ids come from the model) |
| `GatePolicy` | `requiresApproval({ tool, toolCall, state }) -> boolean` |

`EventPublisher` and `EventSubscriber` are separate (Interface Segregation): the
core depends only on `EventPublisher`; the runner depends on `EventSubscriber`.

## Event topics

- `approval.requested` — payload is an `ApprovalRequest`.
- `approval.decided` — payload `{ runId, requestId, decision }`.
- `run.completed` — payload `{ runId }`.
- `run.failed` — payload `{ runId, reason }`.

## The `Agent` use case

Constructed with a single dependencies object (`provider`, `tools`, `events`
(publisher), `store`, `audit`, `clock`, `ids`, `gatePolicy`, `systemPrompt`).

- `run(input) -> RunState` — start a run and advance until it completes or
  suspends.
- `resume(runId, requestId, decision) -> RunState` — apply a decision and
  continue.

### Invariants

1. A `sensitive` tool's handler is **never** called before an `approve`/`edit`
   decision for it is applied.
2. On a gated call the loop persists `RunState` (status `awaiting_approval`),
   publishes `approval.requested`, and returns — holding no thread.
3. `resume` is **idempotent**, keyed by `requestId`: if the loaded run is not
   awaiting that exact `requestId`, `resume` is a no-op that returns the current
   state. A replayed decision can never execute a tool twice.
4. `reject` appends a tool message recording the human rejection and continues
   the loop — it is not a terminal failure.
5. Multiple tool calls in one model turn are processed in order via `cursor`; the
   loop suspends at the gated one and resumes from the same `cursor`.
6. Every model call, tool execution, and approval decision is recorded through
   `AuditSink`. All timestamps are UTC, taken from `Clock`.

### Errors

- `UnknownToolError` — the model named a tool that is not registered.
- `RunNotFoundError` — `resume` referenced an unknown `runId`.

Each error carries a machine-readable `code`.
