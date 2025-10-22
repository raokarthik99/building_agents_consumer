import os
from dataclasses import dataclass
from typing import Dict, Iterable, Tuple


def require_env(var_name: str, *, context: str) -> str:
    """
    Retrieve a required environment variable, raising an informative error if missing.
    """

    value = os.getenv(var_name)
    if value:
        return value
    raise RuntimeError(
        f"Environment variable '{var_name}' must be set to initialize {context}."
    )


def require_env_with_fallback(
    primary_var: str,
    fallback_var: str,
    *,
    context: str,
) -> str:
    """
    Resolve an environment variable, falling back to a shared default if provided.
    """

    primary_value = os.getenv(primary_var)
    if primary_value:
        return primary_value

    fallback_value = os.getenv(fallback_var)
    if fallback_value:
        return fallback_value

    raise RuntimeError(
        f"Environment variable '{primary_var}' must be set to initialize {context}. "
        f"You may also set '{fallback_var}' as a shared default."
    )


def resolve_required_pair(
    first_var: str,
    second_var: str,
    *,
    context: str,
) -> Tuple[str, str]:
    """
    Resolve two required environment variables that must both be present.
    """

    return (
        require_env(first_var, context=context),
        require_env(second_var, context=context),
    )


@dataclass(frozen=True)
class EnvVarSpec:
    name: str
    description: str
    required: bool = False


SHARED_ENVIRONMENT_VARIABLES: Tuple[EnvVarSpec, ...] = (
    EnvVarSpec(
        name="DEFAULT_MODEL_PROVIDER",
        description="Fallback model provider (e.g. GOOGLE or LITELLM) used by agents without overrides.",
    ),
    EnvVarSpec(
        name="DEFAULT_MODEL",
        description="Fallback model identifier shared across agents.",
    ),
    EnvVarSpec(
        name="SUPABASE_URL",
        description="Base URL of the Supabase project used for authentication.",
        required=True,
    ),
    EnvVarSpec(
        name="SUPABASE_API_KEY",
        description="Supabase anon or service role key used when calling Supabase Auth APIs.",
    ),
    EnvVarSpec(
        name="SUPABASE_JWT_SECRET",
        description="Supabase JWT secret (required when Supabase issues HS256 tokens).",
        required=True,
    ),
    EnvVarSpec(
        name="SUPABASE_JWT_AUDIENCE",
        description="Comma-separated list of accepted JWT audiences for Supabase tokens.",
    ),
    EnvVarSpec(
        name="SUPABASE_JWT_ISSUER",
        description="Expected issuer (`iss`) claim for Supabase JWT tokens.",
    ),
    EnvVarSpec(
        name="SUPABASE_AUTH_EXCLUDE_PATHS",
        description="Comma-separated list of routes that bypass Supabase JWT enforcement.",
    ),
    EnvVarSpec(
        name="SUPABASE_AUTH_HTTP_TIMEOUT",
        description="Timeout (seconds) for Supabase user validation HTTP requests.",
    ),
)


def iter_shared_env_specs() -> Iterable[EnvVarSpec]:
    """
    Iterate over environment variables consumed by shared infrastructure.
    """

    return SHARED_ENVIRONMENT_VARIABLES


def map_shared_env_specs() -> Dict[str, EnvVarSpec]:
    """
    Convenience helper returning a mapping of shared environment variables.
    """

    return {spec.name: spec for spec in SHARED_ENVIRONMENT_VARIABLES}
