import { NextRequest, NextResponse } from "next/server";
import {
  Composio,
  ComposioConnectedAccountNotFoundError,
} from "@composio/core";

const invalidRequest = NextResponse.json(
  {
    error: {
      code: "INVALID_REQUEST",
      message: "A valid connected account nanoid is required.",
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

export async function POST(
  _req: NextRequest,
  context: { params: { nanoid?: string } }
) {
  const nanoid = context.params.nanoid;

  if (typeof nanoid !== "string" || !nanoid.trim()) {
    return invalidRequest;
  }

  const apiKey = process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    return missingApiKey;
  }

  const composio = new Composio({ apiKey });

  try {
    const response = await composio.connectedAccounts.refresh(nanoid);

    return NextResponse.json({ response });
  } catch (error) {
    if (error instanceof ComposioConnectedAccountNotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    console.error(
      "Failed to refresh Composio connected account",
      error instanceof Error ? error : { error }
    );

    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN",
          message: "Unable to refresh the Composio connected account.",
        },
      },
      { status: 500 }
    );
  }
}
