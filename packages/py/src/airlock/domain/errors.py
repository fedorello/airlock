"""Domain errors. Each carries a machine-readable code."""


class AirlockError(Exception):
    """Base type for all Airlock domain errors."""

    code: str


class UnknownToolError(AirlockError):
    """The model named a tool that is not registered with the agent."""

    code = "unknown_tool"

    def __init__(self, tool_name: str) -> None:
        super().__init__(f"Unknown tool: {tool_name}")


class RunNotFoundError(AirlockError):
    """`resume` referenced a run the store does not have."""

    code = "run_not_found"

    def __init__(self, run_id: str) -> None:
        super().__init__(f"Run not found: {run_id}")
