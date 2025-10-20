"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type GoogleSignInButtonProps = {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
};

export function GoogleSignInButton({
  variant = "primary",
  fullWidth = false,
}: GoogleSignInButtonProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const origin = window.location.origin;
      const current = new URL(window.location.href);
      const next = current.searchParams.get("next") || "/";
      const {
        data: { url },
        error: signInError,
      } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (signInError) {
        throw signInError;
      }

      if (url) {
        window.location.assign(url);
        return;
      }

      setIsLoading(false);
    } catch (signInError) {
      console.error(signInError);
      setError("Unable to start Google sign-in. Please try again.");
      setIsLoading(false);
    }
  };

  const buttonClasses = [
    "relative inline-flex items-center justify-center overflow-hidden rounded-full cursor-pointer transition focus:outline-none focus-visible:ring focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60",
    fullWidth ? "w-full" : "w-auto",
    variant === "secondary" ? "bg-transparent" : "bg-transparent",
  ].join(" ");

  return (
    <div className={fullWidth ? "w-full" : "w-auto"}>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label="Continue with Google"
        className={buttonClasses}
        style={{ padding: 0, border: "none" }}
      >
        <span
          className={`flex items-center ${
            fullWidth ? "w-full justify-center" : ""
          }`}
        >
          <span className="sr-only">Continue with Google</span>
          <Image
            src="/google-signin-light.svg"
            alt=""
            width={189}
            height={40}
            className={isLoading ? "opacity-70" : undefined}
            aria-hidden="true"
            priority={false}
          />
        </span>
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
