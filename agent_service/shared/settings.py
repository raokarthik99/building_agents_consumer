import os
from typing import Iterable, List, Optional, Sequence

from pydantic import BaseModel, Field, ValidationError, validator


def _normalize_list(value: Optional[Iterable[str]]) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        items = [item.strip() for item in value.split(",")]
    else:
        items = [str(item).strip() for item in value]
    return [item for item in items if item]


class SupabaseAuthSettings(BaseModel):
    """
    Configuration required to initialize the Supabase authentication middleware.
    """

    supabase_url: str = Field(..., alias="url")
    supabase_api_key: Optional[str] = Field(default=None, alias="api_key")
    supabase_jwt_secret: str = Field(..., alias="jwt_secret")
    jwt_audience: Optional[List[str]] = Field(default=None)
    jwt_issuer: Optional[str] = Field(default=None)
    auth_exclude_paths: List[str] = Field(default_factory=lambda: ["/healthz"])
    http_timeout: float = Field(default=3.0, gt=0)

    @validator("jwt_audience", pre=True)
    def _parse_audience(cls, value: Optional[Sequence[str]]) -> Optional[List[str]]:
        items = _normalize_list(value)
        return items or None

    @validator("auth_exclude_paths", pre=True)
    def _parse_exclude_paths(cls, value: Optional[Sequence[str]]) -> List[str]:
        items = _normalize_list(value)
        if not items:
            items = ["/healthz"]
        elif "/healthz" not in items:
            items.append("/healthz")
        # Preserve order while de-duplicating.
        seen = set()
        deduped: List[str] = []
        for item in items:
            if item not in seen:
                seen.add(item)
                deduped.append(item)
        return deduped


def load_supabase_auth_settings() -> SupabaseAuthSettings:
    """
    Load and validate Supabase authentication settings from environment variables.

    Expected environment variables:
        SUPABASE_URL (required)
        SUPABASE_API_KEY (optional)
        SUPABASE_JWT_SECRET (required for HS256 tokens)
        SUPABASE_JWT_AUDIENCE (optional, comma separated)
        SUPABASE_JWT_ISSUER (optional)
        SUPABASE_AUTH_EXCLUDE_PATHS (optional, comma separated)
        SUPABASE_AUTH_HTTP_TIMEOUT (optional, seconds)
    """

    raw_config = {
        "url": os.getenv("SUPABASE_URL"),
        "api_key": os.getenv("SUPABASE_API_KEY"),
        "jwt_secret": os.getenv("SUPABASE_JWT_SECRET"),
        "jwt_audience": os.getenv("SUPABASE_JWT_AUDIENCE"),
        "jwt_issuer": os.getenv("SUPABASE_JWT_ISSUER"),
        "auth_exclude_paths": os.getenv("SUPABASE_AUTH_EXCLUDE_PATHS"),
        "http_timeout": os.getenv("SUPABASE_AUTH_HTTP_TIMEOUT"),
    }
    # Drop unset values so Pydantic falls back to defaults (e.g. http_timeout).
    filtered_config = {key: value for key, value in raw_config.items() if value is not None}
    try:
        return SupabaseAuthSettings(**filtered_config)
    except ValidationError as exc:
        raise RuntimeError(
            "Invalid Supabase authentication configuration. Please verify environment variables."
        ) from exc
