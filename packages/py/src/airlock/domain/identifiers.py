"""Distinct identifier types. They are strings at runtime but separate to the
type checker, so a RunId can never be passed where a RequestId is expected.
Identifiers are produced only by the IdGenerator port."""

from typing import NewType

RunId = NewType("RunId", str)
RequestId = NewType("RequestId", str)
ToolCallId = NewType("ToolCallId", str)
