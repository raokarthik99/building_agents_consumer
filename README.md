# Building Agents — Consumer

A full‑stack reference for building consumer‑facing AI agents. This repo contains:

- A secure, multi‑agent chat UI built with Next.js 15 + CopilotKit
- A FastAPI‑based agent server (ADK wrapper) with Supabase auth
- Optional MCP tool integrations via Composio (Notion, Google Calendar, Gmail, GitHub, …)

Use this as a template to stand up real, authenticated agents that can call tools on a user’s behalf.

---

## System Overview

The system has four major parts that work together end‑to‑end:

1) Frontend App (Next.js)
- Hosts the chat experience and account/connection management
- Manages user session with Supabase (Google OAuth by default)
- Proxies chat traffic to the agent server via CopilotKit runtime routes

2) Agent Server (FastAPI + ADK)
- Exposes AG‑UI/ADK‑compatible HTTP endpoints per agent
- Validates Supabase JWTs and extracts the user identity
- Orchestrates the LLM and tool calls for each request

3) MCP Gateway (Composio)
- Manages connections to remote MCP servers on behalf of a user
- Injects configured toolsets into the agent at run time
- Handles per‑user credentials, refresh flows, and cleanup

4) External Services
- LLM providers (Gemini, Anthropic, OpenAI via LiteLLM)
- Remote MCP servers (Notion, Google Calendar, Gmail, GitHub, …)

---

## Monorepo Layout

- `copilotkit-ui/copilotkit-ui-adk-agent-standalone` — Next.js chat application and connection management UI
- `agent_service` — FastAPI gateway that discovers and serves agents, handles auth, and wires MCP tools

See each package’s README for deep dives and exact configuration.

---

## Request Flow (High Level)

1) User signs in on the frontend via Supabase (Google OAuth).
2) User sends a chat message; the UI includes a short‑lived session/JWT when calling the runtime route.
3) The agent server validates the JWT, resolves the user ID, and builds an agent context.
4) The agent selects a model, interprets the message, and determines if tools are needed.
5) If tools are needed, the server asks Composio for the user’s connections; Composio returns scoped MCP tool sessions.
6) The agent makes tool calls through MCP; results stream back to the agent.
7) The agent streams tokens/responses to the frontend via CopilotKit.
8) The UI renders intermediate tool status and the final answer, preserving conversation state.

---

## Authentication & Identity

- Supabase provides OAuth and issues JWTs consumed by the agent server.
- The server validates the token (audience/issuer/secret) and stores user info in request context.
- The same user ID is used to resolve Composio connections so tools run with the correct user account.

---

## Tools, MCP, and Connections

- Composio acts as the MCP gateway; configured toolsets are injected per agent.
- Users can link/unlink external accounts from the UI (Connections page).
- Each agent can specify which MCP tool configs it requires; the server adds connection instructions to the prompt when needed.

---

## Quick Start (Local)

Prerequisites
- Node.js 18.18+ and npm
- Python 3.13.1
- Supabase project (URL + anon key + JWT secret)
- API keys for your chosen LLM provider(s)
- Optional: Composio account for MCP tools

1) Agent Server
- `cd agent_service`
- `python -m venv .venv && source .venv/bin/activate`
- `pip install -r requirements.lock`
- Copy `.env.example` to `.env` and fill in Supabase, model, and Composio variables
- Start: `python app.py` (default http://localhost:8000)

2) Frontend UI
- `cd copilotkit-ui/copilotkit-ui-adk-agent-standalone`
- `npm install`
- Copy `.env.local.example` to `.env.local` and set:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `COPILOTKIT_RUNTIME_ORIGIN` → `http://localhost:8000`
  - `COPILOTKIT_PUBLIC_LICENSE_KEY`
  - Optional: `COMPOSIO_API_KEY`
- Start: `npm run dev` (http://localhost:3000)

Open the app at http://localhost:3000, sign in, and pick an agent to chat.

---

## Agents

This template ships with two example agents to demonstrate multiple capabilities and toolsets:

- Event Organizer — plans events, uses calendar, email, and knowledge tools
- GitHub Issues Assistant — triages and manages issues/PRs in repositories

Adding a new agent is a matter of:
- Creating a new directory under `agent_service/agents/<your-agent>` with an ADK agent module
- Defining env variables for route, display, model, and MCP configs
- Adding the agent path in the frontend’s runtime proxy if you want it selectable in the UI

Both sub‑READMEs contain copy‑and‑pasteable scaffolds.

---

## Operations

- Health check: `GET agent_service: /healthz`
- List agents: `GET agent_service: /agents` (requires valid auth)
- API docs: `GET agent_service: /docs`
- Frontend connections page: `/connections`

Logging & Debugging
- Increase server verbosity with `LOG_LEVEL=DEBUG python app.py`
- Verify runtime URL and Supabase session in the browser network panel

---

## Deployment Notes

- Host the agent server behind HTTPS; keep secrets in your platform’s secret store.
- Update Supabase OAuth redirect URIs for your production domain.
- Ensure the UI can reach the agent server’s public origin (`COPILOTKIT_RUNTIME_ORIGIN`).
- If using MCP tools, set Composio keys on both server and gateway as required.

---

## Where To Go Next

- Frontend details: `copilotkit-ui/copilotkit-ui-adk-agent-standalone/README.md`
- Agent server details: `agent_service/README.md`
- A conceptual/architecture deep‑dive will be covered in the accompanying blog post.
