"use client";

import "@copilotkit/react-ui/styles.css";
import { CopilotChat } from "@copilotkit/react-ui";
import { ClearChatButton } from "@/components/ClearChatButton";
import { ToolCallDetailsRenderer } from "@/components/ToolCallDetailsRenderer";

export function ChatClient() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden px-5 py-6 md:px-8">
      <div className="flex-shrink-0">
        <ToolCallDetailsRenderer />
      </div>
      <div className="flex items-center justify-end flex-shrink-0">
        <ClearChatButton />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CopilotChat
          labels={{
            title: "Your Assistant",
            initial: "Hi! 👋 How can I assist you today?",
          }}
          className="flex h-full min-h-0 w-full flex-col"
          suggestions={[
            {
              title: "Top trending github issues",
              message:
                "List top commented open github issues in google/adk-python",
            },
          ]}
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
