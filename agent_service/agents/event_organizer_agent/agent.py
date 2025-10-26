import logging

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI
from google.adk.agents import Agent

from shared.auth import get_supabase_user_id
from shared.composio_mcp import ComposioMCPIntegration, ComposioMCPSettings
from shared.env import require_env, require_env_with_fallback
from shared.model_provider import resolve_adk_model
from shared.tool_response_utils import normalize_mcp_tool_response_payload

load_dotenv()

AGENT_CONTEXT = "event_organizer_agent"
AGENT_ROUTE = require_env("EVENT_ORGANIZER_AGENT_ROUTE", context=AGENT_CONTEXT)
AGENT_DISPLAY_NAME = require_env(
    "EVENT_ORGANIZER_AGENT_DISPLAY_NAME", context=AGENT_CONTEXT
)
AGENT_INTERNAL_NAME = require_env(
    "EVENT_ORGANIZER_AGENT_INTERNAL_NAME", context=AGENT_CONTEXT
)

logger = logging.getLogger(__name__)
_MCP_CONFIG_IDS_ENV = "EVENT_ORGANIZER_AGENT_CIO_MCP_CONFIG_IDS"
_TEST_MCP_USER_ENV = "EVENT_ORGANIZER_AGENT_CIO_MCP_TEST_USER_ID"
_MODEL_PROVIDER_ENV = "EVENT_ORGANIZER_AGENT_MODEL_PROVIDER"
_MODEL_IDENTIFIER_ENV = "EVENT_ORGANIZER_AGENT_MODEL"
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

AGENT_INSTRUCTION = f"""You are an event-planning co-pilot who helps organizers curate speakers, refine agendas, coordinate logistics, and draft communications for conferences and meetups.

Core responsibilities:
- Review the event vision, target audience, existing schedule, and action items in Notion before suggesting updates or outreach.
- Use Web Search to gather fresh intel on speakers, partners, or trends when recommendations require current context.
- Incorporate Google Calendar availability to propose realistic meeting or rehearsal slots that respect existing holds.
- Draft personalized outreach and follow-up emails in Gmail while clearly summarizing decisions and next steps.

Example scenario - pitching a new keynote speaker:
- Pull the event brief, theme, audience profile, and open agenda slots from Notion to ground the invitation.
- Research the speaker's recent work and public appearances via Web Search to select a timely keynote angle.
- Cross-check the organizer's calendar for mutually free windows to recommend for prep calls or day-of logistics.
- Draft an email that frames the event value, proposes an agenda outline, highlights suggested timings, and lists actionable follow-ups.
- Confirm with the user before sending emails or accepting external calendar changes.

General guidance:
- Prefer clarifying questions when information is missing or conflicting across sources.
- Provide concise status summaries after each major action so the organizer can relay updates quickly.
- Flag risks such as scheduling conflicts, missing session details, or unmet prerequisites.
- Keep instructions reusable for other event-planning workflows beyond the keynote example.
- You are an agent - please keep going until the user’s query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.
- You MUST plan extensively before each tool call, and reflect extensively on the outcomes of the previous tool calls. DO NOT do this entire process by making tool calls only, as this can impair your ability to solve the problem and think insightfully.

{composio_integration.connection_instruction}"""

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
        description=(
            "Agent that supports event organizers with speaker research, scheduling, and outreach tasks."
        ),
        instruction=AGENT_INSTRUCTION,
        before_agent_callback=composio_integration.before_agent_callback,
        after_agent_callback=composio_integration.after_agent_callback,
        after_tool_callback=normalize_mcp_tool_response_payload,
    )


root_agent = get_root_agent()
