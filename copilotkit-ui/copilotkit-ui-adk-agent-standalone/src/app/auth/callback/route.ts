import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { supabaseConfig } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const error = requestUrl.searchParams.get("error");

  const redirectUrl = new URL(next, requestUrl);

  if (error || !code) {
    if (error) {
      console.error("Supabase OAuth callback error:", error);
      redirectUrl.searchParams.set("authError", error);
    }
    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore
          .getAll()
          .map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
  });

  const {
    error: exchangeError,
    data: { session },
  } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !session) {
    if (exchangeError) {
      console.error("Supabase session exchange failed:", exchangeError);
      redirectUrl.searchParams.set("authError", "signin_failed");
    } else {
      redirectUrl.searchParams.set("authError", "session_missing");
    }
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
