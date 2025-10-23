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

1. **Match the Python runtime**

   The repository pins `3.13.1` in `.python-version`. If you use `pyenv`,
   run `pyenv install 3.13.1` (once) so `python` resolves to the correct interpreter.
   Otherwise make sure `python --version` reports `3.13.1` before continuing.

1. **Create and activate a virtual environment**

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

1. **Install dependencies**

   ```bash
   pip install --upgrade pip
   pip install -r requirements.lock
   ```

   `requirements.txt` keeps the high-level dependency list. When you add or
   upgrade packages, reinstall from `requirements.txt`, then regenerate the lock:

   ```bash
   pip install -r requirements.txt
   pip freeze --exclude-editable > requirements.lock
   ```

### Updating dependencies

1. Activate a clean virtual environment for this project (`source .venv/bin/activate`). If you need a fresh start, remove and recreate `.venv` before proceeding.
1. Edit `requirements.txt` with the new or updated packages you want to add. Remove entries you no longer need.
1. Install the resolved set to make sure the environment matches the spec:

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

   If you removed packages, uninstall them (`pip uninstall <package>`) or rebuild the virtualenv so they do not linger.

1. Regenerate the lockfile from the now-canonical environment:

   ```bash
   pip freeze --exclude-editable > requirements.lock
   ```

1. Run your usual test smoke (for example `python app.py` plus the `/healthz` check below) to confirm nothing regressed.
1. Commit `requirements.txt` and `requirements.lock` together so reviewers can see the intended upgrade.

1. **Configure environment**

   - Copy `cp .env.example .env` and populate the shared variables with project-specific secrets. This file is git-ignored—keep it private.
   - For each agent, copy its example (`cp agents/github_issues_agent/.env.example agents/github_issues_agent/.env`) and tailor the overrides as needed.
     > **Security:** Keep only the `.example` templates in source control. Never commit populated `.env*` files—they typically contain credentials.

1. **Run the service** (or explore via ADK Web)

   - From the project root (`agent_service/`), start the FastAPI gateway:

     ```bash
     python app.py
     ```

     The API binds to `http://0.0.0.0:8000`. Agents mount under
     `/<AGENT_ROUTE_PREFIX>/<slug>`; inspect `app.state.agent_registry` for the
     full listing.

   - To launch the Google ADK playground instead, first move into the agents
     directory so ADK can resolve your agent packages:

     ```bash
     cd agents
     adk web
     ```

     Supabase authentication is bypassed in this playground, so reserve it for
     local/manual validation. For production frontends and deployment, continue
     using the CopilotKit ADK wrapper exposed through `app.py`.

1. **Smoke test**
   - `curl http://localhost:8000/healthz`
   - Hit an agent route with an authenticated request to ensure Supabase checks succeed.

---

## Configuration

### Shared Infrastructure

| Variable                      | Required | Description                                                                            | Default         |
| ----------------------------- | -------- | -------------------------------------------------------------------------------------- | --------------- |
| `DEFAULT_MODEL_PROVIDER`      | no       | Shared fallback provider (`GOOGLE`, `LITELLM`, etc.) used when agents do not override. | —               |
| `DEFAULT_MODEL`               | no       | Shared fallback model identifier used when agents do not override.                     | —               |
| `SUPABASE_URL`                | yes      | Supabase project Base URL used for auth.                                               | —               |
| `SUPABASE_API_KEY`            | no       | Supabase service_role key for `/auth/v1/user`.                                         | —               |
| `SUPABASE_JWT_SECRET`         | yes      | Supabase (Legacy) JWT secret used to validate HS256 tokens.                            | —               |
| `SUPABASE_JWT_AUDIENCE`       | no       | Comma-separated list of accepted audiences.                                            | —               |
| `SUPABASE_JWT_ISSUER`         | no       | Overrides expected `iss` claim. Defaults to `${SUPABASE_URL}/auth/v1`.                 | derived         |
| `SUPABASE_AUTH_EXCLUDE_PATHS` | no       | Comma-separated list of paths that bypass auth.                                        | `/healthz`      |
| `SUPABASE_AUTH_HTTP_TIMEOUT`  | no       | Timeout (seconds) for Supabase lookups.                                                | `3.0`           |
| `GOOGLE_GENAI_USE_VERTEXAI`   | no       | Set to `true` to route Google Generative AI requests through Vertex AI.                | `false`         |
| `GOOGLE_API_KEY`              | yes      | Google Generative AI API key used by shared tooling.                                   | —               |
| `ANTHROPIC_API_KEY`           | no       | Anthropic API key for Claude-powered helpers.                                          | —               |
| `COMPOSIO_API_KEY`            | yes      | API key used to request Composio MCP sessions.                                         | —               |
| `AGENT_ROUTE_PREFIX`          | no       | Prefix applied to all agent mounts.                                                    | `/agents`       |
| `AGENT_APP_TITLE`             | no       | FastAPI application title.                                                             | `Agent Gateway` |
| `AGENT_APP_DESCRIPTION`       | no       | Optional FastAPI description text.                                                     | —               |
| `LOG_LEVEL`                   | no       | Python logging level (e.g. `INFO`, `DEBUG`).                                           | `INFO`          |
| `HOST`                        | no       | Hostname bound by Uvicorn when running via `python app.py`.                            | `0.0.0.0`       |
| `PORT`                        | no       | TCP port bound by Uvicorn.                                                             | `8000`          |
| `UVICORN_RELOAD`              | no       | Set to `true` to enable auto-reload in local dev.                                      | `false`         |

#### Model configuration quick links

- Review the official Google Gemini model catalog to choose Live API compatible IDs: <https://ai.google.dev/gemini-api/docs/models>
- LiteLLM provider naming and API key expectations (e.g. Anthropic, OpenAI, Azure): <https://docs.litellm.ai/docs/providers>

### GitHub Issues Agent (`agents/github_issues_agent`)

| Variable                                   | Required | Description                                                                                  |
| ------------------------------------------ | -------- | -------------------------------------------------------------------------------------------- |
| `GITHUB_ISSUES_AGENT_ROUTE`                | yes      | URL slug for mounting this agent (e.g. `github`).                                            |
| `GITHUB_ISSUES_AGENT_DISPLAY_NAME`         | yes      | Human-readable name used in logs and agent registry metadata.                                |
| `GITHUB_ISSUES_AGENT_INTERNAL_NAME`        | yes      | Internal identifier passed to the ADK agent.                                                 |
| `GITHUB_ISSUES_AGENT_MODEL_PROVIDER`       | no       | `GOOGLE` to use Gemini directly; otherwise defaults to LiteLLM bridging for external models. |
| `GITHUB_ISSUES_AGENT_MODEL`                | yes      | Model identifier (e.g. `gemini-1.5-flash` or `anthropic/claude-3-opus`).                     |
| `GITHUB_ISSUES_AGENT_CIO_MCP_CONFIG_IDS`   | yes      | Comma or whitespace separated list of Composio MCP configuration identifiers for this agent. |
| `GITHUB_ISSUES_AGENT_CIO_MCP_TEST_USER_ID` | no       | Fallback MCP user id for unauthenticated/manual testing.                                     |

> **Important:** For Gemini models, pass the bare model name (for example `gemini-2.5-pro`) rather than the prefixed `google/gemini-2.5-pro`.

#### Sample `.env` excerpt

```dotenv
SUPABASE_URL=https://example.supabase.co
SUPABASE_JWT_SECRET=local_dev_secret
DEFAULT_MODEL_PROVIDER=LITELLM
DEFAULT_MODEL=anthropic/claude-sonnet-4-5-20250929
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_API_KEY=ya29...
ANTHROPIC_API_KEY=sk-ant-...
COMPOSIO_API_KEY=sk-...
GITHUB_ISSUES_AGENT_ROUTE=github
GITHUB_ISSUES_AGENT_DISPLAY_NAME="GitHub Issues Copilot"
GITHUB_ISSUES_AGENT_INTERNAL_NAME=github_issues_agent
# Optional overrides if the GitHub Issues agent should deviate from shared defaults
# GITHUB_ISSUES_AGENT_MODEL_PROVIDER=LITELLM
# GITHUB_ISSUES_AGENT_MODEL=anthropic/claude-sonnet-4-5-20250929
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

> **Model wiring flexibility:** Environment variables offer a convenient way to keep model
> selection outside of source control, but they are optional. You can hardcode a model
> string or instantiate LiteLLM wrappers directly inside `agent.py` if that better suits
> your deployment. Pick whichever approach keeps configuration clear and repeatable.

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
