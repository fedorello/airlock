"""OpenAI Chat Completions adapter (HTTP, no SDK — ADR-0007). A configurable
base URL also serves OpenAI-compatible endpoints (OpenRouter, Ollama, ...)."""

import json
from dataclasses import dataclass
from typing import Literal

import httpx
from pydantic import BaseModel, ValidationError

from airlock.application.ports.llm_provider import CompletionRequest, CompletionResult
from airlock.domain.conversation import AssistantMessage, Message, ToolMessage, UserMessage
from airlock.domain.identifiers import ToolCallId
from airlock.domain.tool import ToolCall, ToolDefinition
from airlock.infrastructure.providers.http import ProviderResponseError, post_json

_DEFAULT_BASE_URL = "https://api.openai.com/v1"


@dataclass(frozen=True)
class OpenAiOptions:
    client: httpx.AsyncClient
    api_key: str
    model: str
    base_url: str = _DEFAULT_BASE_URL


class _FunctionCall(BaseModel):
    name: str
    arguments: str


class _ResponseToolCall(BaseModel):
    id: str
    type: Literal["function"]
    function: _FunctionCall


class _ResponseMessage(BaseModel):
    content: str | None = None
    tool_calls: list[_ResponseToolCall] = []


class _Choice(BaseModel):
    message: _ResponseMessage


class _OpenAiResponse(BaseModel):
    choices: list[_Choice]


class OpenAiProvider:
    """Maps the conversation to Chat Completions and validates the reply."""

    def __init__(self, options: OpenAiOptions) -> None:
        self._client = options.client
        self._api_key = options.api_key
        self._model = options.model
        self._base_url = options.base_url

    async def complete(self, request: CompletionRequest) -> CompletionResult:
        messages: list[dict[str, object]] = [{"role": "system", "content": request.system}]
        messages.extend(_to_wire_message(message) for message in request.messages)
        body = {
            "model": self._model,
            "messages": messages,
            "tools": [_to_wire_tool(tool) for tool in request.tools],
        }
        headers = {"authorization": f"Bearer {self._api_key}"}
        raw = await post_json(self._client, f"{self._base_url}/chat/completions", headers, body)
        return _parse_response(raw)


def _parse_response(raw: object) -> CompletionResult:
    try:
        parsed = _OpenAiResponse.model_validate(raw)
    except ValidationError as error:
        raise ProviderResponseError(str(error)) from error
    if not parsed.choices:
        raise ProviderResponseError("OpenAI response contained no choices")
    message = parsed.choices[0].message
    tool_calls = tuple(
        ToolCall(id=ToolCallId(call.id), name=call.function.name, args=_parse_args(call))
        for call in message.tool_calls
    )
    return CompletionResult(text=message.content, tool_calls=tool_calls)


def _parse_args(call: _ResponseToolCall) -> dict[str, object]:
    try:
        parsed: object = json.loads(call.function.arguments)
    except json.JSONDecodeError as error:
        raise ProviderResponseError(f"Invalid tool arguments for {call.function.name}") from error
    if not isinstance(parsed, dict):
        raise ProviderResponseError(f"Tool arguments for {call.function.name} are not an object")
    return parsed


def _to_wire_message(message: Message) -> dict[str, object]:
    match message:
        case UserMessage():
            return {"role": "user", "content": message.content}
        case AssistantMessage():
            return _assistant_message(message)
        case ToolMessage():
            return {
                "role": "tool",
                "tool_call_id": message.tool_call_id,
                "content": message.content,
            }


def _assistant_message(message: AssistantMessage) -> dict[str, object]:
    wire: dict[str, object] = {"role": "assistant", "content": message.content}
    if message.tool_calls:
        wire["tool_calls"] = [_to_wire_tool_call(call) for call in message.tool_calls]
    return wire


def _to_wire_tool_call(call: ToolCall) -> dict[str, object]:
    return {
        "id": call.id,
        "type": "function",
        "function": {"name": call.name, "arguments": json.dumps(call.args)},
    }


def _to_wire_tool(tool: ToolDefinition) -> dict[str, object]:
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.parameters,
        },
    }
