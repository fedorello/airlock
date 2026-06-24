"""Conversation messages exchanged with the model."""

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from airlock.domain.identifiers import ToolCallId
from airlock.domain.tool import ToolCall


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class UserMessage(BaseModel):
    model_config = ConfigDict(frozen=True)

    role: Literal[MessageRole.USER] = MessageRole.USER
    content: str


class AssistantMessage(BaseModel):
    model_config = ConfigDict(frozen=True)

    role: Literal[MessageRole.ASSISTANT] = MessageRole.ASSISTANT
    content: str
    tool_calls: tuple[ToolCall, ...] = ()


class ToolMessage(BaseModel):
    model_config = ConfigDict(frozen=True)

    role: Literal[MessageRole.TOOL] = MessageRole.TOOL
    tool_call_id: ToolCallId
    content: str


Message = Annotated[
    UserMessage | AssistantMessage | ToolMessage,
    Field(discriminator="role"),
]
