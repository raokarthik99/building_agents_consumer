# Agent Service

Agent Service is a FastAPI gateway that exposes one or more AI agents behind a common
HTTP interface. Authentication is enforced through Supabase JWT middleware, and each
agent registers its own routes dynamically at startup.

## Highlights

- FastAPI application factory (`shared.create_app`) that mounts every agent package in
  `agents/`.
- Supabase-backed authentication via `SupabaseAuthMiddleware`.
- ADK-based agent implementation (`agents/main_agent`) that brokers requests to Google
  ADK and Composio MCP services.
- Health probe at `/healthz` and agent discovery metadata in `app.state.agent_registry`.

## Quick Start

1. **Create a virtual environment**

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Configure environment**

   Create a `.env` file (loaded automatically by `python-dotenv`) that sets the shared
   Supabase variables and the agent-specific variables listed below.

4. **Run the API**

   ```bash
   uvicorn app:app --reload
   ```

   The service defaults to `http://127.0.0.1:8000` with the main agent mounted under
   `/agents/<slug>`. Adjust host/port through the optional runtime variables.

## Environment Variables

### Shared infrastructure (middleware, app shell)

| Variable | Required | Description | Default |
| --- | --- | --- | --- |
| `SUPABASE_URL` | yes | Base URL of the Supabase project used for auth. | — |
| `SUPABASE_API_KEY` | no | Supabase anon/service role key for `/auth/v1/user`. | — |
| `SUPABASE_JWT_SECRET` | yes | JWT secret used to validate HS256 tokens. | — |
| `SUPABASE_JWT_AUDIENCE` | no | Comma-separated list of accepted audiences. | — |
| `SUPABASE_JWT_ISSUER` | no | Overrides expected `iss` claim. Defaults to `${SUPABASE_URL}/auth/v1`. | derived |
| `SUPABASE_AUTH_EXCLUDE_PATHS` | no | Comma-separated list of paths that bypass auth. | `/healthz` |
| `SUPABASE_AUTH_HTTP_TIMEOUT` | no | Timeout (seconds) for Supabase lookups. | `3.0` |
| `AGENT_ROUTE_PREFIX` | no | Prefix applied to all agent mounts. | `/agents` |
| `AGENT_APP_TITLE` | no | FastAPI application title. | `Agent Gateway` |
| `AGENT_APP_DESCRIPTION` | no | Optional FastAPI description text. | — |
| `LOG_LEVEL` | no | Python logging level (e.g. `INFO`, `DEBUG`). | `INFO` |
| `HOST` | no | Hostname bound by Uvicorn when running via `python app.py`. | `0.0.0.0` |
| `PORT` | no | TCP port bound by Uvicorn. | `8000` |
| `UVICORN_RELOAD` | no | Set to `true` to enable auto-reload in local dev. | `false` |

### Main agent (`agents/main_agent`)

All of the following are required unless noted otherwise.

| Variable | Required | Description |
| --- | --- | --- |
| `MAIN_AGENT_ROUTE` | yes | URL slug for mounting this agent (e.g. `main`). |
| `MAIN_AGENT_DISPLAY_NAME` | yes | Human-readable name used in logs and registry metadata. |
| `MAIN_AGENT_INTERNAL_NAME` | yes | Internal identifier passed to the ADK agent. |
| `COMPOSIO_API_KEY` | yes | API key used to request Composio MCP sessions. |
| `MAIN_AGENT_CIO_MCP_CONFIG_ID` | yes | Composio MCP configuration identifier consumed during session generation. |
| `MAIN_AGENT_CIO_MCP_TEST_USER_ID` | no | Fallback MCP user id for unauthenticated/manual testing. |

## Application Layout

- `app.py` &mdash; Entry point that constructs the FastAPI app using `shared.create_app`.
- `shared/` &mdash; Shared utilities: authentication middleware, settings loading, and
  agent discovery logic.
- `agents/` &mdash; Container for individual agent implementations. Each subfolder must
  expose an `agent.py` with a `register_agent(app, base_path)` function.

## Adding an Agent

1. Create a directory under `agents/` (e.g. `agents/support_bot`).
2. Implement `agent.py` that defines:
   - `register_agent(app: FastAPI, base_path: str)` to attach routes.
   - Optional constants `AGENT_SLUG` / `AGENT_ROUTE` and `AGENT_DISPLAY_NAME`.
3. Provide any agent-specific environment variables inside your `.env`.
4. Restart the service; the new agent is discovered automatically and mounted beneath
   `/<AGENT_ROUTE_PREFIX>/<slug>`.

## Troubleshooting

- Use `LOG_LEVEL=DEBUG` to surface Supabase authentication traces.
- `curl http://localhost:8000/healthz` to confirm the service is running without
  triggering auth.
- If requests fail with `401`, verify Supabase credentials and that your bearer token
  is still valid.

