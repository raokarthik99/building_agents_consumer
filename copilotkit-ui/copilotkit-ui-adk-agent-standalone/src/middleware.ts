import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseConfig } from "@/lib/supabase/config";
import { getValidatedUserAndToken } from "@/lib/supabase/auth";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Prepare a response we can mutate cookies on; default to continuing the request
  const res = NextResponse.next();

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  const isApi = url.pathname.startsWith("/api/");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;

  // Validate cookie user; for API routes also accept/validate Bearer token
  const { user } = await getValidatedUserAndToken(
    supabase,
    isApi ? bearerToken : undefined
  );

  // Protect API routes: require authenticated cookie user or a valid Bearer token
  if (isApi && !user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Public paths that should not trigger auth redirects
  const publicPaths = new Set(["/signin", "/auth/callback"]);
  const isPublic = publicPaths.has(url.pathname);
  const isStatic =
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/favicon.ico") ||
    /\.[a-zA-Z0-9]+$/.test(url.pathname);

  // For all other pages, redirect to /signin if not authenticated
  if (!isApi && !isPublic && !isStatic) {
    if (!user) {
      const signinUrl = new URL("/signin", req.url);
      const next = url.pathname + (url.search || "");
      signinUrl.searchParams.set("next", next);
      return NextResponse.redirect(signinUrl);
    }
  }

  return res;
}

export const config = {
  // Run on API route we want to protect and on auth callback for cookie refresh behavior
  matcher: [
    "/api/:path*",
    "/auth/callback",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
