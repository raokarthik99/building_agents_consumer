"""
Helpers for resolving model providers and constructing ADK model instances.
"""

from __future__ import annotations

import os
from typing import Any

from google.adk.models.lite_llm import LiteLlm


def resolve_model_provider(
    provider_env: str,
    default_provider_env: str,
    *,
    fallback_provider: str = "LITELLM",
) -> str:
    """
    Resolve the agent-specific model provider, normalizing whitespace and casing.
    """

    provider = os.getenv(provider_env)
    if provider:
        trimmed = provider.strip()
        if trimmed:
            return trimmed.upper()

    default_provider = os.getenv(default_provider_env)
    if default_provider:
        trimmed = default_provider.strip()
        if trimmed:
            return trimmed.upper()

    return fallback_provider


def resolve_adk_model(
    model_identifier: str,
    provider_env: str,
    default_provider_env: str,
    *,
    fallback_provider: str = "LITELLM",
    google_provider: str = "GOOGLE",
) -> Any:
    """
    Resolve the ADK model configuration for an agent based on environment settings.
    """

    provider = resolve_model_provider(
        provider_env, default_provider_env, fallback_provider=fallback_provider
    )
    if provider == google_provider:
        return model_identifier
    return LiteLlm(model=model_identifier)
