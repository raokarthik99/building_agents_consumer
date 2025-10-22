"use client";

import { useCopilotChat, useCopilotContext } from "@copilotkit/react-core";
import { useCallback, useEffect, useState } from "react";

export function ClearChatButton() {
  const { reset } = useCopilotChat();
  const { setThreadId } = useCopilotContext();
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const handleClear = useCallback(() => {
    const newThreadId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setThreadId(newThreadId);
    reset();
    setStatus("success");
  }, [reset, setThreadId]);

  useEffect(() => {
    if (status !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatus("idle");
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [status]);

  return (
    <button
      type="button"
      onClick={handleClear}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:scale-[0.98]"
      aria-label="Clear chat history"
      title={status === "success" ? "Chat cleared" : "Clear chat history"}
    >
      <span aria-hidden className="text-base leading-none">
        {status === "success" ? "✅" : "🧹"}
      </span>
      <span aria-live="polite" className="text-slate-800">
        {status === "success" ? "Chat cleared!" : "Clear chat"}
      </span>
    </button>
  );
}
