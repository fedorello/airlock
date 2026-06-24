"""A scripted, no-network LLM provider for deterministic tests and demos."""

from collections.abc import Sequence

from airlock.application.ports.llm_provider import CompletionRequest, CompletionResult


class ScriptExhaustedError(Exception):
    """Raised when the fake is called more times than it was scripted for."""

    def __init__(self) -> None:
        super().__init__(
            "FakeLlmProvider script exhausted: more completions were requested than provided"
        )


class FakeLlmProvider:
    """Returns scripted completions in order, one per call."""

    def __init__(self, script: Sequence[CompletionResult]) -> None:
        self._script = list(script)
        self._call_index = 0

    async def complete(self, request: CompletionRequest) -> CompletionResult:
        if self._call_index >= len(self._script):
            raise ScriptExhaustedError
        result = self._script[self._call_index]
        self._call_index += 1
        return result
