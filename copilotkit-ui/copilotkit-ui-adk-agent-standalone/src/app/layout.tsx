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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <AppHeader user={user} />
          <CopilotKit runtimeUrl="/api/copilotkit" agent="main_agent">
            <main className="flex flex-1 h-full flex-col">{children}</main>
          </CopilotKit>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
