import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseConfig } from "@/lib/supabase/config";

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

  // Calling getUser here refreshes the session if needed by setting cookies on res
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect all API routes: require either cookie session user or a valid Bearer token
  if (url.pathname.startsWith("/api/")) {
    if (!user) {
      const authHeader = req.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : undefined;

      if (bearerToken) {
        const { data } = await supabase.auth.getUser(bearerToken);
        if (!data.user) {
          return new NextResponse("Unauthorized", { status: 401 });
        }
        return res;
      }

      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  // Public paths that should not trigger auth redirects
  const publicPaths = new Set(["/signin", "/auth/callback"]);
  const isPublic = publicPaths.has(url.pathname);
  const isStatic =
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/favicon.ico") ||
    /\.[a-zA-Z0-9]+$/.test(url.pathname);

  // For all other pages, redirect to /signin if not authenticated
  if (!url.pathname.startsWith("/api/") && !isPublic && !isStatic) {
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
