import "./globals.css";
import { CopilotKit } from "@copilotkit/react-core";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  // Authenticate user data by contacting Supabase Auth server
  const [
    {
      data: { user },
    },
    {
      data: { session },
    },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const copilotHeaders = session
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;
  const copilotProperties = session
    ? { authorization: session.access_token }
    : undefined;

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <AppHeader user={user} />
          <CopilotKit
            runtimeUrl="/api/copilotkit"
            agent="github-issues"
            headers={copilotHeaders}
            properties={copilotProperties}
          >
            <main className="flex flex-1 h-full flex-col">{children}</main>
          </CopilotKit>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
