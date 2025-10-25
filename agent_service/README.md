# Agent Service

## Overview

Agent Service is a FastAPI gateway that mounts one or more AI agents behind a
single authenticated HTTP surface. Shared infrastructure (authentication,
configuration, discovery, orchestration) lives in `shared/`, while each agent is
implemented in its own subpackage under `agents/`.

### Highlights
- FastAPI application factory with Supabase-backed JWT enforcement.
- Dynamic agent discovery: drop a directory with an `agent.py`, restart, and the
  routes mount automatically.
- Optional Composio MCP toolsets that inject on demand and clean up safely.
- Google ADK integration for authoring agents with LiteLLM or native Gemini
  models.
- Introspectable registry via `app.state.agent_registry` for surfacing available
  agents.

## Repository Layout
- `app.py` — application entry point; calls `shared.create_app` and starts
  Uvicorn when executed directly.
- `shared/` — shared infrastructure (authentication middleware, environment
  helpers, Composio wiring, agent discovery, settings).
- `agents/` — one subdirectory per agent; each exposes `register_agent(app,
  base_path)`.
- `requirements.txt` / `requirements.lock` — dependency spec and lockfile.
- `.env.example` files (copy locally) provide configuration templates for the
  gateway and individual agents.

## Prerequisites
- Python **3.13.1** (pinned by `.python-version`).
- Supabase project for issuing JWTs and validating users.
- API keys for any model providers you plan to use (Google Gemini, LiteLLM
  bridge targets such as Anthropic/OpenAI, etc.).
- Composio account if you enable MCP tools.

## Quickstart
1. **Match the Python runtime**
   ```bash
   pyenv install 3.13.1     # run once
   pyenv local 3.13.1       # optional; ensures `python` resolves correctly
   python --version         # should report 3.13.1
   ```

2. **Create an isolated environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.lock
   ```
   If you modify dependencies, reinstall from `requirements.txt` and regenerate
   the lockfile with `pip freeze --exclude-editable > requirements.lock`.

4. **Configure environment variables**
   - Copy the shared template: `cp .env.example .env` and populate secrets for
     Supabase, model defaults, Composio, etc.
   - Optionally create per-agent `.env` files (for example
     `agents/github_issues_agent/.env`) to capture overrides that should not live
     in source control.

5. **Run the gateway**
   ```bash
   source .venv/bin/activate
   python app.py
   ```
   By default the service listens on `http://0.0.0.0:8000`. Autodiscovered agent
   routes mount beneath `/<AGENT_ROUTE_PREFIX>/<slug>` (defaults to `/agents`).

### Managing Dependencies
1. Activate a clean virtualenv (`source .venv/bin/activate`).
2. Edit `requirements.txt` to add/remove packages.
3. Install the resolved set: `pip install -r requirements.txt`.
4. Regenerate the lockfile: `pip freeze --exclude-editable > requirements.lock`.
5. Run your smoke tests (e.g., `python app.py` and `/healthz`) before committing
   both files together.

## Configuration

### Shared Environment Variables

| Variable                     | Required | Description                                                                           | Default |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------- | ------- |
| `AGENT_ROUTE_PREFIX`         | no       | URL prefix applied to every agent (e.g. `/agents`).                                   | `/agents` |
| `AGENT_APP_TITLE`            | no       | FastAPI title string.                                                                 | `Agent Gateway` |
| `AGENT_APP_DESCRIPTION`      | no       | FastAPI description text.                                                             | — |
| `DEFAULT_MODEL_PROVIDER`     | no       | Fallback model provider (`GOOGLE`, `LITELLM`, …) used by agents without overrides.    | — |
| `DEFAULT_MODEL`              | no       | Shared fallback model identifier.                                                     | — |
| `SUPABASE_URL`               | yes      | Base URL of the Supabase project used for authentication.                             | — |
| `SUPABASE_API_KEY`           | no       | Supabase anon/service key used when calling Supabase Auth APIs.                       | — |
| `SUPABASE_JWT_SECRET`        | yes      | Supabase JWT secret (required for HS256 tokens).                                      | — |
| `SUPABASE_JWT_AUDIENCE`      | no       | Comma-separated list of accepted audiences.                                           | — |
| `SUPABASE_JWT_ISSUER`        | no       | Expected issuer (`iss`) value in Supabase JWTs.                                       | `<SUPABASE_URL>/auth/v1` |
| `SUPABASE_AUTH_EXCLUDE_PATHS`| no       | Comma-separated routes that bypass auth (e.g. `/healthz`).                            | `/healthz` |
| `SUPABASE_AUTH_HTTP_TIMEOUT` | no       | Timeout (seconds) used when calling Supabase Auth APIs.                               | `3.0` |
| `HOST`                       | no       | Host bound by Uvicorn when running `python app.py`.                                   | `0.0.0.0` |
| `PORT`                       | no       | TCP port bound by Uvicorn.                                                            | `8000` |
| `UVICORN_RELOAD`             | no       | Set to `true` to enable autoreload in local development.                              | `false` |
| `LOG_LEVEL`                  | no       | Python logging level (`INFO`, `DEBUG`, …).                                            | `INFO` |

### GitHub Issues Agent (`agents/github_issues_agent`)

| Variable                                   | Required | Description                                                                                  |
| ------------------------------------------ | -------- | -------------------------------------------------------------------------------------------- |
| `GITHUB_ISSUES_AGENT_ROUTE`                | yes      | URL slug for mounting this agent (e.g. `github`).                                            |
| `GITHUB_ISSUES_AGENT_DISPLAY_NAME`         | yes      | Human-readable name surfaced in logs/registry.                                               |
| `GITHUB_ISSUES_AGENT_INTERNAL_NAME`        | yes      | Internal identifier passed to the ADK agent.                                                 |
| `GITHUB_ISSUES_AGENT_MODEL`                | yes      | Model identifier (e.g. `gemini-1.5-flash`, `anthropic/claude-3-opus`).                       |
| `GITHUB_ISSUES_AGENT_MODEL_PROVIDER`       | no       | Overrides `DEFAULT_MODEL_PROVIDER`; accepts `GOOGLE` or any LiteLLM bridge provider name.    |
| `GITHUB_ISSUES_AGENT_CIO_MCP_CONFIG_IDS`   | yes      | Comma or whitespace separated list of Composio MCP config IDs.                              |
| `GITHUB_ISSUES_AGENT_CIO_MCP_TEST_USER_ID` | no       | Fallback MCP user id used when requests are unauthenticated (local/manual testing).          |

**Model selection tips**
- If the provider resolves to `GOOGLE`, pass the bare Gemini model name (e.g.
  `gemini-2.5-pro`).  
- For all other providers LiteLLM builds the adapter automatically.

**Sample `.env` snippet**
```dotenv
SUPABASE_URL=https://example.supabase.co
SUPABASE_JWT_SECRET=local_dev_secret
DEFAULT_MODEL_PROVIDER=LITELLM
DEFAULT_MODEL=anthropic/claude-sonnet-4-5-20250929
COMPOSIO_API_KEY=sk-composio-...
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_API_KEY=ya29...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_ISSUES_AGENT_ROUTE=github
GITHUB_ISSUES_AGENT_DISPLAY_NAME="GitHub Issues Copilot"
GITHUB_ISSUES_AGENT_INTERNAL_NAME=github_issues_agent
GITHUB_ISSUES_AGENT_CIO_MCP_CONFIG_IDS=config-primary, config-backup
```

## Running the Gateway
- **Start the API**: `python app.py`
- **Health check**: `curl http://localhost:8000/healthz`
- **Agent base path**: inspect `app.state.agent_registry` or browse the OpenAPI
  docs to discover available routes. Example entry:
  ```python
  [
      {"slug": "github", "display_name": "GitHub Issues Copilot", "path": "/agents/github"},
  ]
  ```
- **ADK playground**: for local experimentation without Supabase auth, run
  `cd agents && adk web`. This bypasses gateway authentication and should not be
  exposed publicly.

## Authentication Flow
- Every request (except paths listed in `SUPABASE_AUTH_EXCLUDE_PATHS`) passes
  through `SupabaseAuthMiddleware`.
- The middleware validates bearer JWTs using `SUPABASE_JWT_SECRET`, optional
  audience/issuer constraints, and fetches `/auth/v1/user` to ensure the user is
  still active.
- On success, the user payload and claims are stored on `request.state`, and
  helpers like `shared.auth.get_supabase_user_id()` expose the ID to downstream
  code.
- Failures return `401 Unauthorized` with `WWW-Authenticate: Bearer`.

## Composio MCP Integration
- `shared.composio_mcp.ComposioMCPIntegration` injects MCP toolsets the first
  time an invocation runs and removes them when the run completes.
- Configure the comma/whitespace separated list of MCP config IDs via
  `*_CIO_MCP_CONFIG_IDS`.
- When requests are authenticated the Supabase user id is used for MCP sessions.
  For unauthenticated testing, supply `*_CIO_MCP_TEST_USER_ID`.
- The canonical prompt guidance for re-establishing connections is available
  via `ComposioMCPIntegration.connection_instruction`; agents append it to their
  instruction blocks automatically.

## Adding New Agents
1. Create a directory under `agents/` (e.g. `agents/support_bot`).
2. Implement an `agent.py` with:
   - Optional module constants (`AGENT_ROUTE`, `AGENT_DISPLAY_NAME`, etc.).
   - A callable `register_agent(app: FastAPI, base_path: str)` that mounts
     routes using `add_adk_fastapi_endpoint` or bespoke FastAPI routers.
3. Declare any required environment variables (and provide an `.env.example`).
4. Restart the service; `shared.agent_loader.discover_agents` picks up the new
   module automatically. Slugs are sanitized (lowercase, hyphenated) and must be
   unique.

## Operational Notes
- **Logging**: Set `LOG_LEVEL=DEBUG` for verbose gateway and agent logs.
- **Reload during development**: run `UVICORN_RELOAD=true python app.py`.
- **Troubleshooting auth**: confirm `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, and
  bearer tokens; check Supabase user existence if `/user` returns `404`.
- **Structured tool responses**: `shared.tool_response_utils` provides helpers
  to normalize MCP responses into JSON, ensuring downstream clients receive
  predictable payloads.

## Useful References
- Google Gemini model catalog: <https://ai.google.dev/gemini-api/docs/models>
- LiteLLM provider matrix: <https://docs.litellm.ai/docs/providers>
- Supabase Auth docs: <https://supabase.com/docs/guides/auth>
- Composio MCP docs: <https://docs.composio.dev/>
