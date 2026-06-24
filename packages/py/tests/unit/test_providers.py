"""Tests for the HTTP provider adapters, using httpx's MockTransport."""

import json
from collections.abc import Callable

import httpx
import pytest

from airlock import (
    AnthropicOptions,
    AnthropicProvider,
    OpenAiOptions,
    OpenAiProvider,
    ProviderHttpError,
    ProviderResponseError,
)
from airlock.application.ports.llm_provider import CompletionRequest
from airlock.domain.conversation import UserMessage
from airlock.domain.tool import RiskTier, ToolDefinition

REQUEST = CompletionRequest(
    system="sys",
    messages=(UserMessage(content="hi"),),
    tools=(
        ToolDefinition(
            name="send_email",
            description="Send an email",
            parameters={"type": "object"},
            risk=RiskTier.SENSITIVE,
        ),
    ),
)


def _client(handler: Callable[[httpx.Request], httpx.Response]) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


async def test_anthropic_parses_text_and_tool_use() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["model"] == "claude-x"
        assert request.url.path == "/v1/messages"
        return httpx.Response(
            200,
            json={
                "content": [
                    {"type": "text", "text": "Hello"},
                    {
                        "type": "tool_use",
                        "id": "tc-1",
                        "name": "send_email",
                        "input": {"to": "a@b"},
                    },
                ]
            },
        )

    async with _client(handler) as client:
        provider = AnthropicProvider(AnthropicOptions(client=client, api_key="k", model="claude-x"))
        result = await provider.complete(REQUEST)

    assert result.text == "Hello"
    assert result.tool_calls[0].name == "send_email"
    assert result.tool_calls[0].id == "tc-1"


async def test_anthropic_raises_on_http_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="boom")

    async with _client(handler) as client:
        provider = AnthropicProvider(AnthropicOptions(client=client, api_key="k", model="m"))
        with pytest.raises(ProviderHttpError):
            await provider.complete(REQUEST)


async def test_openai_parses_tool_calls() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": None,
                            "tool_calls": [
                                {
                                    "id": "call-1",
                                    "type": "function",
                                    "function": {
                                        "name": "send_email",
                                        "arguments": '{"to": "a@b"}',
                                    },
                                }
                            ],
                        }
                    }
                ]
            },
        )

    async with _client(handler) as client:
        provider = OpenAiProvider(OpenAiOptions(client=client, api_key="k", model="gpt-x"))
        result = await provider.complete(REQUEST)

    assert result.tool_calls[0].name == "send_email"
    assert result.tool_calls[0].args == {"to": "a@b"}


async def test_openai_prepends_system_message() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert body["messages"][0] == {"role": "system", "content": "sys"}
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    async with _client(handler) as client:
        provider = OpenAiProvider(OpenAiOptions(client=client, api_key="k", model="gpt-x"))
        result = await provider.complete(REQUEST)

    assert result.text == "ok"


async def test_openai_raises_on_empty_choices() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": []})

    async with _client(handler) as client:
        provider = OpenAiProvider(OpenAiOptions(client=client, api_key="k", model="m"))
        with pytest.raises(ProviderResponseError):
            await provider.complete(REQUEST)
