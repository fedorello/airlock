/** Base type for all Airlock domain errors. Carries a machine-readable `code`. */
export abstract class AirlockError extends Error {
  abstract readonly code: string;
}

/** The model named a tool that is not registered with the agent. */
export class UnknownToolError extends AirlockError {
  readonly code = "unknown_tool";

  constructor(toolName: string) {
    super(`Unknown tool: ${toolName}`);
    this.name = "UnknownToolError";
  }
}

/** `resume` referenced a run that the store does not have. */
export class RunNotFoundError extends AirlockError {
  readonly code = "run_not_found";

  constructor(runId: string) {
    super(`Run not found: ${runId}`);
    this.name = "RunNotFoundError";
  }
}
