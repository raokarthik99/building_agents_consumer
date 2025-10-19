import "./globals.css";
import { ReactNode } from "react";
import { CopilotKit } from "@copilotkit/react-core";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full w-full">
      <body className="h-full w-full">
        {/* This points to the runtime we setup in the previous step */}
        <CopilotKit runtimeUrl="/api/copilotkit" agent="main_agent">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
