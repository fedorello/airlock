"""GatePolicy port: decides whether a specific tool call needs human approval.

Kept out of tool definitions and the prompt, so the rule is deterministic and
testable (ADR-0003)."""

from dataclasses import dataclass
from typing import Protocol

from airlock.domain.run import RunState
from airlock.domain.tool import Tool, ToolCall


@dataclass(frozen=True)
class GateDecisionInput:
    tool: Tool
    tool_call: ToolCall
    state: RunState


class GatePolicy(Protocol):
    def requires_approval(self, decision_input: GateDecisionInput) -> bool: ...
