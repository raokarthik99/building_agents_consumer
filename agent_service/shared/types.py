from dataclasses import dataclass
from typing import Callable

from fastapi import FastAPI

AgentRegistrar = Callable[[FastAPI, str], None]


@dataclass(frozen=True)
class AgentDescriptor:
    """
    Metadata describing an agent module that can be mounted onto the shared app.

    Attributes:
        slug: URL-safe identifier used to construct the mount path.
        registrar: Callable responsible for attaching routes to the FastAPI app.
        display_name: Human friendly name for observability/logging purposes.
    """

    slug: str
    registrar: AgentRegistrar
    display_name: str
