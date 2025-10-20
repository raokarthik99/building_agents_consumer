import "./globals.css";
import { CopilotKit } from "@copilotkit/react-core";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getValidatedUserAndToken } from "@/lib/supabase/auth";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  // Authenticate via Supabase Auth and return a trusted user and token
  const { user, accessToken } = await getValidatedUserAndToken(supabase);

  const copilotHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : undefined;
  const copilotProperties = accessToken
    ? { authorization: accessToken }
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
