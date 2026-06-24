"""Validated configuration, read from AIRLOCK_-prefixed environment variables."""

from enum import StrEnum

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_REDIS_URL = "redis://localhost:6379"
_DEFAULT_SYSTEM_PROMPT = "You are a helpful, careful assistant."


class ProviderName(StrEnum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AIRLOCK_", protected_namespaces=())

    provider: ProviderName = ProviderName.ANTHROPIC
    model: str
    api_key: str
    base_url: str | None = None
    redis_url: str = _DEFAULT_REDIS_URL
    system_prompt: str = _DEFAULT_SYSTEM_PROMPT
