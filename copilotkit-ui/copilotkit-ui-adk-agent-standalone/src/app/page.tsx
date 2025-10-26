import { ChatClient } from "@/components/ChatClient";
import { getAgentConfig } from "@/lib/agents";

export default function ChatPage() {
  // Use the same agent as defined in layout.tsx
  const agentId = "event-organizer";
  const agentConfig = getAgentConfig(agentId);

  return <ChatClient agentConfig={agentConfig} />;
}
