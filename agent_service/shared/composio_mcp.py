import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, Optional, Sequence

from composio import Composio
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.mcp_tool.mcp_session_manager import (
    StreamableHTTPConnectionParams,
)
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.tool_context import ToolContext

from .auth import get_supabase_user_id
from .env import require_env

logger = logging.getLogger(__name__)


def _default_user_id_resolver() -> Optional[str]:
    return get_supabase_user_id()


@dataclass(frozen=True)
class ComposioMCPSettings:
    """
    Configuration describing how an agent should integrate with Composio MCP.

    Specify `mcp_config_ids_env` to indicate the environment variable that stores
    one or more Composio MCP config identifiers (comma or whitespace separated).
    """

    agent_context: str
    display_name: str
    mcp_config_ids_env: str
    test_user_env: str
    composio_api_key_env: str = "COMPOSIO_API_KEY"
    initiate_connection_tool_name: str = "COMPOSIO_INITIATE_CONNECTION"


def composio_connection_instruction(initiate_connection_tool_name: str) -> str:
    """
    Provide the canonical instruction block for handling missing Composio connections.
    """
    return (
        "Composio connection protocol:\n"
        "1. Call the required Composio business tool directly; do not run 'COMPOSIO_CHECK_ACTIVE_CONNECTION' beforehand.\n"
        f"2. If the business tool reports the user is not connected, immediately call '{initiate_connection_tool_name}' to launch the connection flow.\n"
        "3. Tell the user you have initiated the request and that they must finish linking before you can proceed.\n"
        "4. Wait for confirmation that the connection succeeded, then resume the original task and retry the original Composio tool.\n"
        "5. Format any connection links you share as markdown links like [title](url) rather than exposing raw URLs.\n"
        "Do not ignore missing connections or attempt further Composio calls until the link is established."
    )


class ComposioMCPIntegration:
    """
    Reusable Composio MCP lifecycle hooks that can be attached to any agent.
    """

    def __init__(
        self,
        settings: ComposioMCPSettings,
        *,
        user_id_resolver: Callable[[], Optional[str]
                                   ] = _default_user_id_resolver,
    ) -> None:
        self._settings = settings
        self._user_id_resolver = user_id_resolver
        config_ids_env = settings.mcp_config_ids_env.strip()
        if not config_ids_env:
            raise ValueError(
                "ComposioMCPSettings.mcp_config_ids_env must be a non-empty environment variable name"
            )
        self._config_ids_env = config_ids_env

    @property
    def connection_instruction(self) -> str:
        """
        Canonical prompt fragment describing how to handle missing Composio connections.
        """
        return composio_connection_instruction(
            self._settings.initiate_connection_tool_name
        )

    def before_agent_callback(self, callback_context: CallbackContext) -> None:
        agent = callback_context._invocation_context.agent
        invocation_id = callback_context._invocation_context.invocation_id

        if self._has_invocation_toolset(agent.tools, invocation_id):
            logger.debug(
                "MCP tools already injected for invocation %s; skipping.",
                invocation_id,
            )
            return

        user_id_override = self._user_id_resolver()
        toolsets = self._create_toolsets(invocation_id, user_id_override)
        if not toolsets:
            return

        agent.tools = agent.tools + toolsets
        logger.info(
            "Injected %d Composio MCP toolset(s) for %s invocation %s",
            len(toolsets),
            self._settings.display_name,
            invocation_id,
        )

    def _create_toolsets(
        self,
        invocation_id: str,
        user_id_override: Optional[str],
    ):
        toolsets = []
        for config_label, config_id, instance in self._generate_composio_mcp_instances(
            user_id_override
        ):
            toolset = McpToolset(
                connection_params=StreamableHTTPConnectionParams(
                    url=instance["url"],
                )
            )
            setattr(toolset, "_composio_owner_invocation_id", invocation_id)
            setattr(toolset, "_composio_config_label", config_label)
            setattr(toolset, "_composio_config_id", config_id)
            toolsets.append(toolset)
        return toolsets

    async def after_agent_callback(self, callback_context: CallbackContext) -> None:
        agent = callback_context._invocation_context.agent
        invocation_id = callback_context._invocation_context.invocation_id

        owned_toolsets = list(
            self._iter_invocation_toolsets(agent.tools, invocation_id)
        )
        if not owned_toolsets:
            return

        agent.tools = [
            tool for tool in agent.tools if tool not in owned_toolsets
        ]

        for toolset in owned_toolsets:
            try:
                await toolset.close()
            except Exception:  # pragma: no cover - defensive cleanup
                logger.exception(
                    "Failed to close Composio MCP toolset for invocation %s",
                    invocation_id,
                )

        logger.info(
            "Closed %d Composio MCP toolset(s) for %s invocation %s",
            len(owned_toolsets),
            self._settings.display_name,
            invocation_id,
        )

    def normalize_initiate_connection_response(
        self,
        tool: BaseTool,
        args: Dict[str, Any],
        tool_context: ToolContext,
        tool_response: Any,
    ) -> Optional[Dict[str, Any]]:
        if (
            tool.name != self._settings.initiate_connection_tool_name
            or tool_response is None
        ):
            return None

        payload = self._extract_structured_payload(tool_response)
        if payload is None:
            logger.warning(
                "Unable to normalize response from %s tool; leaving response untouched",
                self._settings.initiate_connection_tool_name,
            )
            return None

        return payload

    def _generate_composio_mcp_instances(
        self,
        user_id_override: Optional[str],
    ):
        composio_client = Composio(
            api_key=require_env(
                self._settings.composio_api_key_env,
                context=self._settings.agent_context,
            )
        )

        user_id = self._resolve_effective_user_id(user_id_override)

        for label, config_id in self._iter_config_ids():
            instance = composio_client.mcp.generate(
                user_id=user_id,
                mcp_config_id=config_id,
            )
            logger.info(
                "MCP Server URL for %s (config %s): %s",
                self._settings.display_name,
                label,
                instance.get("url"),
            )
            yield label, config_id, instance

    def _resolve_effective_user_id(
        self,
        user_id_override: Optional[str],
    ) -> str:
        if user_id_override:
            logger.debug(
                "Using Supabase user id from auth context for MCP session.",
            )
            return user_id_override

        fallback_user_id = os.getenv(self._settings.test_user_env)
        if fallback_user_id and fallback_user_id.strip():
            logger.debug("Using configured test MCP user id for MCP session.")
            return fallback_user_id.strip()

        raise RuntimeError(
            "Unable to resolve Composio MCP user id. Ensure the request is authenticated, "
            f"or configure '{self._settings.test_user_env}' for testing.",
        )

    def _has_invocation_toolset(
        self,
        tools: Sequence[Any],
        invocation_id: str,
    ) -> bool:
        return any(
            isinstance(tool, McpToolset)
            and getattr(tool, "_composio_owner_invocation_id", None)
            == invocation_id
            for tool in tools
        )

    def _iter_invocation_toolsets(
        self,
        tools: Iterable[Any],
        invocation_id: str,
    ):
        for tool in tools:
            if (
                isinstance(tool, McpToolset)
                and getattr(tool, "_composio_owner_invocation_id", None)
                == invocation_id
            ):
                yield tool

    def _extract_structured_payload(
        self,
        raw_response: Any,
    ) -> Optional[Dict[str, Any]]:
        response_candidate = raw_response

        if isinstance(raw_response, dict):
            candidate_from_result = raw_response.get("result")
            if isinstance(candidate_from_result, dict):
                return candidate_from_result
            if candidate_from_result is not None:
                response_candidate = candidate_from_result
            else:
                return raw_response

        try:
            from mcp.types import CallToolResult
        except Exception:  # pragma: no cover - MCP library always available in runtime
            CallToolResult = None  # type: ignore[assignment]

        if CallToolResult and isinstance(response_candidate, CallToolResult):
            if response_candidate.structuredContent:
                structured = response_candidate.structuredContent
                if isinstance(structured, dict):
                    return structured

            for block in response_candidate.content:
                text_value = getattr(block, "text", None)
                if text_value:
                    parsed = self._try_parse_json(text_value)
                    if parsed is not None:
                        return parsed
            return None

        if isinstance(response_candidate, str):
            return self._try_parse_json(response_candidate)

        return None

    def _try_parse_json(self, serialized: str) -> Optional[Dict[str, Any]]:
        try:
            parsed = json.loads(serialized)
        except json.JSONDecodeError:
            logger.debug(
                "Failed to parse JSON payload from tool response text")
            return None
        return parsed if isinstance(parsed, dict) else None

    def _iter_config_ids(self):
        raw_value = require_env(
            self._config_ids_env,
            context=self._settings.agent_context,
        )
        candidates = [
            part.strip()
            for part in re.split(r"[,\s]+", raw_value)
            if part and part.strip()
        ]

        if not candidates:
            raise RuntimeError(
                f"Environment variable '{self._config_ids_env}' must contain at least one Composio MCP config id."
            )

        for index, config_id in enumerate(candidates, start=1):
            yield f"{self._config_ids_env}[{index}]", config_id


__all__ = [
    "ComposioMCPIntegration",
    "ComposioMCPSettings",
    "composio_connection_instruction",
]
