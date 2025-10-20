import importlib.util
import logging
import re
from pathlib import Path
from types import ModuleType
from typing import Iterable, List, Optional, Sequence

from .types import AgentDescriptor, AgentRegistrar

logger = logging.getLogger(__name__)

_DEFAULT_IGNORE: Sequence[str] = ("shared", "__pycache__")
_SLUG_SAFE_PATTERN = re.compile(r"[^a-z0-9\-]")


def discover_agents(root: Path, ignore: Iterable[str] = _DEFAULT_IGNORE) -> List[AgentDescriptor]:
    """
    Locate agent modules within the given root directory.

    Each agent must expose:
        - AGENT_DISPLAY_NAME (optional, falls back to directory name)
        - AGENT_ROUTE or AGENT_SLUG (optional, falls back to normalized directory name)
        - register_agent(app: FastAPI, base_path: str)
    """

    ignore_set = {entry.lower() for entry in ignore}
    descriptors: List[AgentDescriptor] = []

    if not root.exists() or not root.is_dir():
        raise RuntimeError(f"Agent root directory does not exist: {root}")

    for entry in sorted(root.iterdir()):
        if not entry.is_dir():
            continue
        if entry.name.lower() in ignore_set or entry.name.startswith("."):
            continue

        agent_module_path = entry / "agent.py"
        if not agent_module_path.exists():
            continue

        module = _load_module(agent_module_path, package=f"agents.{entry.name}")
        descriptors.append(_build_descriptor(module=module, fallback_slug=entry.name))

    if not descriptors:
        logger.warning("No agents discovered under %s", root)

    return descriptors


def _load_module(agent_path: Path, package: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(f"{package}.agent", agent_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load agent module from {agent_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _build_descriptor(module: ModuleType, fallback_slug: str) -> AgentDescriptor:
    slug = _sanitize_slug(
        getattr(module, "AGENT_ROUTE", None)
        or getattr(module, "AGENT_SLUG", None)
        or fallback_slug
    )
    display_name = getattr(module, "AGENT_DISPLAY_NAME", slug)

    registrar: Optional[AgentRegistrar] = getattr(module, "register_agent", None)
    if registrar is None or not callable(registrar):
        raise AttributeError(f"Agent module {module.__name__} is missing a callable register_agent()")

    return AgentDescriptor(slug=slug, registrar=registrar, display_name=display_name)


def _sanitize_slug(raw_slug: str) -> str:
    normalized = raw_slug.strip().lower().replace("_", "-")
    normalized = _SLUG_SAFE_PATTERN.sub("-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    if not normalized:
        raise ValueError(f"Agent route '{raw_slug}' normalizes to an empty slug.")
    return normalized
