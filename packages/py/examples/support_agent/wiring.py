"""Shared wiring for the support-agent example: the tools and a fixed script."""

import json
from collections.abc import Callable, Mapping

from airlock import CompletionResult, RiskTier, Tool, ToolCall, ToolCallId

SUPPORT_SYSTEM_PROMPT = (
    "You are Aria, a calm, careful customer-support agent for a small online store. "
    "Use the tools to look things up. Refunds and emails are sensitive: they are "
    "reviewed by a human before they happen."
)

SUPPORT_REQUEST = (
    "Alice (alice@example.test) wants a refund on order ord-42 and an email confirming it."
)


def _call(call_id: str, name: str, args: dict[str, object]) -> ToolCall:
    return ToolCall(id=ToolCallId(call_id), name=name, args=args)


SUPPORT_SCRIPT: list[CompletionResult] = [
    CompletionResult(text=None, tool_calls=(_call("c1", "lookup_order", {"order_id": "ord-42"}),)),
    CompletionResult(
        text=None,
        tool_calls=(_call("c2", "issue_refund", {"order_id": "ord-42", "amount": 49.99}),),
    ),
    CompletionResult(
        text=None,
        tool_calls=(
            _call(
                "c3",
                "send_email",
                {
                    "to": "alice@example.test",
                    "subject": "Your refund",
                    "body": "Hi Alice, your $49.99 refund is on its way.",
                },
            ),
        ),
    ),
    CompletionResult(
        text="Done — I refunded order ord-42 ($49.99) and emailed Alice a confirmation.",
        tool_calls=(),
    ),
]


def create_support_tools(log: Callable[[str], None]) -> list[Tool]:
    """Build the support tools. Handlers print what they do and return a result."""

    def make(name: str, risk: RiskTier, result: object) -> Tool:
        async def handler(args: Mapping[str, object]) -> object:
            log(f"[TOOL] {name}({json.dumps(dict(args))})")
            return result

        return Tool(
            name=name, description=name, parameters={"type": "object"}, risk=risk, handler=handler
        )

    return [
        make("search_knowledge_base", RiskTier.SAFE, "Refunds are allowed within 30 days."),
        make(
            "lookup_order",
            RiskTier.SAFE,
            {"order_id": "ord-42", "customer": "Alice", "amount": 49.99},
        ),
        make("issue_refund", RiskTier.SENSITIVE, {"status": "refunded", "amount": 49.99}),
        make("send_email", RiskTier.SENSITIVE, {"status": "sent"}),
    ]
