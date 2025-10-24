import { NextRequest, NextResponse } from "next/server";
import {
  Composio,
  ValidationError,
  type ToolkitRetrieveResponse,
} from "@composio/core";

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

function parseSearchParamValue(value: string): unknown {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }

  const looksJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (looksJson) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to returning the raw string below
    }
  }

  return trimmed;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    return missingApiKey;
  }

  const url = new URL(req.url);
  const params = url.searchParams;
  const query: Record<string, unknown> = {};

  for (const key of new Set(params.keys())) {
    const values = params
      .getAll(key)
      .map(parseSearchParamValue)
      .filter((value): value is Exclude<unknown, undefined | null> => value !== undefined && value !== null);

    if (!values.length) {
      continue;
    }

    query[key] = values.length === 1 ? values[0] : values;
  }

  const composio = new Composio({ apiKey });

  try {
    const connectedAccounts = await composio.connectedAccounts.list(
      Object.keys(query).length ? query : undefined
    );

    const toolkitBySlug: Record<string, ToolkitRetrieveResponse> = {};
    const slugsToHydrate = new Set<string>();

    for (const item of connectedAccounts.items ?? []) {
      const slug =
        item.toolkit?.slug ??
        ((item as Record<string, unknown>).toolkitSlug as string | undefined);

      if (!slug) {
        continue;
      }

      if (item.toolkit) {
        toolkitBySlug[slug] = item.toolkit;
      }

      const hasLogo =
        item.toolkit?.meta?.logo &&
        typeof item.toolkit.meta.logo === "string" &&
        item.toolkit.meta.logo.trim().length > 0;

      if (!hasLogo) {
        slugsToHydrate.add(slug);
      }
    }

    await Promise.all(
      Array.from(slugsToHydrate, async (slug) => {
        const existing = toolkitBySlug[slug];
        const hasLogoAlready =
          existing?.meta?.logo &&
          typeof existing.meta.logo === "string" &&
          existing.meta.logo.trim().length > 0;

        if (hasLogoAlready) {
          return;
        }

        try {
          const toolkit = await composio.toolkits.get(slug);
          toolkitBySlug[slug] = toolkit;
        } catch (error) {
          console.warn(
            `Unable to load Composio toolkit details for slug "${slug}".`,
            error instanceof Error ? error.message : error
          );
        }
      })
    );

    return NextResponse.json({
      connectedAccounts,
      toolkits: Object.keys(toolkitBySlug).length ? toolkitBySlug : undefined,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message:
              error.message ||
              "The provided query parameters are invalid for this request.",
          },
        },
        { status: 400 }
      );
    }

    console.error(
      "Failed to list Composio connected accounts",
      error instanceof Error ? error : { error }
    );

    return NextResponse.json(
      {
        error: {
          code: "UNKNOWN",
          message: "Unable to retrieve the list of connected accounts.",
        },
      },
      { status: 500 }
    );
  }
}
