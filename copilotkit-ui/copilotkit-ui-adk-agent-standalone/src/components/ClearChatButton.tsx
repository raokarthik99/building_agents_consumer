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
      variant="secondary"
      className="font-medium shadow-sm active:scale-[0.98]"
      aria-label="Clear chat history"
      title={status === "success" ? "Chat cleared" : "Clear chat history"}
      disabled={isLoading}
    >
      <span aria-hidden className="text-base leading-none">
        {status === "success" ? "✅" : "🧹"}
      </span>
      <span aria-live="polite" className="text-slate-800">
        {status === "success" ? "Chat cleared!" : "Clear chat"}
      </span>
    </Button>
  );
}
