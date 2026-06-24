"""Tests for environment-driven settings."""

import os

import pytest
from pydantic import ValidationError

from airlock import ProviderName, Settings


@pytest.fixture(autouse=True)
def _clear_airlock_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in list(os.environ):
        if key.startswith("AIRLOCK_"):
            monkeypatch.delenv(key, raising=False)


def test_reads_full_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AIRLOCK_PROVIDER", "openai")
    monkeypatch.setenv("AIRLOCK_MODEL", "gpt-x")
    monkeypatch.setenv("AIRLOCK_API_KEY", "secret")
    monkeypatch.setenv("AIRLOCK_REDIS_URL", "redis://r:6379")

    settings = Settings()

    assert settings.provider == ProviderName.OPENAI
    assert settings.model == "gpt-x"
    assert settings.api_key == "secret"
    assert settings.redis_url == "redis://r:6379"


def test_applies_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AIRLOCK_MODEL", "claude-x")
    monkeypatch.setenv("AIRLOCK_API_KEY", "k")

    settings = Settings()

    assert settings.provider == ProviderName.ANTHROPIC
    assert settings.redis_url == "redis://localhost:6379"
    assert settings.base_url is None


def test_missing_required_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AIRLOCK_API_KEY", "k")

    with pytest.raises(ValidationError):
        Settings()


def test_unknown_provider_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AIRLOCK_PROVIDER", "gemini")
    monkeypatch.setenv("AIRLOCK_MODEL", "m")
    monkeypatch.setenv("AIRLOCK_API_KEY", "k")

    with pytest.raises(ValidationError):
        Settings()
