import { NextRequest, NextResponse } from "next/server";
import {
  Composio,
  ComposioConnectedAccountNotFoundError,
  ComposioToolkitFetchError,
  ComposioToolkitNotFoundError,
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

export async function DELETE(
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
    const response = await composio.connectedAccounts.delete(nanoid);

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
      "Failed to delete Composio connected account",
      error instanceof Error ? error : { error }
    );

    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN",
          message: "Unable to delete the Composio connected account.",
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(
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
    const connectedAccount = await composio.connectedAccounts.get(nanoid);
    const slug = connectedAccount.toolkit?.slug;
    let toolkit = null;

    if (slug) {
      try {
        toolkit = await composio.toolkits.get(slug);
      } catch (error) {
        if (
          error instanceof ComposioToolkitNotFoundError ||
          error instanceof ComposioToolkitFetchError
        ) {
          console.warn(
            `Composio toolkit details unavailable for slug "${slug}".`
          );
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({ connectedAccount, toolkit });
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
      "Failed to retrieve Composio connected account",
      error instanceof Error ? error : { error }
    );

    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN",
          message: "Unable to retrieve the Composio connected account.",
        },
      },
      { status: 500 }
    );
  }
}
