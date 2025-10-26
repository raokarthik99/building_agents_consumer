# 🤖 Agent Chat Workspace

A modern, production-ready chat interface for AI agents built with Next.js 15, CopilotKit, and Supabase. This application provides a secure, scalable foundation for deploying AI agents with multi-agent support, third-party integrations, and enterprise-grade authentication.

## ✨ What Makes This Special

- 🚀 **Multi-Agent Support** - Switch between different AI agents (Event Organizer, GitHub Issues Assistant, and more)
- 🔐 **Enterprise Authentication** - Secure Google OAuth with Supabase, complete with session management
- 🛠️ **Rich Tool Integration** - Connect to external services via Composio with visual tool call monitoring
- 📱 **Modern UI/UX** - Beautiful, responsive interface with real-time status updates
- 🔧 **Developer Friendly** - TypeScript-first, hot reloading, and comprehensive error handling
- 🌐 **Production Ready** - Built for scale with proper error boundaries and loading states

---

## 🏗️ Architecture Overview

### Frontend Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main chat interface
│   ├── layout.tsx                # Root layout with CopilotKit provider
│   ├── signin/page.tsx           # Google OAuth entry point
│   ├── connections/page.tsx      # Composio account management
│   └── api/                      # API routes
│       ├── copilotkit/route.ts   # CopilotKit runtime proxy
│       └── composio/             # Composio integration endpoints
├── components/                   # Reusable UI components
│   ├── ChatClient.tsx            # Main chat interface
│   ├── AppHeader.tsx             # Navigation and user menu
│   ├── ManageConnectionsView.tsx # Account management UI
│   └── ToolCallDetailsRenderer.tsx # Tool execution monitoring
└── lib/                          # Utilities and configurations
    ├── agents.ts                 # Agent configuration and management
    ├── supabase/                 # Authentication utilities
    └── composio/                 # Third-party integration helpers
```

### Key Components

- **🎯 Multi-Agent System** - Configurable agents with different capabilities and personalities
- **🔐 Authentication Layer** - Supabase-powered OAuth with session management
- **🔄 Real-time Chat** - CopilotKit-powered chat interface with tool call monitoring
- **🛠️ Integration Hub** - Composio-powered third-party service connections
- **📱 Responsive Design** - Mobile-first UI with desktop enhancements

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18.18+** (tested with v24.4.0)
- **npm 9+** or **yarn**
- **Supabase project** with Google OAuth enabled
- **CopilotKit ADK runtime** running locally or remotely
- **Composio account** (optional, for third-party integrations)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd copilotkit-ui-adk-agent-standalone
npm install
```

### 2. Environment Setup

```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

### 3. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with Google!

---

## 🤖 Agent Configuration

This application supports multiple AI agents, each with unique capabilities and personalities. Agents are configured in `src/lib/agents.ts`:

### Available Agents

| Agent                       | Description                   | Icon | Use Case                                        |
| --------------------------- | ----------------------------- | ---- | ----------------------------------------------- |
| **Event Organizer**         | Helps plan and manage events  | 🎉   | Event planning, scheduling, coordination        |
| **GitHub Issues Assistant** | Manages GitHub issues and PRs | 🐙   | Code review, issue tracking, project management |

### Adding New Agents

1. **Define the agent** in `src/lib/agents.ts`:

```typescript
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  "your-agent": {
    id: "your-agent",
    name: "Your Agent Name",
    description: "What your agent does",
    initialMessage: "Hello! I'm your assistant...",
    icon: "🚀",
  },
};
```

2. **Add the runtime path** in `src/app/api/copilotkit/route.ts`:

```typescript
const agentPaths = {
  "your-agent": "/agents/your-agent",
  // ... existing agents
} as const;
```

3. **Update the default agent** in `src/app/page.tsx`:

```typescript
const agentId = "your-agent"; // Change this
```

### Agent Runtime Requirements

Each agent must be available at: `{COPILOTKIT_RUNTIME_ORIGIN}/agents/{agent-id}`

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

| Variable                        | Required | Description                         | Example                                   |
| ------------------------------- | -------- | ----------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       | Your Supabase project URL           | `https://xyz.supabase.co`                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Supabase anonymous key              | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `COPILOTKIT_RUNTIME_ORIGIN`     | ✅       | ADK runtime base URL                | `http://localhost:8000`                   |
| `COPILOTKIT_PUBLIC_LICENSE_KEY` | ✅       | CopilotKit license key              | `your-license-key`                        |
| `COMPOSIO_API_KEY`              | ⚠️       | Composio API key (for integrations) | `your-composio-key`                       |
| `COPILOTKIT_TELEMETRY_DISABLED` | ❌       | Disable telemetry                   | `true`                                    |
| `DO_NOT_TRACK`                  | ❌       | Opt out of analytics                | `1`                                       |

### Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Enable Google OAuth**:
   - Go to Authentication → Providers
   - Enable Google provider
   - Add redirect URL: `http://localhost:3000/auth/callback`
3. **Get your credentials**:
   - Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### CopilotKit Runtime

Ensure your ADK runtime is running and accessible at the URL specified in `COPILOTKIT_RUNTIME_ORIGIN`. The application will connect to agents at:

- `{RUNTIME_ORIGIN}/agents/event-organizer`
- `{RUNTIME_ORIGIN}/agents/github-issues`

---

## 🛠️ Features Deep Dive

### Multi-Agent Chat Interface

- **Real-time messaging** with CopilotKit-powered chat UI
- **Tool call monitoring** with visual status indicators
- **Agent switching** with persistent conversation history
- **Responsive design** that works on all devices

### Account Management

- **Google OAuth** with secure session handling
- **Profile management** with avatar display
- **Session persistence** across browser refreshes
- **Automatic logout** on token expiration

### Third-Party Integrations

- **Composio-powered** service connections
- **Visual connection status** with real-time updates
- **Account refresh** and management capabilities
- **Popup-based OAuth** flows for new connections

---

## 📁 Project Structure

```
copilotkit-ui-adk-agent-standalone/
├── public/                     # Static assets (icons, images)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API endpoints
│   │   │   ├── copilotkit/     # CopilotKit runtime proxy
│   │   │   └── composio/       # Composio integration APIs
│   │   ├── auth/               # OAuth callback handling
│   │   ├── connections/        # Account management page
│   │   ├── signin/             # Google OAuth entry point
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── page.tsx            # Main chat interface
│   ├── components/             # Reusable UI components
│   │   ├── ChatClient.tsx      # Main chat interface
│   │   ├── AppHeader.tsx       # Navigation and user menu
│   │   ├── ManageConnectionsView.tsx # Account management
│   │   └── ToolCallDetailsRenderer.tsx # Tool monitoring
│   ├── lib/                    # Utilities and configurations
│   │   ├── agents.ts           # Agent configuration
│   │   ├── supabase/           # Authentication utilities
│   │   └── composio/           # Integration helpers
│   └── middleware.ts           # Authentication middleware
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and scripts
└── .env.local.example          # Environment template
```

## 🚀 Available Scripts

| Command         | Description                             |
| --------------- | --------------------------------------- |
| `npm run dev`   | Start development server with Turbopack |
| `npm run build` | Build production bundle                 |
| `npm run start` | Serve production build                  |
| `npm run lint`  | Run ESLint checks                       |

---

## 🚀 Deployment

### Environment Setup

1. **Set all environment variables** in your hosting platform
2. **Update Supabase redirect URLs** for your production domain
3. **Ensure HTTPS** for both your app and CopilotKit runtime
4. **Store secrets securely** using your platform's secret management

### Platform-Specific Notes

- **Vercel**: Add environment variables in project settings
- **Railway**: Use the dashboard to configure environment variables
- **Netlify**: Set environment variables in site settings

### Production Checklist

- [ ] All environment variables configured
- [ ] Supabase OAuth redirects updated
- [ ] CopilotKit runtime accessible via HTTPS
- [ ] Composio API key secured (if using integrations)
- [ ] Domain whitelisted in Supabase

---

## 🔧 Troubleshooting

### Common Issues

| Problem                | Solution                                                |
| ---------------------- | ------------------------------------------------------- |
| **401 Unauthorized**   | Check Supabase session validity and runtime token trust |
| **Google OAuth loops** | Verify redirect URLs in Supabase and Google Console     |
| **Composio errors**    | Ensure `COMPOSIO_API_KEY` is set correctly              |
| **Tool calls stuck**   | Check ADK runtime logs and connectivity                 |
| **Missing logos**      | Add domains to `next.config.ts` remote patterns         |

### Debug Steps

1. **Check browser console** for client-side errors
2. **Verify environment variables** are loaded correctly
3. **Test Supabase connection** in the dashboard
4. **Validate CopilotKit runtime** is responding
5. **Check network tab** for failed API calls

### Getting Help

- 📚 [CopilotKit Docs](https://docs.copilotkit.ai/)
- 🔐 [Supabase Auth Guide](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- 🛠️ [Composio API Reference](https://docs.composio.dev/)

---

## 🎉 You're All Set!

Your Agent Chat Workspace is ready to go! Start chatting with your AI agents and explore the powerful integrations available.

**Happy building!** 🚀
