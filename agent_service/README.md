# 🤖 Agent Service

> A powerful FastAPI gateway for deploying and managing AI agents with enterprise-grade authentication and tooling

## 📋 Table of Contents

- [🚀 What is this?](#-what-is-this)
- [🏗️ Architecture](#️-architecture)
- [🎯 Current Agents](#-current-agents)
- [🛠️ Shared Infrastructure](#️-shared-infrastructure)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
- [🚀 Usage Examples](#-usage-examples)
- [🔧 Advanced Configuration](#-advanced-configuration)
- [🔐 Authentication & Security](#-authentication--security)
- [🛠️ Creating New Agents](#️-creating-new-agents)
- [🐛 Troubleshooting](#-troubleshooting)
- [📚 Resources](#-resources)

## 🚀 What is this?

The Agent Service is a **production-ready FastAPI gateway** that provides a unified, authenticated interface for multiple AI agents. Think of it as your AI agent orchestration platform that handles authentication, routing, tool management, and more - so you can focus on building amazing agent capabilities.

### ✨ Key Features

- **🔐 Enterprise Authentication**: Supabase-backed JWT enforcement with configurable audience/issuer validation
- **🔄 Dynamic Agent Discovery**: Drop in a new agent directory and it automatically mounts - no manual configuration needed
- **🛠️ Smart Tool Management**: Composio MCP integration that injects tools on-demand and cleans up safely
- **🧠 Multi-Model Support**: Works with Google Gemini, LiteLLM (Anthropic, OpenAI, etc.), and more
- **📊 Built-in Observability**: Agent registry, health checks, and comprehensive logging
- **⚡ Production Ready**: Health checks, graceful error handling, and configurable timeouts

## 🏗️ Architecture

```
agent_service/
├── 🚀 app.py                    # Main entry point & Uvicorn server
├── 📁 shared/                   # Core infrastructure & utilities
│   ├── app_factory.py          # FastAPI app creation & middleware setup
│   ├── agent_loader.py         # Dynamic agent discovery & registration
│   ├── auth.py                 # Supabase JWT authentication middleware
│   ├── composio_mcp.py         # Composio MCP tool integration
│   ├── model_provider.py       # Multi-model support (Gemini, LiteLLM, etc.)
│   ├── settings.py             # Configuration management
│   └── tool_response_utils.py  # Tool response normalization
├── 📁 agents/                  # Individual AI agents
│   ├── github_issues_agent/    # GitHub issues management specialist
│   └── event_organizer_agent/  # Event planning & coordination expert
└── 📄 requirements.txt         # Dependencies & lockfile
```

### 🎯 Current Agents

#### 🐙 GitHub Issues Agent

**Specializes in GitHub issue management workflows**

- Issue triage, creation, and updates
- Issue summarization and analysis
- GitHub repository integration via Composio tools
- Perfect for development teams and project management

#### 🎪 Event Organizer Agent

**Your event planning co-pilot for conferences and meetups**

- Speaker research and outreach coordination
- Calendar integration for scheduling
- Notion workspace management for event planning
- Gmail integration for personalized communications
- Web search for speaker research and trend analysis

## 🛠️ Shared Infrastructure

The `shared/` directory contains all the reusable components that power the agent gateway:

| Module                       | Purpose           | Key Features                                              |
| ---------------------------- | ----------------- | --------------------------------------------------------- |
| **`app_factory.py`**         | Core app creation | FastAPI setup, middleware registration, agent discovery   |
| **`agent_loader.py`**        | Dynamic discovery | Auto-detects agents, validates structure, builds registry |
| **`auth.py`**                | Authentication    | Supabase JWT validation, user context extraction          |
| **`composio_mcp.py`**        | Tool integration  | MCP tool injection, connection management, cleanup        |
| **`model_provider.py`**      | Model abstraction | Multi-provider support (Gemini, LiteLLM, etc.)            |
| **`settings.py`**            | Configuration     | Environment variable parsing, validation                  |
| **`tool_response_utils.py`** | Response handling | Tool output normalization, error handling                 |

## 📋 Prerequisites

Before you start, make sure you have:

- **Python 3.13.1** (pinned by `.python-version`)
- **Supabase project** for JWT authentication
- **Model provider API keys** (Google Gemini, Anthropic, OpenAI, etc.)
- **Composio account** (optional, for MCP tools)

## 🚀 Quick Start

Get up and running in 5 minutes:

### 1. **Setup Python Environment**

```bash
# Install Python 3.13.1 (if not already installed)
pyenv install 3.13.1
pyenv local 3.13.1
python --version  # Should show 3.13.1
```

### 2. **Create Virtual Environment**

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. **Install Dependencies**

```bash
pip install --upgrade pip
pip install -r requirements.lock
```

### 4. **Configure Environment**

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your configuration
# See Configuration section below for all required variables
```

### 5. **Launch the Gateway**

```bash
python app.py
```

🎉 **You're live!** The service runs on `http://localhost:8000` with:

- Health check: `http://localhost:8000/healthz`
- Agent endpoints: `http://localhost:8000/agents/{agent-name}`
- API docs: `http://localhost:8000/docs`

## ⚙️ Configuration

### 🔧 Core Settings

| Variable                | Required | Description                                         | Default         |
| ----------------------- | -------- | --------------------------------------------------- | --------------- |
| `AGENT_ROUTE_PREFIX`    | No       | URL prefix for all agents (e.g., `/agents`)         | `/agents`       |
| `AGENT_APP_TITLE`       | No       | FastAPI application title                           | `Agent Gateway` |
| `AGENT_APP_DESCRIPTION` | No       | FastAPI description                                 | —               |
| `HOST`                  | No       | Server host address                                 | `0.0.0.0`       |
| `PORT`                  | No       | Server port                                         | `8000`          |
| `LOG_LEVEL`             | No       | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | `INFO`          |
| `UVICORN_RELOAD`        | No       | Enable auto-reload for development                  | `false`         |

### 🔐 Authentication (Supabase)

| Variable                      | Required | Description                                | Default                  |
| ----------------------------- | -------- | ------------------------------------------ | ------------------------ |
| `SUPABASE_URL`                | **Yes**  | Your Supabase project URL                  | —                        |
| `SUPABASE_JWT_SECRET`         | **Yes**  | JWT secret for token validation            | —                        |
| `SUPABASE_API_KEY`            | No       | Supabase API key for user validation       | —                        |
| `SUPABASE_JWT_AUDIENCE`       | No       | Comma-separated accepted audiences         | —                        |
| `SUPABASE_JWT_ISSUER`         | No       | Expected JWT issuer                        | `<SUPABASE_URL>/auth/v1` |
| `SUPABASE_AUTH_EXCLUDE_PATHS` | No       | Routes that bypass auth (e.g., `/healthz`) | `/healthz`               |
| `SUPABASE_AUTH_HTTP_TIMEOUT`  | No       | HTTP timeout for auth calls (seconds)      | `3.0`                    |

### 🧠 Model Configuration

| Variable                 | Required | Description                             | Default |
| ------------------------ | -------- | --------------------------------------- | ------- |
| `DEFAULT_MODEL_PROVIDER` | No       | Fallback provider (`GOOGLE`, `LITELLM`) | —       |
| `DEFAULT_MODEL`          | No       | Fallback model identifier               | —       |

### 🐙 GitHub Issues Agent

| Variable                                   | Required | Description                                 |
| ------------------------------------------ | -------- | ------------------------------------------- |
| `GITHUB_ISSUES_AGENT_ROUTE`                | **Yes**  | URL slug (e.g., `github`)                   |
| `GITHUB_ISSUES_AGENT_DISPLAY_NAME`         | **Yes**  | Human-readable name                         |
| `GITHUB_ISSUES_AGENT_INTERNAL_NAME`        | **Yes**  | Internal identifier                         |
| `GITHUB_ISSUES_AGENT_MODEL`                | **Yes**  | Model identifier (e.g., `gemini-1.5-flash`) |
| `GITHUB_ISSUES_AGENT_MODEL_PROVIDER`       | No       | Override default provider                   |
| `GITHUB_ISSUES_AGENT_CIO_MCP_CONFIG_IDS`   | **Yes**  | Composio MCP config IDs                     |
| `GITHUB_ISSUES_AGENT_CIO_MCP_TEST_USER_ID` | No       | Test user ID for unauthenticated requests   |

### 🎪 Event Organizer Agent

| Variable                                     | Required | Description                               |
| -------------------------------------------- | -------- | ----------------------------------------- |
| `EVENT_ORGANIZER_AGENT_ROUTE`                | **Yes**  | URL slug (e.g., `events`)                 |
| `EVENT_ORGANIZER_AGENT_DISPLAY_NAME`         | **Yes**  | Human-readable name                       |
| `EVENT_ORGANIZER_AGENT_INTERNAL_NAME`        | **Yes**  | Internal identifier                       |
| `EVENT_ORGANIZER_AGENT_MODEL`                | **Yes**  | Model identifier                          |
| `EVENT_ORGANIZER_AGENT_MODEL_PROVIDER`       | No       | Override default provider                 |
| `EVENT_ORGANIZER_AGENT_CIO_MCP_CONFIG_IDS`   | **Yes**  | Composio MCP config IDs                   |
| `EVENT_ORGANIZER_AGENT_CIO_MCP_TEST_USER_ID` | No       | Test user ID for unauthenticated requests |

### 📝 Configuration Notes

- Model provider selection:
  - Set `DEFAULT_MODEL_PROVIDER` to `GOOGLE` to use Gemini directly via ADK, or `LITELLM` to route to other providers (OpenAI, Anthropic, Azure AI, Ollama, etc.).
- Model naming guidance:
  - For Gemini, use bare model names like `gemini-2.5-pro` or `gemini-2.5-flash` (see official catalog).
  - For LiteLLM, use the provider-expected identifier format (e.g., `anthropic/claude-sonnet-4-5-20250929`). Refer to LiteLLM docs for each provider’s naming.
- Google keys and Vertex AI:
  - Use `GOOGLE_API_KEY` from Google AI Studio to call Gemini directly. Docs: https://google.github.io/adk-docs/agents/models/#google-ai-studio
  - `GOOGLE_GENAI_USE_VERTEXAI=false` by default. If you prefer Vertex AI, follow: https://google.github.io/adk-docs/agents/models/#google-cloud-vertex-ai
- LiteLLM providers and keys:
  - Provider naming and API key guidance: https://docs.litellm.ai/docs/providers
- Supabase auth:
  - Provide `SUPABASE_URL` and `SUPABASE_JWT_SECRET`. Optional fields include `SUPABASE_API_KEY`, `SUPABASE_JWT_AUDIENCE`, and `SUPABASE_JWT_ISSUER` (defaults to `<SUPABASE_URL>/auth/v1`).
- Tooling:
  - `COMPOSIO_API_KEY` enables Composio MCP tools. Use per-agent `*_CIO_MCP_CONFIG_IDS` and optional `*_CIO_MCP_TEST_USER_ID` for unauthenticated testing.

### 🔄 Managing Dependencies

When you need to update dependencies:

```bash
# 1. Activate your environment
source .venv/bin/activate

# 2. Edit requirements.txt
# Add/remove packages as needed

# 3. Install updated dependencies
pip install -r requirements.txt

# 4. Regenerate lockfile
pip freeze --exclude-editable > requirements.lock

# 5. Test your changes
python app.py
curl http://localhost:8000/healthz
```

## 🚀 Usage Examples

### Basic API Calls

```bash
# Health check
curl http://localhost:8000/healthz

# List available agents
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8000/agents

# Interact with GitHub Issues Agent
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Help me triage the open issues in my repository"}' \
  http://localhost:8000/agents/github

# Interact with Event Organizer Agent
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Help me plan a tech conference for 500 attendees"}' \
  http://localhost:8000/agents/events
```

### Agent Registry

The gateway automatically maintains a registry of available agents:

```python
# Access via app.state.agent_registry
[
    {
        "slug": "github",
        "display_name": "GitHub Issues Copilot",
        "path": "/agents/github"
    },
    {
        "slug": "events",
        "display_name": "Event Planning Assistant",
        "path": "/agents/events"
    }
]
```

### Development Mode

For local development without authentication:

```bash
# Enable auto-reload
UVICORN_RELOAD=true python app.py

# Use ADK playground (bypasses auth)
cd agents && adk web
```

## 🔧 Advanced Configuration

### Model Selection Tips

- **Google Gemini**: Use bare model names (e.g., `gemini-1.5-pro`, `gemini-2.0-flash-exp`)
- **LiteLLM Providers**: Use provider/model format (e.g., `anthropic/claude-3-5-sonnet-20241022`)
- **Provider Override**: Set `*_MODEL_PROVIDER` to override the default for specific agents

## 🔐 Authentication & Security

### How Authentication Works

1. **JWT Validation**: Every request (except excluded paths) goes through `SupabaseAuthMiddleware`
2. **Token Verification**: Validates bearer JWTs using your `SUPABASE_JWT_SECRET`
3. **User Validation**: Fetches `/auth/v1/user` to ensure the user is still active
4. **Context Storage**: User data is stored in `request.state` for agent access
5. **Helper Functions**: Use `shared.auth.get_supabase_user_id()` to get the current user ID

### Composio MCP Integration

- **On-Demand Tools**: MCP toolsets are injected when needed and cleaned up after use
- **User Context**: Authenticated requests use Supabase user ID for MCP sessions
- **Test Mode**: Use `*_CIO_MCP_TEST_USER_ID` for unauthenticated testing
- **Auto-Instructions**: Connection guidance is automatically added to agent prompts

## 🛠️ Creating New Agents

Adding a new agent is as simple as creating a directory and implementing a few functions:

### 1. Create Agent Directory

```bash
mkdir agents/my_new_agent
touch agents/my_new_agent/__init__.py
```

### 2. Implement Agent Module

```python
# agents/my_new_agent/agent.py
import logging
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI
from google.adk.agents import Agent

from shared.auth import get_supabase_user_id
from shared.composio_mcp import ComposioMCPIntegration, ComposioMCPSettings
from shared.env import require_env, require_env_with_fallback
from shared.model_provider import resolve_adk_model

# Agent configuration
AGENT_CONTEXT = "my_new_agent"
AGENT_ROUTE = require_env("MY_NEW_AGENT_ROUTE", context=AGENT_CONTEXT)
AGENT_DISPLAY_NAME = require_env("MY_NEW_AGENT_DISPLAY_NAME", context=AGENT_CONTEXT)
AGENT_INTERNAL_NAME = require_env("MY_NEW_AGENT_INTERNAL_NAME", context=AGENT_CONTEXT)

# MCP integration
composio_integration = ComposioMCPIntegration(
    ComposioMCPSettings(
        agent_context=AGENT_CONTEXT,
        display_name=AGENT_DISPLAY_NAME,
        mcp_config_ids_env="MY_NEW_AGENT_CIO_MCP_CONFIG_IDS",
        test_user_env="MY_NEW_AGENT_CIO_MCP_TEST_USER_ID",
    )
)

# Agent instruction
AGENT_INSTRUCTION = f"""You are a helpful assistant specialized in [your domain].

{composio_integration.connection_instruction}"""

# Model configuration
_MODEL_IDENTIFIER = require_env_with_fallback(
    "MY_NEW_AGENT_MODEL",
    "DEFAULT_MODEL",
    context=AGENT_CONTEXT,
)

def register_agent(app: FastAPI, base_path: str) -> None:
    """Register the agent with the FastAPI app."""
    add_adk_fastapi_endpoint(app, _build_adk_agent(), path=base_path)

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
            "MY_NEW_AGENT_MODEL_PROVIDER",
            "DEFAULT_MODEL_PROVIDER",
        ),
        description="Your agent description here",
        instruction=AGENT_INSTRUCTION,
        before_agent_callback=composio_integration.before_agent_callback,
        after_agent_callback=composio_integration.after_agent_callback,
    )

root_agent = get_root_agent()
```

### 3. Add Environment Variables

```bash
# Add to your .env file
MY_NEW_AGENT_ROUTE=myagent
MY_NEW_AGENT_DISPLAY_NAME="My Custom Agent"
MY_NEW_AGENT_INTERNAL_NAME=my_new_agent
MY_NEW_AGENT_MODEL=gemini-1.5-pro
MY_NEW_AGENT_CIO_MCP_CONFIG_IDS=config1,config2
```

### 4. Restart the Service

```bash
python app.py
```

That's it! Your agent will be automatically discovered and mounted at `/agents/myagent`.

## 🐛 Troubleshooting

### Common Issues

| Problem                   | Solution                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| **401 Unauthorized**      | Check `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, and bearer token validity |
| **Agent not found**       | Verify agent directory has `agent.py` and required constants           |
| **MCP tools not working** | Check `COMPOSIO_API_KEY` and MCP config IDs                            |
| **Model errors**          | Verify API keys and model identifiers                                  |

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=DEBUG python app.py

# Check agent registry
curl http://localhost:8000/healthz
```

## 📚 Resources

- **Google Gemini Models**: [Model Catalog](https://ai.google.dev/gemini-api/docs/models)
- **LiteLLM Providers**: [Provider Matrix](https://docs.litellm.ai/docs/providers)
- **Supabase Auth**: [Authentication Guide](https://supabase.com/docs/guides/auth)
- **Composio MCP**: [MCP Documentation](https://docs.composio.dev/)

---

**Happy agent building! 🚀**
