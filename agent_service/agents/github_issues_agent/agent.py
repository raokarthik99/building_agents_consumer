import logging
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI
from google.adk.agents import Agent


from shared.auth import get_supabase_user_id
from shared.composio_mcp import ComposioMCPIntegration, ComposioMCPSettings
from shared.tool_response_utils import normalize_mcp_tool_response_payload
from shared.env import require_env, require_env_with_fallback
from shared.model_provider import resolve_adk_model

load_dotenv()

AGENT_CONTEXT = "github_issues_agent"
AGENT_ROUTE = require_env("GITHUB_ISSUES_AGENT_ROUTE", context=AGENT_CONTEXT)
AGENT_DISPLAY_NAME = require_env(
    "GITHUB_ISSUES_AGENT_DISPLAY_NAME", context=AGENT_CONTEXT)
AGENT_INTERNAL_NAME = require_env(
    "GITHUB_ISSUES_AGENT_INTERNAL_NAME", context=AGENT_CONTEXT)

logger = logging.getLogger(__name__)
_MCP_CONFIG_IDS_ENV = "GITHUB_ISSUES_AGENT_CIO_MCP_CONFIG_IDS"
_TEST_MCP_USER_ENV = "GITHUB_ISSUES_AGENT_CIO_MCP_TEST_USER_ID"
_MODEL_PROVIDER_ENV = "GITHUB_ISSUES_AGENT_MODEL_PROVIDER"
_MODEL_IDENTIFIER_ENV = "GITHUB_ISSUES_AGENT_MODEL"
_DEFAULT_MODEL_PROVIDER_ENV = "DEFAULT_MODEL_PROVIDER"
_DEFAULT_MODEL_ENV = "DEFAULT_MODEL"

composio_integration = ComposioMCPIntegration(
    ComposioMCPSettings(
        agent_context=AGENT_CONTEXT,
        display_name=AGENT_DISPLAY_NAME,
        mcp_config_ids_env=_MCP_CONFIG_IDS_ENV,
        test_user_env=_TEST_MCP_USER_ENV,
    )
)

AGENT_INSTRUCTION = (
    "You are a GitHub issues specialist. Handle issue triage, creation, updates, and summaries."
    f"\n\n{composio_integration.connection_instruction}"
)
_MODEL_IDENTIFIER = require_env_with_fallback(
    _MODEL_IDENTIFIER_ENV,
    _DEFAULT_MODEL_ENV,
    context=AGENT_CONTEXT,
)

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
        user_id_extractor=lambda _: get_supabase_user_id(),
    )


def get_root_agent() -> Agent:
    return Agent(
        name=AGENT_INTERNAL_NAME,
        model=resolve_adk_model(
            _MODEL_IDENTIFIER,
            _MODEL_PROVIDER_ENV,
            _DEFAULT_MODEL_PROVIDER_ENV,
        ),
        description="Agent specialized in managing GitHub issues workflows.",
        instruction=AGENT_INSTRUCTION,
        before_agent_callback=composio_integration.before_agent_callback,
        after_agent_callback=composio_integration.after_agent_callback,
        after_tool_callback=normalize_mcp_tool_response_payload,
    )


root_agent = get_root_agent()
