import logging
from functools import lru_cache
from typing import Tuple

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from composio import Composio
from fastapi import FastAPI
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset

from shared.env import require_env, resolve_required_pair
from dotenv import load_dotenv

load_dotenv()

AGENT_CONTEXT = "main_agent"
AGENT_ROUTE = require_env("MAIN_AGENT_ROUTE", context=AGENT_CONTEXT)
AGENT_DISPLAY_NAME = require_env("MAIN_AGENT_DISPLAY_NAME", context=AGENT_CONTEXT)
AGENT_INTERNAL_NAME = require_env("MAIN_AGENT_INTERNAL_NAME", context=AGENT_CONTEXT)

logger = logging.getLogger(__name__)


def register_agent(app: FastAPI, base_path: str) -> None:
    """
    Attach the agent's FastAPI routes under the provided base path.
    """

    add_adk_fastapi_endpoint(app, _build_adk_agent(), path=base_path)
    logger.info("Mounted %s at %s", AGENT_DISPLAY_NAME, base_path)


@lru_cache(maxsize=1)
def _build_adk_agent() -> ADKAgent:
    mcp_user_id, _ = _resolve_mcp_identifiers()
    return ADKAgent(
        adk_agent=root_agent,
        app_name=AGENT_INTERNAL_NAME,
        user_id=mcp_user_id,
        session_timeout_seconds=3600,
        use_in_memory_services=True,
    )


@lru_cache(maxsize=1)
def _resolve_mcp_identifiers() -> Tuple[str, str]:
    return resolve_required_pair(
        "MAIN_AGENT_CIO_MCP_USER_ID",
        "MAIN_AGENT_CIO_MCP_CONFIG_ID",
        context=AGENT_CONTEXT,
    )


@lru_cache(maxsize=1)
def _get_mcp_instance() -> dict:
    composio_client = Composio(api_key=require_env("COMPOSIO_API_KEY", context=AGENT_CONTEXT))
    mcp_user_id, mcp_config_id = _resolve_mcp_identifiers()
    instance = composio_client.mcp.generate(user_id=mcp_user_id, mcp_config_id=mcp_config_id)
    logger.info("MCP Server URL for %s: %s", AGENT_DISPLAY_NAME, instance["url"])
    return instance


@lru_cache(maxsize=1)
def get_root_agent() -> Agent:
    instance = _get_mcp_instance()
    return Agent(
        name=AGENT_INTERNAL_NAME,
        model="gemini-2.5-pro",
        description="Agent specialized in managing GitHub issues workflows.",
        instruction=(
            "You are a GitHub issues specialist. Handle issue triage, creation, updates, and summaries. "
            "If user has not connected account yet for the given tool, automatically initiate an initialize "
            "connection request if possible and available/applicable for that tool."
        ),
        tools=[
            McpToolset(
                connection_params=StreamableHTTPConnectionParams(
                    url=instance["url"],
                ),
            ),
        ],
    )


root_agent = get_root_agent()
