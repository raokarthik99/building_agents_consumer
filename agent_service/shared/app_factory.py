import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI

from .agent_loader import discover_agents
from .auth import SupabaseAuthMiddleware
from .settings import load_supabase_auth_settings

logger = logging.getLogger(__name__)


def create_app(
    *,
    agents_root: Optional[Path] = None,
    base_route: str = "/agents",
    title: str = "Agent Gateway",
    description: Optional[str] = None,
) -> FastAPI:
    """
    Construct a FastAPI application with shared authentication and agent routing.

    Args:
        agents_root: Root directory where agent subpackages live. Defaults to the parent
            directory containing the `shared` module.
        base_route: Common prefix applied to every agent endpoint.
        title: FastAPI application title.
        description: Optional FastAPI application description.
    """

    if agents_root is None:
        agents_root = Path(__file__).resolve().parent.parent

    route_prefix = _normalize_base_route(base_route)
    settings = load_supabase_auth_settings()

    app = FastAPI(title=title, description=description)

    app.add_middleware(
        SupabaseAuthMiddleware,
        supabase_url=settings.supabase_url,
        supabase_api_key=settings.supabase_api_key,
        supabase_jwt_secret=settings.supabase_jwt_secret,
        required_audiences=settings.jwt_audience,
        issuer=settings.jwt_issuer,
        exclude_paths=settings.auth_exclude_paths,
        http_timeout=settings.http_timeout,
    )

    @app.get("/healthz", include_in_schema=False)
    async def healthcheck():
        return {"status": "ok"}

    descriptors = discover_agents(agents_root)
    app.state.agent_registry = []

    for descriptor in descriptors:
        mount_path = f"{route_prefix}/{descriptor.slug}"
        descriptor.registrar(app, mount_path)
        app.state.agent_registry.append(
            {"slug": descriptor.slug, "display_name": descriptor.display_name, "path": mount_path}
        )
        logger.info("Registered agent '%s' at %s", descriptor.display_name, mount_path)

    return app


def _normalize_base_route(base_route: str) -> str:
    cleaned = base_route.strip()
    if not cleaned:
        cleaned = "/agents"
    if not cleaned.startswith("/"):
        cleaned = f"/{cleaned}"
    cleaned = cleaned.rstrip("/")
    return cleaned or "/agents"
