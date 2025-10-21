import type { NextRequest } from "next/server";

/**
 * Resolve the effective origin for requests, accounting for reverse proxies (Render)
 * and falling back to the request's own origin when no forwarding headers are present.
 */
export function resolveRequestOrigin(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (forwardedHost) {
    const protocol = req.nextUrl.protocol.replace(/:$/, "");
    return `${protocol}://${forwardedHost}`;
  }

  return req.nextUrl.origin;
}
