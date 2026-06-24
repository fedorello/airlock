"""Anthropic Messages API adapter (HTTP, no SDK — ADR-0007)."""

from dataclasses import dataclass
from typing import Annotated, Literal

import httpx
from pydantic import BaseModel, Field, ValidationError

from airlock.application.ports.llm_provider import CompletionRequest, CompletionResult
from airlock.domain.conversation import AssistantMessage, Message, ToolMessage, UserMessage
from airlock.domain.identifiers import ToolCallId
from airlock.domain.tool import ToolCall, ToolDefinition
from airlock.infrastructure.providers.http import ProviderResponseError, post_json

_DEFAULT_BASE_URL = "https://api.anthropic.com"
_ANTHROPIC_VERSION = "2023-06-01"
_DEFAULT_MAX_TOKENS = 1024


@dataclass(frozen=True)
class AnthropicOptions:
    client: httpx.AsyncClient
    api_key: str
    model: str
    max_tokens: int = _DEFAULT_MAX_TOKENS
    base_url: str = _DEFAULT_BASE_URL


class _TextBlock(BaseModel):
    type: Literal["text"]
    text: str


class _ToolUseBlock(BaseModel):
    type: Literal["tool_use"]
    id: str
    name: str
    input: dict[str, object]


_ContentBlock = Annotated[_TextBlock | _ToolUseBlock, Field(discriminator="type")]


class _AnthropicResponse(BaseModel):
    content: list[_ContentBlock]


class AnthropicProvider:
    """Maps the conversation to Anthropic's wire format and validates the reply."""

    def __init__(self, options: AnthropicOptions) -> None:
        self._client = options.client
        self._api_key = options.api_key
        self._model = options.model
        self._max_tokens = options.max_tokens
        self._base_url = options.base_url

    async def complete(self, request: CompletionRequest) -> CompletionResult:
        body = {
            "model": self._model,
            "max_tokens": self._max_tokens,
            "system": request.system,
            "messages": [_to_wire_message(message) for message in request.messages],
            "tools": [_to_wire_tool(tool) for tool in request.tools],
        }
        headers = {"x-api-key": self._api_key, "anthropic-version": _ANTHROPIC_VERSION}
        raw = await post_json(self._client, f"{self._base_url}/v1/messages", headers, body)
        return _parse_response(raw)


def _parse_response(raw: object) -> CompletionResult:
    try:
        parsed = _AnthropicResponse.model_validate(raw)
    except ValidationError as error:
        raise ProviderResponseError(str(error)) from error
    text = ""
    tool_calls: list[ToolCall] = []
    for block in parsed.content:
        match block:
            case _TextBlock():
                text += block.text
            case _ToolUseBlock():
                tool_calls.append(
                    ToolCall(id=ToolCallId(block.id), name=block.name, args=block.input)
                )
    return CompletionResult(text=text or None, tool_calls=tuple(tool_calls))


def _to_wire_message(message: Message) -> dict[str, object]:
    match message:
        case UserMessage():
            return {"role": "user", "content": message.content}
        case AssistantMessage():
            return {"role": "assistant", "content": _assistant_content(message)}
        case ToolMessage():
            return {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": message.tool_call_id,
                        "content": message.content,
                    }
                ],
            }


def _assistant_content(message: AssistantMessage) -> list[dict[str, object]]:
    blocks: list[dict[str, object]] = []
    if message.content:
        blocks.append({"type": "text", "text": message.content})
    for call in message.tool_calls:
        blocks.append({"type": "tool_use", "id": call.id, "name": call.name, "input": call.args})
    return blocks


def _to_wire_tool(tool: ToolDefinition) -> dict[str, object]:
    return {"name": tool.name, "description": tool.description, "input_schema": tool.parameters}
