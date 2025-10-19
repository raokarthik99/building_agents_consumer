import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from composio import Composio
from fastapi import FastAPI
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint

load_dotenv()

composio = Composio(api_key=os.getenv("COMPOSIO_API_KEY"))

# Generate server instance for user
instance = composio.mcp.generate(
    user_id="pg-test-5bdef2ff-710f-4109-96a7-790c6333b8ba",
    mcp_config_id="a330ff09-f432-45a2-9378-3c2b172bd33a",
)

print(f"MCP Server URL: {instance['url']}")

root_agent = Agent(
    name="github_issues_agent",
    model="gemini-2.5-pro",
    description=("Agent specialized in managing GitHub issues workflows."),
    instruction=(
        "You are a GitHub issues specialist. Handle issue triage, creation, updates, and summaries. "
        "If user has not connected account yet for the given tool, automatically initiate an initialize "
        "connection request if possible and available/applicable for that tool."
    ),
    tools=[
        McpToolset(
            connection_params=StreamableHTTPConnectionParams(
                url=instance["url"],
            ),
        ),
    ],
)

# Create ADK middleware agent instance
adk_agent_ag_ui_wrapper = ADKAgent(
    adk_agent=root_agent,
    app_name="main_agent",
    user_id="pg-test-5bdef2ff-710f-4109-96a7-790c6333b8ba",
    session_timeout_seconds=3600,
    use_in_memory_services=True,
)
# Create FastAPI app
app = FastAPI(title="GitHub Issues Agent")
# Add the ADK endpoint
add_adk_fastapi_endpoint(app, adk_agent_ag_ui_wrapper, path="/")

# If you want the server to run on invocation, you can do the following:
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8000)
