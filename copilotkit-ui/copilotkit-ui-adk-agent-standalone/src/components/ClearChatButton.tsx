"use client";

import { useCallback, useEffect, useState } from "react";
import { useCopilotChat, useCopilotContext } from "@copilotkit/react-core";

import { Button } from "@/components/Button";

export function ClearChatButton() {
  const { reset } = useCopilotChat();
  const { setThreadId, isLoading } = useCopilotContext();
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const handleClear = useCallback(() => {
    if (isLoading) {
      return;
    }

    const newThreadId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setThreadId(newThreadId);
    reset();
    setStatus("success");
  }, [reset, setThreadId, isLoading]);

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
    <Button
      type="button"
      onClick={handleClear}
      variant="ghost"
      size="sm"
      className="gap-1 font-normal text-slate-500 hover:text-slate-700"
      aria-label="Clear chat history"
      title={status === "success" ? "Chat cleared" : "Clear chat history"}
      disabled={isLoading}
    >
      <span aria-hidden className="text-sm leading-none">
        {status === "success" ? "✅" : "🧹"}
      </span>
      <span aria-live="polite" className="text-xs font-medium">
        {status === "success" ? "Chat cleared!" : "Clear chat"}
      </span>
    </Button>
  );
}
