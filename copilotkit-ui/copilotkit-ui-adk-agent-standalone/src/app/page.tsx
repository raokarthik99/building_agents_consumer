import "@copilotkit/react-ui/styles.css";
import { CopilotChat } from "@copilotkit/react-ui";

import { SignInPanel } from "@/components/SignInPanel";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function YourApp({ searchParams }: PageProps) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const resolvedSearchParams = await searchParams;
    const authErrorParam = resolvedSearchParams?.authError;
    const authError = Array.isArray(authErrorParam)
      ? authErrorParam[0]
      : authErrorParam ?? null;
    return <SignInPanel errorMessage={authError} />;
  }

  return (
    <div className="flex flex-1 flex-col px-5 py-6 md:px-8">
      <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CopilotChat
          labels={{
            title: "Your Assistant",
            initial: "Hi! 👋 How can I assist you today?",
          }}
          className="flex min-h-full w-full flex-col"
        />
      </div>
    </div>
  );
}
