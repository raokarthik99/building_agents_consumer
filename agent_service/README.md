# Agent Service

Agent Service is a FastAPI gateway that mounts one or more AI agents behind a
single authenticated HTTP surface. Shared infrastructure (auth, discovery,
app wiring) lives in `shared/`, while individual agents provide their own ADK
logic under `agents/`.

- **Gateway**: FastAPI application factory with Supabase-backed JWT enforcement.
- **Agents**: Google ADK agents that can opt in to Composio MCP toolsets.
- **Discovery**: Agents auto-register via `shared.agent_loader.discover_agents`.

---

## Architecture at a Glance

- `app.py` – entry point that builds the FastAPI app with `shared.create_app`.
- `shared/` – authentication middleware, environment helpers, Composio MCP
  integration, and agent discovery.
- `agents/` – one subpackage per agent; each exposes `register_agent(app, base_path)`.
- `/healthz` – unauthenticated readiness probe.
- `app.state.agent_registry` – runtime metadata describing mounted agents.

---

## Local Development Workflow

1. **Create and activate a virtual environment**
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
   - Copy `.env.example` if present or create `.env`.
   - Populate the shared variables and agent-specific values listed below.

4. **Run the service**
   ```bash
   python app.py
   ```
   The API defaults to `http://0.0.0.0:8000`. Agents mount under
   `/<AGENT_ROUTE_PREFIX>/<slug>`; inspect `app.state.agent_registry` for the
   full listing.

5. **Smoke test**
   - `curl http://localhost:8000/healthz`
   - Hit an agent route with an authenticated request to ensure Supabase checks succeed.

---

## Configuration

### Shared Infrastructure

| Variable                      | Required | Description                                                            | Default         |
| ----------------------------- | -------- | ---------------------------------------------------------------------- | --------------- |
| `SUPABASE_URL`                | yes      | Base URL of the Supabase project used for auth.                        | —               |
| `SUPABASE_API_KEY`            | no       | Supabase anon/service role key for `/auth/v1/user`.                    | —               |
| `SUPABASE_JWT_SECRET`         | yes      | JWT secret used to validate HS256 tokens.                              | —               |
| `SUPABASE_JWT_AUDIENCE`       | no       | Comma-separated list of accepted audiences.                            | —               |
| `SUPABASE_JWT_ISSUER`         | no       | Overrides expected `iss` claim. Defaults to `${SUPABASE_URL}/auth/v1`. | derived         |
| `SUPABASE_AUTH_EXCLUDE_PATHS` | no       | Comma-separated list of paths that bypass auth.                        | `/healthz`      |
| `SUPABASE_AUTH_HTTP_TIMEOUT`  | no       | Timeout (seconds) for Supabase lookups.                                | `3.0`           |
| `AGENT_ROUTE_PREFIX`          | no       | Prefix applied to all agent mounts.                                    | `/agents`       |
| `AGENT_APP_TITLE`             | no       | FastAPI application title.                                             | `Agent Gateway` |
| `AGENT_APP_DESCRIPTION`       | no       | Optional FastAPI description text.                                     | —               |
| `LOG_LEVEL`                   | no       | Python logging level (e.g. `INFO`, `DEBUG`).                           | `INFO`          |
| `HOST`                        | no       | Hostname bound by Uvicorn when running via `python app.py`.            | `0.0.0.0`       |
| `PORT`                        | no       | TCP port bound by Uvicorn.                                             | `8000`          |
| `UVICORN_RELOAD`              | no       | Set to `true` to enable auto-reload in local dev.                      | `false`         |

### GitHub Issues Agent (`agents/github_issues_agent`)

| Variable                                    | Required | Description                                                                                   |
| ------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `GITHUB_ISSUES_AGENT_ROUTE`                 | yes      | URL slug for mounting this agent (e.g. `github`).                                             |
| `GITHUB_ISSUES_AGENT_DISPLAY_NAME`          | yes      | Human-readable name used in logs and agent registry metadata.                                 |
| `GITHUB_ISSUES_AGENT_INTERNAL_NAME`         | yes      | Internal identifier passed to the ADK agent.                                                  |
| `COMPOSIO_API_KEY`                          | yes      | API key used to request Composio MCP sessions.                                                |
| `GITHUB_ISSUES_AGENT_CIO_MCP_CONFIG_IDS`    | yes      | Comma or whitespace separated list of Composio MCP configuration identifiers for this agent. |
| `GITHUB_ISSUES_AGENT_CIO_MCP_TEST_USER_ID`  | no       | Fallback MCP user id for unauthenticated/manual testing.                                      |

#### Sample `.env` excerpt
```dotenv
SUPABASE_URL=https://example.supabase.co
SUPABASE_JWT_SECRET=local_dev_secret
GITHUB_ISSUES_AGENT_ROUTE=github
GITHUB_ISSUES_AGENT_DISPLAY_NAME="GitHub Issues Copilot"
GITHUB_ISSUES_AGENT_INTERNAL_NAME=github_issues_agent
COMPOSIO_API_KEY=sk-...
GITHUB_ISSUES_AGENT_CIO_MCP_CONFIG_IDS=config-primary, config-backup
```

---

## Adding or Extending Agents

1. Create a directory under `agents/` (e.g. `agents/support_bot`).
2. Implement `agent.py` with a top-level `register_agent(app: FastAPI, base_path: str)` function.
3. Export and configure any required environment variables.
4. Restart the service; `shared.agent_loader.discover_agents` will mount the new agent automatically.

Agents can opt into Composio MCP tooling by instantiating `ComposioMCPIntegration`
with their own settings and wiring the provided callbacks into the ADK agent.

---

## Composio MCP Integration

- Configure a single env var (e.g. `GITHUB_ISSUES_AGENT_CIO_MCP_CONFIG_IDS`) with
  one or more MCP config IDs separated by commas or whitespace.
- The integration generates a dedicated `McpToolset` per config ID at invocation time
  and tears them down after completion.
- Each toolset is tagged with the invoking ADK invocation id to avoid cross-request leaks.

---

## Operational Tips

- **Health check**: `curl http://localhost:8000/healthz`
- **Enable verbose logging**: set `LOG_LEVEL=DEBUG`.
- **Auth failures**: verify Supabase credentials, ensure your bearer token is valid, and confirm the Supabase user exists.
- **Reload during development**: run `UVICORN_RELOAD=true python app.py`.

Agent registry metadata (`app.state.agent_registry`) is useful for introspecting
mounted agents at runtime. Use it to surface available slugs or build discovery endpoints.
