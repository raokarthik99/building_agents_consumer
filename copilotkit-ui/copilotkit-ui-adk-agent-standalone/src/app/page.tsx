import "@copilotkit/react-ui/styles.css";
import { CopilotChat } from "@copilotkit/react-ui";
import { ClearChatButton } from "@/components/ClearChatButton";

export default async function YourApp() {
  return (
    <div className="flex flex-1 flex-col px-5 py-6 md:px-8 gap-4">
      <div className="flex items-center justify-end">
        <ClearChatButton />
      </div>
      <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CopilotChat
          labels={{
            title: "Your Assistant",
            initial: "Hi! 👋 How can I assist you today?",
          }}
          className="flex min-h-full w-full flex-col"
        />
      </div>
    </div>
  );
}
