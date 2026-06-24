"""LlmProvider port: one normalized, model-agnostic completion call (ADR-0005)."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from airlock.domain.conversation import Message
from airlock.domain.tool import ToolCall, ToolDefinition


@dataclass(frozen=True)
class CompletionRequest:
    system: str
    messages: Sequence[Message]
    tools: Sequence[ToolDefinition]


@dataclass(frozen=True)
class CompletionResult:
    text: str | None
    tool_calls: tuple[ToolCall, ...]


class LlmProvider(Protocol):
    async def complete(self, request: CompletionRequest) -> CompletionResult: ...
