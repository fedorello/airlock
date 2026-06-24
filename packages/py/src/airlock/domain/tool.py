"""Tools: what the agent can do, and how risky each one is."""

from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from enum import StrEnum

from pydantic import BaseModel, ConfigDict

from airlock.domain.identifiers import ToolCallId


class RiskTier(StrEnum):
    """Drives whether a tool call needs human approval."""

    SAFE = "safe"
    SENSITIVE = "sensitive"


class ToolDefinition(BaseModel):
    """What the model is shown about a tool. Carries no executable behavior."""

    model_config = ConfigDict(frozen=True)

    name: str
    description: str
    parameters: dict[str, object]
    risk: RiskTier


class ToolCall(BaseModel):
    """The model's request to invoke a tool."""

    model_config = ConfigDict(frozen=True)

    id: ToolCallId
    name: str
    args: dict[str, object]


ToolHandler = Callable[[Mapping[str, object]], Awaitable[object]]
"""Executes a tool's side effect. The only place an effect happens."""


@dataclass(frozen=True)
class Tool:
    """A tool definition bound to its handler; the handler never reaches the model."""

    name: str
    description: str
    parameters: dict[str, object]
    risk: RiskTier
    handler: ToolHandler

    def definition(self) -> ToolDefinition:
        """The model-visible definition, without the handler."""
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=self.parameters,
            risk=self.risk,
        )
