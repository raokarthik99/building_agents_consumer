"use client";

import {
  CatchAllActionRenderProps,
  useRenderToolCall,
} from "@copilotkit/react-core";
import { ComposioConnectionContent } from "@/components/ComposioConnectionRenderer";
import { useEffect, useState } from "react";

type ToolStatus = "inProgress" | "executing" | "complete";

type StatusMeta = {
  icon: string;
  label: string;
  badgeClass: string;
  description: string;
  detail: string;
};

const STATUS_META: Record<ToolStatus, StatusMeta> = {
  inProgress: {
    icon: "🧠",
    label: "In Progress",
    badgeClass: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    description: "The agent is preparing this tool call.",
    detail: "Still lining things up—hold tight for a moment.",
  },
  executing: {
    icon: "⚙️",
    label: "Running",
    badgeClass: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200",
    description: "The tool is currently running.",
    detail: "The tool is executing; I'll share the outcome shortly.",
  },
  complete: {
    icon: "✅",
    label: "Completed",
    badgeClass:
      "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    description: "The tool finished successfully.",
    detail: "All done. Review the payload below for the full response.",
  },
};

const ERROR_META: StatusMeta = {
  icon: "⚠️",
  label: "Failed",
  badgeClass: "bg-rose-100 text-rose-600 ring-1 ring-inset ring-rose-200",
  description: "I ran into an issue running this tool.",
  detail: "Check the result payload below for the error details.",
};

function toToolStatus(status: unknown): ToolStatus {
  if (status === "executing" || status === "complete") {
    return status;
  }
  return "inProgress";
}

function formatTitle(rawName: string) {
  return rawName
    ?.replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^\w|\s\w/g, (char) => char.toUpperCase());
}

function safeJSONStringify(value: unknown): string {
  if (value === undefined || value === null) {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function hasStructuredContent(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Object.keys(value as Record<string, unknown>).length > 0;
}

function extractErrorMessage(result: unknown): string | undefined {
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const maybeError = (result as Record<string, unknown>).error;

  if (!maybeError) {
    return undefined;
  }

  if (typeof maybeError === "string") {
    return maybeError;
  }

  if (
    typeof maybeError === "object" &&
    maybeError !== null &&
    "message" in maybeError &&
    typeof (maybeError as { message?: unknown }).message === "string"
  ) {
    return (maybeError as { message: string }).message;
  }

  try {
    return JSON.stringify(maybeError);
  } catch {
    return undefined;
  }
}

type ToolCallCardProps = {
  data: CatchAllActionRenderProps;
};

function ToolCallCard({ data }: ToolCallCardProps) {
  const { name, args, result, status } = data;
  const statusKey = toToolStatus(status);
  const [isOpen, setIsOpen] = useState(statusKey !== "complete");
  const isComposio = name === "COMPOSIO_INITIATE_CONNECTION";

  useEffect(() => {
    if (statusKey === "complete") {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [statusKey]);

  const errorMessage = extractErrorMessage(result);
  const meta = errorMessage ? ERROR_META : STATUS_META[statusKey];
  const statusDetail = errorMessage ?? meta.detail;

  const showArgs = hasStructuredContent(args);
  const argsJson = showArgs ? safeJSONStringify(args) : "{}";

  const hasResult = result !== undefined && result !== null;
  const resultJson = hasResult ? safeJSONStringify(result) : "";

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white shadow-sm">
          🛠️
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {formatTitle(name)}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${meta.badgeClass}`}
        >
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </span>
        <span
          aria-hidden="true"
          className="ml-1 text-sm font-semibold text-slate-400"
        >
          {isOpen ? "▾" : "▸"}
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          {showArgs ? (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Arguments
              </h3>
              <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-800 shadow-inner">
                {argsJson}
              </pre>
            </section>
          ) : null}

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Status
            </h3>
            <p className="mt-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <span>{meta.icon}</span>
              <span>{statusDetail}</span>
            </p>
          </section>

          {hasResult ? (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Result
              </h3>
              <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-800 shadow-inner">
                {resultJson}
              </pre>
            </section>
          ) : null}
        </div>
      ) : null}

      {isComposio ? (
        <section>
          <ComposioConnectionContent {...data} />
        </section>
      ) : null}
    </div>
  );
}

export function ToolCallDetailsRenderer() {
  useRenderToolCall({
    name: "*",
    render: (props) => {
      const data = props as CatchAllActionRenderProps;

      return <ToolCallCard key={`${data.name}-${data.status}`} data={data} />;
    },
  });

  return null;
}
