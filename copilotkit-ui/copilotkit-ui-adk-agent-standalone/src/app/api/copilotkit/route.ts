import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getValidatedUserAndToken } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

// 1. You can use any service adapter here for multi-agent support. We use
//    the empty adapter since we're only using one agent.
const serviceAdapter = new ExperimentalEmptyAdapter();
const agentPaths = {
  "github-issues": "/agents/github-issues",
} as const;

// 3. Build a Next.js API route that handles the CopilotKit runtime requests.
export const POST = async (req: NextRequest) => {
  // Authenticate via Supabase: prefer cookie session; validate fallback Bearer token if provided
  const supabase = await getSupabaseServerClient();
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;

  const { user, accessToken } = await getValidatedUserAndToken(
    supabase,
    bearerToken
  );

  if (!user || !accessToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const runtimeOrigin = process.env.COPILOTKIT_RUNTIME_ORIGIN;

  if (!runtimeOrigin) {
    console.error("COPILOTKIT_RUNTIME_ORIGIN environment variable is not set.");
    return new NextResponse("Server misconfiguration", { status: 500 });
  }

  const authorization = `Bearer ${accessToken}`;

  const runtime = new CopilotRuntime({
    agents: Object.fromEntries(
      Object.entries(agentPaths).map(([agentId, path]) => [
        agentId,
        new HttpAgent({
          url: new URL(path, runtimeOrigin).toString(),
          headers: { Authorization: authorization },
        }),
      ])
    ),
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
