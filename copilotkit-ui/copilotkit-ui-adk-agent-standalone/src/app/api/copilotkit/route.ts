import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getValidatedUserAndToken } from "@/lib/supabase/auth";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// 1. You can use any service adapter here for multi-agent support. We use
//    the empty adapter since we're only using one agent.
const serviceAdapter = new ExperimentalEmptyAdapter();

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

  const authorization = `Bearer ${accessToken}`;

  const runtime = new CopilotRuntime({
    agents: {
      "github-issues": new HttpAgent({
        url: "http://localhost:8000/agents/github-issues",
        headers: { Authorization: authorization },
      }),
    },
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
