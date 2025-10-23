import json
import logging
from typing import Any, Dict, Optional, Union

logger = logging.getLogger(__name__)


def extract_structured_payload(raw_response: Any) -> Union[Dict[str, Any], str, None]:
    """
    Extract a structured dictionary payload from an MCP CallToolResult.

    Behavior:
    - If `raw_response` is an `mcp.types.CallToolResult`, prefer `structuredContent`
      when it is a dict; otherwise, attempt to parse any text content blocks as JSON
      and return the first parsed dict.
    - For all other types, return None.
    """
    try:
        from mcp.types import CallToolResult  # type: ignore
    except Exception:  # pragma: no cover - MCP library always available in runtime
        CallToolResult = None  # type: ignore[assignment]

    if CallToolResult and isinstance(raw_response, CallToolResult):
        # Attempt to parse any text content blocks as JSON dicts; otherwise return raw text
        for block in getattr(raw_response, "content", []) or []:
            text_value = getattr(block, "text", None)
            if text_value:
                parsed = _try_parse_json(text_value)
                if isinstance(parsed, dict):
                    return parsed
                # Fallback to raw string content
                return text_value
        return None

    # Many runtimes surface tool responses as plain dicts with nested
    # content/parts/... structures where leaf nodes contain {"type": "text", "text": "..."}
    if isinstance(raw_response, dict):
        text_value = _find_first_text_value(raw_response)
        if text_value is not None:
            parsed = _try_parse_json(text_value)
            if isinstance(parsed, dict):
                return parsed
            return text_value
        return None

    return None


def _find_first_text_value(obj: Any) -> Optional[str]:
    """Depth-first search for the first string under a 'text' field.

    Handles nested dict/list structures commonly found in tool responses
    (e.g., content -> parts -> functionResponse -> response -> result -> content -> [{text}]).
    """
    try:
        # Direct dict access
        if isinstance(obj, dict):
            if isinstance(obj.get("text"), str):
                return obj["text"]
            # Prefer conventional containers first
            for key in ("content", "parts", "response", "result", "functionResponse"):
                if key in obj:
                    found = _find_first_text_value(obj[key])
                    if found is not None:
                        return found
            # Fallback: scan remaining values
            for v in obj.values():
                found = _find_first_text_value(v)
                if found is not None:
                    return found
        # Lists/tuples
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                found = _find_first_text_value(item)
                if found is not None:
                    return found
        # Objects with 'text' attribute
        else:
            text_attr = getattr(obj, "text", None)
            if isinstance(text_attr, str):
                return text_attr
            content_attr = getattr(obj, "content", None)
            if content_attr is not None:
                return _find_first_text_value(content_attr)
    except Exception:
        # Defensive: never throw from extraction
        return None
    return None


def normalize_mcp_tool_response_payload(
    tool: Any,
    args: Dict[str, Any],
    tool_context: Any,
    tool_response: Any,
) -> Optional[Union[Dict[str, Any], str]]:
    """
    Generic after_tool_callback to normalize any tool response into a dict payload
    or a plain string.

    Returns a dict or string to override the raw tool response if normalization
    succeeds; otherwise returns None to keep the original response unchanged.
    """
    payload = extract_structured_payload(tool_response)
    return payload


def _try_parse_json(serialized: str) -> Union[Dict[str, Any], str]:
    try:
        parsed = json.loads(serialized)
    except json.JSONDecodeError:
        logger.debug("Failed to parse JSON payload from tool response text")
        return serialized
    return parsed if isinstance(parsed, dict) else serialized


__all__ = [
    "extract_structured_payload",
    "normalize_mcp_tool_response_payload",
]
