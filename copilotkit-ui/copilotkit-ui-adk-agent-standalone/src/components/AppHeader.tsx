"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AppHeaderProps = {
  user: User | null;
};

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    "Anonymous";

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "UO";

  const handleSignOut = async () => {
    try {
      setError(null);
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.refresh();
    } catch (signOutError) {
      console.error(signOutError);
      setError("Unable to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur">
      <div className="flex w-full items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-900 transition hover:text-slate-600"
          aria-label="Agent Chat Workspace home"
        >
          Agent Chat Workspace
        </Link>
        {user ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-600">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">
                    {displayName}
                  </span>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
            {error && (
              <span className="text-xs text-red-600" role="alert">
                {error}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs font-medium text-slate-500">
            Sign in to continue
          </span>
        )}
      </div>
    </header>
  );
}
