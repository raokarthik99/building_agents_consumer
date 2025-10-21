import type { NextRequest } from "next/server";

/**
 * Resolve the effective origin for requests, accounting for reverse proxies (Render),
 * optional environment overrides, and local development defaults.
 */
export function resolveRequestOrigin(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (envOrigin) {
    return envOrigin;
  }

  if (forwardedHost) {
    const protocol = req.nextUrl.protocol.replace(/:$/, "");
    return `${protocol}://${forwardedHost}`;
  }

  return req.nextUrl.origin;
}
