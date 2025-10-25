"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuId = "app-header-profile-menu";
  const mobileNavId = "app-header-mobile-nav";

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
      setIsProfileMenuOpen(false);
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

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [user?.id]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileNavOpen]);

  const navigation = [
    { href: "/", label: "Chat" },
    { href: "/connections", label: "Manage connections" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/70 backdrop-blur">
      <div className="flex w-full items-center justify-between gap-4 px-5 py-3 md:px-8">
        <div className="flex items-center gap-3 md:gap-6">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            aria-label={`${isMobileNavOpen ? "Close" : "Open"} main navigation`}
            aria-controls={mobileNavId}
            aria-expanded={isMobileNavOpen}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 md:hidden"
          >
            <span aria-hidden className="relative block h-4 w-4">
              <span
                className={`absolute top-0 block h-0.5 w-full rounded bg-current transition-transform duration-200 ease-out ${
                  isMobileNavOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute top-1/2 block h-0.5 w-full -translate-y-1/2 rounded bg-current transition-opacity duration-200 ease-out ${
                  isMobileNavOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute bottom-0 block h-0.5 w-full rounded bg-current transition-transform duration-200 ease-out ${
                  isMobileNavOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
          <Link
            href="/"
            className="text-sm font-semibold text-slate-900 transition hover:text-slate-600"
            aria-label="Agent Chat Workspace home"
          >
            Agent Chat Workspace
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {navigation.map(({ href, label }) => {
              const isActive =
                pathname === href ||
                (href !== "/" && pathname?.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`font-medium transition ${
                    isActive
                      ? "text-slate-900"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        {user ? (
          <div className="flex flex-col items-end gap-2">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                aria-controls={isProfileMenuOpen ? profileMenuId : undefined}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
              >
                <span className="sr-only">Open profile menu</span>
                <span className="relative h-9 w-9 overflow-hidden rounded-full bg-slate-100">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-600">
                      {initials}
                    </span>
                  )}
                </span>
              </button>
              {isProfileMenuOpen ? (
                <div
                  id={profileMenuId}
                  role="menu"
                  aria-label="Profile menu"
                  className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="border-t border-slate-200" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>{isSigningOut ? "Signing out…" : "Sign out"}</span>
                  </button>
                </div>
              ) : null}
            </div>
            {error ? (
              <span className="text-xs text-red-600" role="alert">
                {error}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs font-medium text-slate-500">
            Sign in to continue
          </span>
        )}
      </div>
      {isMobileNavOpen ? (
        <div className="border-t border-slate-200 bg-white px-5 py-3 md:hidden">
          <nav
            id={mobileNavId}
            aria-label="Mobile navigation"
            className="flex flex-col gap-2 text-sm"
          >
            {navigation.map(({ href, label }) => {
              const isActive =
                pathname === href ||
                (href !== "/" && pathname?.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`rounded-md px-2 py-2 font-medium transition ${
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
