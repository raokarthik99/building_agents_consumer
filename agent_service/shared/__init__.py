"""
Shared utilities for building FastAPI-based agent services.

This package hosts authentication middleware, configuration helpers,
and dynamic agent discovery logic that are reused across individual agent
implementations.
"""

from .app_factory import create_app
from .env import require_env, resolve_required_pair
from .settings import SupabaseAuthSettings, load_supabase_auth_settings

__all__ = [
    "create_app",
    "require_env",
    "resolve_required_pair",
    "SupabaseAuthSettings",
    "load_supabase_auth_settings",
]
