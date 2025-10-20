import { GoogleSignInButton } from "./GoogleSignInButton";

type SignInPanelProps = {
  errorMessage?: string | null;
};

export function SignInPanel({ errorMessage }: SignInPanelProps) {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            Sign in / Sign up
          </h1>
          <p className="text-xs text-slate-500">
            Continue with one of the following options to enter your agent chat.
          </p>
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700"
            >
              {errorMessage === "signin_failed"
                ? "Something went wrong while completing the sign-in flow. Please try again."
                : "We couldn’t complete your sign-in. Please try again."}
            </div>
          )}
          <GoogleSignInButton fullWidth />
        </div>
      </div>
    </div>
  );
}
