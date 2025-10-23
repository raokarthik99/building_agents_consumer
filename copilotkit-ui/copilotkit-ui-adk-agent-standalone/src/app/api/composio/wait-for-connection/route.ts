import { NextRequest, NextResponse } from "next/server";
import {
  Composio,
  ComposioConnectedAccountNotFoundError,
  ConnectionRequestFailedError,
  ConnectionRequestTimeoutError,
} from "@composio/core";

const BAD_REQUEST = NextResponse.json(
  {
    error: {
      code: "INVALID_REQUEST",
      message: "A valid connectedAccountId string is required.",
    },
  },
  { status: 400 }
);

const missingApiKey = NextResponse.json(
  {
    error: {
      code: "MISSING_API_KEY",
      message:
        "COMPOSIO_API_KEY environment variable is not set on the server.",
    },
  },
  { status: 500 }
);

export async function POST(req: NextRequest) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return BAD_REQUEST;
  }

  const { connectedAccountId, timeoutMs } = (payload ?? {}) as {
    connectedAccountId?: unknown;
    timeoutMs?: unknown;
  };

  if (typeof connectedAccountId !== "string" || !connectedAccountId.trim()) {
    return BAD_REQUEST;
  }

  const apiKey = process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    return missingApiKey;
  }

  const composio = new Composio({ apiKey });

  try {
    const timeout =
      typeof timeoutMs === "number" && Number.isFinite(timeoutMs)
        ? timeoutMs
        : undefined;
    const connectedAccount =
      await composio.connectedAccounts.waitForConnection(
        connectedAccountId,
        timeout
      );

    return NextResponse.json({ connectedAccount });
  } catch (error) {
    if (error instanceof ConnectionRequestTimeoutError) {
      return NextResponse.json(
        {
          error: { code: "TIMEOUT", message: error.message },
        },
        { status: 504 }
      );
    }

    if (error instanceof ComposioConnectedAccountNotFoundError) {
      return NextResponse.json(
        {
          error: { code: "NOT_FOUND", message: error.message },
        },
        { status: 404 }
      );
    }

    if (error instanceof ConnectionRequestFailedError) {
      return NextResponse.json(
        {
          error: {
            code: "FAILED",
            message: error.message,
          },
        },
        { status: 409 }
      );
    }

    console.error(
      "Failed to wait for Composio connection",
      error instanceof Error ? error : { error }
    );

    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN",
          message: "Unable to verify the Composio connection.",
        },
      },
      { status: 500 }
    );
  }
}
