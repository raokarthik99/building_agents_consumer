import logging
import os
from typing import Optional

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from composio import Composio
from fastapi import FastAPI
from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset

from shared.auth import get_supabase_user_id
from shared.env import require_env
from dotenv import load_dotenv

load_dotenv()

AGENT_CONTEXT = "main_agent"
AGENT_ROUTE = require_env("MAIN_AGENT_ROUTE", context=AGENT_CONTEXT)
AGENT_DISPLAY_NAME = require_env(
    "MAIN_AGENT_DISPLAY_NAME", context=AGENT_CONTEXT)
AGENT_INTERNAL_NAME = require_env(
    "MAIN_AGENT_INTERNAL_NAME", context=AGENT_CONTEXT)

logger = logging.getLogger(__name__)
_TEST_MCP_USER_ENV = "MAIN_AGENT_CIO_MCP_TEST_USER_ID"


def register_agent(app: FastAPI, base_path: str) -> None:
    """
    Attach the agent's FastAPI routes under the provided base path.
    """

    add_adk_fastapi_endpoint(app, _build_adk_agent(), path=base_path)
    logger.info("Mounted %s at %s", AGENT_DISPLAY_NAME, base_path)


def _build_adk_agent() -> ADKAgent:
    return ADKAgent(
        adk_agent=root_agent,
        app_name=AGENT_INTERNAL_NAME,
        session_timeout_seconds=3600,
        use_in_memory_services=True,
    )


def _resolve_mcp_config_id() -> str:
    return require_env("MAIN_AGENT_CIO_MCP_CONFIG_ID", context=AGENT_CONTEXT)


def _resolve_effective_mcp_user_id(user_id_override: Optional[str]) -> str:
    if user_id_override:
        logger.debug("Using Supabase user id from auth context for MCP session.")
        return user_id_override

    fallback_user_id = os.getenv(_TEST_MCP_USER_ENV)
    if fallback_user_id and fallback_user_id.strip():
        logger.debug("Using configured test MCP user id for MCP session.")
        return fallback_user_id.strip()

    raise RuntimeError(
        "Unable to resolve Composio MCP user id. Ensure the request is authenticated, "
        f"or configure '{_TEST_MCP_USER_ENV}' for testing."
    )


def _get_composio_mcp_instance(user_id_override: Optional[str] = None) -> dict:
    composio_client = Composio(api_key=require_env(
        "COMPOSIO_API_KEY", context=AGENT_CONTEXT))
    mcp_user_id = _resolve_effective_mcp_user_id(user_id_override)
    mcp_config_id = _resolve_mcp_config_id()
    instance = composio_client.mcp.generate(
        user_id=mcp_user_id, mcp_config_id=mcp_config_id)
    logger.info("MCP Server URL for %s: %s",
                AGENT_DISPLAY_NAME, instance["url"])
    return instance


def before_agent_callback_inject_user_specific_composio_mcp_tool_set(callback_context: CallbackContext):
    """Inject user-specific Composio MCP toolset once per session.

    Uses callback_context.session.state to gate one-time injection, and
    callback_context.state to persist the flag via ADK event delta.
    """
    agent: Agent = callback_context._invocation_context.agent

    # Namespace the state key to this agent/app so it doesn't clash.
    injected_state_key = f"app:{AGENT_INTERNAL_NAME}:composio_mcp_tools_injected"

    # If already injected for this session, do nothing.
    if callback_context.session.state.get(injected_state_key):
        logger.debug("MCP tools already injected for this session; skipping.")
        return None

    # Resolve MCP server instance and append toolset.
    request_user_id = get_supabase_user_id()
    mcp_server_instance = _get_composio_mcp_instance(
        user_id_override=request_user_id
    )
    tools_to_append = [
        McpToolset(
            connection_params=StreamableHTTPConnectionParams(
                url=mcp_server_instance["url"],
            ),
        ),
    ]

    agent.tools = agent.tools + tools_to_append

    # Persist that we've injected for this session using delta-aware state.
    callback_context.state[injected_state_key] = True
    logger.info(
        "Injected MCP tools for session and set state flag '%s'", injected_state_key)


def get_root_agent() -> Agent:
    return Agent(
        name=AGENT_INTERNAL_NAME,
        model="gemini-2.5-flash",
        description="Agent specialized in managing GitHub issues workflows.",
        instruction=(
            """You are a GitHub issues specialist. Handle issue triage, creation, updates, and summaries.
If the user has not connected their account for the required tool, automatically initiate an initialize connection
request when possible, and do not return control to the user until you have attempted that connection workflow."""
        ),
        before_agent_callback=before_agent_callback_inject_user_specific_composio_mcp_tool_set
    )


root_agent = get_root_agent()
