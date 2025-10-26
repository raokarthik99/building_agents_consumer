"use client";

import "@copilotkit/react-ui/styles.css";
import { CopilotChat } from "@copilotkit/react-ui";
import { ClearChatButton } from "@/components/ClearChatButton";
import { ToolCallDetailsRenderer } from "@/components/ToolCallDetailsRenderer";
import type { AgentConfig } from "@/lib/agents";

interface ChatClientProps {
  agentConfig: AgentConfig;
}

export function ChatClient({ agentConfig }: ChatClientProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-0.5 overflow-hidden px-2 py-1 md:px-3">
      <div className="flex-shrink-0">
        <ToolCallDetailsRenderer />
      </div>
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agentConfig.icon}</span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {agentConfig.name}
            </h2>
            <p className="text-xs text-slate-500">{agentConfig.description}</p>
          </div>
        </div>
        <ClearChatButton />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CopilotChat
          labels={{
            title: agentConfig.name,
            initial: agentConfig.initialMessage,
          }}
          className="flex h-full min-h-0 w-full flex-col"
          // Leaving feedback related actions/buttons as undefined to avoid showing these to the user as we don't have the feedback system hooked up yet.
          icons={{
            thumbsDownIcon: undefined,
            thumbsUpIcon: undefined,
          }}
          onThumbsDown={undefined}
          onThumbsUp={undefined}
        />
      </div>
    </div>
  );
}
