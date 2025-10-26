export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  initialMessage: string;
  icon?: string;
}

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  "event-organizer": {
    id: "event-organizer",
    name: "Event Organizer",
    description: "Helps you plan and manage events",
    initialMessage: "Hi! I'm your Event Organizer assistant. I can help you plan events, manage schedules, coordinate with attendees, and handle all the details to make your event a success. What kind of event would you like to organize?",
    icon: "🎉"
  },
  "github-issues": {
    id: "github-issues",
    name: "GitHub Issues Assistant",
    description: "Helps manage GitHub issues and pull requests",
    initialMessage: "Hello! I'm your GitHub Issues assistant. I can help you create, manage, and track GitHub issues, review pull requests, and keep your project organized. What would you like to work on today?",
    icon: "🐙"
  }
};

export const DEFAULT_AGENT = "event-organizer";

export function getAgentConfig(agentId: string): AgentConfig {
  return AGENT_CONFIGS[agentId] || AGENT_CONFIGS[DEFAULT_AGENT];
}

export function getAllAgents(): AgentConfig[] {
  return Object.values(AGENT_CONFIGS);
}
