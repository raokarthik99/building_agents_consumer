import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/SignInPanel";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const supabase = await getSupabaseServerClient();
  const [{ data: { user } }, resolvedSearchParams] = await Promise.all([
    supabase.auth.getUser(),
    searchParams,
  ]);

  const nextParam = resolvedSearchParams?.next;
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam ?? "/";

  if (user) {
    redirect(next);
  }

  const authErrorParam = resolvedSearchParams?.authError;
  const authError = Array.isArray(authErrorParam)
    ? authErrorParam[0]
    : authErrorParam ?? null;

  return <SignInPanel errorMessage={authError} />;
}

