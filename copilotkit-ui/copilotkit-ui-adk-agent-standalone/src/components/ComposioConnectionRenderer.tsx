"use client";

import { useRenderToolCall } from "@copilotkit/react-core";

const STATUS_STYLES = {
  SUCCESS: "bg-emerald-100 text-emerald-600",
  FAILED: "bg-rose-100 text-rose-600",
  default: "bg-indigo-100 text-indigo-600",
} as const;

export function ComposioConnectionRenderer() {
  useRenderToolCall({
    name: "COMPOSIO_INITIATE_CONNECTION",
    render: ({ args, result, status }) => {
      if (status !== "complete") {
        return (
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                ⚙️
              </span>
              <div>
                <p className="text-sm font-medium">
                  We&apos;re getting things ready…
                </p>
                <p className="text-xs text-slate-500">
                  Sit tight for a moment while we prepare your Composio
                  connection.
                </p>
              </div>
              <span className="ml-auto animate-spin text-slate-400">⏳</span>
            </div>
          </div>
        );
      }

      const response = result?.data?.response_data;
      const error = result?.error;
      const humanReadableStatus = response?.status
        ?.toLowerCase()
        .split("_")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const statusBadgeClass =
        STATUS_STYLES[response?.status as keyof typeof STATUS_STYLES] ??
        STATUS_STYLES.default;

      if (error || !response) {
        return (
          <div className="max-w-md rounded-xl border border-rose-200 bg-white p-4 text-rose-600 shadow-sm">
            <p className="font-semibold">
              We couldn&apos;t start the connection.
            </p>
            <p className="text-sm text-rose-500">
              {error?.message ??
                "Try again in a moment, or reach out to support if this keeps happening."}
            </p>
          </div>
        );
      }

      return (
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-lg text-white">
              🔗
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-800">
                  {args?.provider ?? "Composio Connection"}
                </h3>
                {response?.status && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass}`}
                  >
                    {humanReadableStatus}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {response?.message ??
                  "Everything is set on our side. Follow the next step to wrap things up."}
              </p>
            </div>
          </div>

          {response?.redirect_url ? (
            <a
              href={response.redirect_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              Connect
            </a>
          ) : null}

          <p className="mt-3 text-xs text-slate-500">
            Once you&apos;re done, come back and ask the assistant to make sure
            the connection looks good.
          </p>
        </div>
      );
    },
  });

  return null;
}
