import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ValidatedAuth = {
  user: User | null;
  accessToken: string | null;
};

// Validates the authenticated user via Supabase Auth and returns
// a trusted user object and corresponding access token if available.
// If a Bearer token is provided, it is validated with Supabase when no
// cookie-authenticated user is present.
export async function getValidatedUserAndToken(
  supabase: SupabaseClient,
  bearerToken?: string
): Promise<ValidatedAuth> {
  // Validate/refresh cookie session via Supabase Auth server
  const {
    data: { user: cookieUser },
  } = await supabase.auth.getUser();

  if (cookieUser) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      user: cookieUser,
      accessToken: session?.access_token ?? null,
    };
  }

  // Fallback to validating the provided Bearer token
  if (bearerToken) {
    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);
    return { user, accessToken: user ? bearerToken : null };
  }

  return { user: null, accessToken: null };
}

