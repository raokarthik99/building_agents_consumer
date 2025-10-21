import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const next = url.searchParams.get("next") || "/";
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const origin =
    (forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : undefined) ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    url.origin;
  const redirectTo = new URL(next, origin);

  if (error) {
    redirectTo.searchParams.set("authError", "signin_failed");
  }

  const res = NextResponse.redirect(redirectTo);

  if (code && !error) {
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

    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      // If exchange fails, bubble an error back to the app UI
      redirectTo.searchParams.set("authError", "signin_failed");
      return NextResponse.redirect(redirectTo);
    }
  }

  return res;
}
