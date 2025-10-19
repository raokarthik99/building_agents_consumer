import "@copilotkit/react-ui/styles.css";
import { CopilotChat } from "@copilotkit/react-ui";

export default function YourApp() {
  return (
    <CopilotChat
      labels={{
        title: "Your Assistant",
        initial: "Hi! 👋 How can I assist you today?",
      }}
      className="h-full w-full"
    />
  );
}
