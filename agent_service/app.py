import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

from shared import create_app


def _resolve_log_level(value: str) -> int:
    level_name = value.strip().upper()
    return getattr(logging, level_name, logging.INFO)


load_dotenv()

logging.basicConfig(level=_resolve_log_level(os.getenv("LOG_LEVEL", "INFO")))

AGENTS_ROOT = Path(__file__).resolve().parent / "agents"
ROUTE_PREFIX = os.getenv("AGENT_ROUTE_PREFIX", "/agents")
APP_TITLE = os.getenv("AGENT_APP_TITLE", "Agent Gateway")
APP_DESCRIPTION: Optional[str] = os.getenv("AGENT_APP_DESCRIPTION")

app = create_app(
    agents_root=AGENTS_ROOT,
    base_route=ROUTE_PREFIX,
    title=APP_TITLE,
    description=APP_DESCRIPTION,
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
    )
