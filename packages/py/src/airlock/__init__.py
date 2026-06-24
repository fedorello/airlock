"""Airlock public API: domain types, ports, the Agent, and adapters."""

from airlock.application.agent import Agent, AgentDependencies
from airlock.application.gate_policy import RiskBasedGatePolicy
from airlock.application.ports.audit_sink import AuditSink
from airlock.application.ports.clock import Clock
from airlock.application.ports.event_bus import EventHandler, EventPublisher, EventSubscriber
from airlock.application.ports.gate_policy import GateDecisionInput, GatePolicy
from airlock.application.ports.id_generator import IdGenerator
from airlock.application.ports.llm_provider import CompletionRequest, CompletionResult, LlmProvider
from airlock.application.ports.run_store import RunStore
from airlock.core.settings import ProviderName, Settings
from airlock.domain.approval import (
    ApprovalDecision,
    ApprovalRequest,
    ApproveDecision,
    DecisionType,
    EditDecision,
    RejectDecision,
)
from airlock.domain.audit import AuditEvent, AuditEventType
from airlock.domain.conversation import (
    AssistantMessage,
    Message,
    MessageRole,
    ToolMessage,
    UserMessage,
)
from airlock.domain.errors import AirlockError, RunNotFoundError, UnknownToolError
from airlock.domain.events import ApprovalDecidedEvent, EventTopic, RunCompletedEvent
from airlock.domain.identifiers import RequestId, RunId, ToolCallId
from airlock.domain.run import RunState, RunStatus
from airlock.domain.tool import RiskTier, Tool, ToolCall, ToolDefinition, ToolHandler
from airlock.infrastructure.audit.in_memory import InMemoryAuditSink
from airlock.infrastructure.audit.line import LineAuditSink, file_audit_sink, stdout_audit_sink
from airlock.infrastructure.clock import FixedClock, SystemClock
from airlock.infrastructure.events.in_memory import InMemoryEventBus
from airlock.infrastructure.events.redis_event_bus import RedisEventBus
from airlock.infrastructure.ids import SequentialIdGenerator, UuidIdGenerator
from airlock.infrastructure.providers.anthropic import AnthropicOptions, AnthropicProvider
from airlock.infrastructure.providers.fake import FakeLlmProvider, ScriptExhaustedError
from airlock.infrastructure.providers.http import (
    ProviderHttpError,
    ProviderResponseError,
    post_json,
)
from airlock.infrastructure.providers.openai import OpenAiOptions, OpenAiProvider
from airlock.infrastructure.store.in_memory import InMemoryRunStore
from airlock.infrastructure.store.redis_run_store import RedisRunStore
from airlock.interface.approver.approver import Approver, DecisionSource
from airlock.interface.approver.auto_approve import auto_approve_decision_source
from airlock.interface.approver.cli_decision_source import cli_decision_source
from airlock.interface.event_schemas import parse_approval_decided, parse_approval_requested
from airlock.interface.runner import AgentRunner

__all__ = [
    "Agent",
    "AgentDependencies",
    "AgentRunner",
    "AirlockError",
    "AnthropicOptions",
    "AnthropicProvider",
    "ApprovalDecidedEvent",
    "ApprovalDecision",
    "ApprovalRequest",
    "ApproveDecision",
    "Approver",
    "AssistantMessage",
    "AuditEvent",
    "AuditEventType",
    "AuditSink",
    "Clock",
    "CompletionRequest",
    "CompletionResult",
    "DecisionSource",
    "DecisionType",
    "EditDecision",
    "EventHandler",
    "EventPublisher",
    "EventSubscriber",
    "EventTopic",
    "FakeLlmProvider",
    "FixedClock",
    "GateDecisionInput",
    "GatePolicy",
    "IdGenerator",
    "InMemoryAuditSink",
    "InMemoryEventBus",
    "InMemoryRunStore",
    "LineAuditSink",
    "LlmProvider",
    "Message",
    "MessageRole",
    "OpenAiOptions",
    "OpenAiProvider",
    "ProviderHttpError",
    "ProviderName",
    "ProviderResponseError",
    "RedisEventBus",
    "RedisRunStore",
    "RejectDecision",
    "RequestId",
    "RiskBasedGatePolicy",
    "RiskTier",
    "RunCompletedEvent",
    "RunId",
    "RunNotFoundError",
    "RunState",
    "RunStatus",
    "RunStore",
    "ScriptExhaustedError",
    "SequentialIdGenerator",
    "Settings",
    "SystemClock",
    "Tool",
    "ToolCall",
    "ToolCallId",
    "ToolDefinition",
    "ToolHandler",
    "ToolMessage",
    "UnknownToolError",
    "UserMessage",
    "UuidIdGenerator",
    "auto_approve_decision_source",
    "cli_decision_source",
    "file_audit_sink",
    "parse_approval_decided",
    "parse_approval_requested",
    "post_json",
    "stdout_audit_sink",
]
