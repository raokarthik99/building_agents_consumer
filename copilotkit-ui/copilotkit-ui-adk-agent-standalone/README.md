# Agent Chat Workspace

Agent Chat Workspace is a Next.js 15 application that pairs Supabase Auth, CopilotKit, and Composio to deliver a secure, production-ready chat experience for ADK agents. The UI authenticates end users with Google OAuth, proxies requests to a remote CopilotKit Agent Dev Kit (ADK) runtime, and optionally lets users connect third-party accounts through Composio.

---

## Key Features
- **Secure sign-in** – Supabase OAuth (Google) with end-to-end session validation, middleware-protected routes, and a polished onboarding flow.
- **CopilotKit chat surface** – Opinionated chat UI wired to a remote ADK agent (`github-issues` by default) with clear tool-call status and suggestions.
- **Tool call inspector** – Rich status cards and payload viewers for agent tool calls, including Composio-specific rendering.
- **Account connections dashboard** – Manage Composio connected accounts (list, refresh, delete, poll for completion) directly inside the app.
- **TypeScript-first stack** – Next.js App Router, Turbopack dev server, Tailwind-compatible styling, and modern linting.

---

## Architecture Overview
- **App Router (`src/app`)**  
  - `/signin` presents the Google OAuth entry point.  
  - `/auth/callback` finalises Supabase sessions.  
  - `/` renders the CopilotKit chat workspace.  
  - `/connections` hosts the Composio account manager.
- **API routes (`src/app/api`)**  
  - `/api/copilotkit` proxies chat requests to the ADK runtime via `HttpAgent`, forwarding Supabase access tokens.  
  - `/api/composio/*` wraps Composio REST endpoints for listing, refreshing, deleting, and waiting on connected accounts.
- **Middleware (`src/middleware.ts`)** guards every route, requiring an authenticated Supabase session (or Bearer token for APIs) and redirecting guests to `/signin`.
- **Supabase utilities (`src/lib/supabase`)** centralise server/client instantiation and token validation.
- **Composio helpers (`src/lib/composio`)** encapsulate popup auth flows, status formatting, and polling logic.

---

## Prerequisites
- Node.js **18.18+** (development tested with `v24.4.0`, see `.nvmrc`).
- npm **9+**.
- A **Supabase** project with Google OAuth enabled.
- A running **CopilotKit ADK runtime** exposing an agent endpoint (defaults to `http://localhost:8000/agents/github-issues`).
- (Optional) A **Composio** account and API key if you plan to manage third-party connections.

---

## Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create your environment file**
   ```bash
   cp .env.local.example .env.local
   ```
3. **Populate environment variables** (see the table below).
4. **Start the dev server**
   ```bash
   npm run dev
   ```
5. Ensure your CopilotKit ADK runtime is reachable, then visit [http://localhost:3000](http://localhost:3000) and sign in with Google.

---

## Environment Variables
| Variable | Required | Description | Default / Example |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✔️ | Supabase project URL (copy from dashboard). | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✔️ | Supabase public anon key used by the client. | `supabaseAnonKey` |
| `COPILOTKIT_RUNTIME_ORIGIN` | ✔️ | Base origin of the ADK runtime. The app calls `${origin}/agents/github-issues` by default. | `http://localhost:8000` |
| `COPILOTKIT_TELEMETRY_DISABLED` | Optional | Disable CopilotKit telemetry if set to a truthy value. | `true` in `.env.local.example` |
| `COMPOSIO_API_KEY` | Optional (required for connections UI) | Server-side API key for Composio operations. | `your-api-key` |
| `DO_NOT_TRACK` | Optional | Opt out of analytics libraries. | `1` |
| `HOST` | Optional | Host interface for Next.js dev server. | `0.0.0.0` |
| `PORT` | Optional | Port for Next.js dev server. | `3000` |

Restart the dev server whenever you update `.env.local`.

---

## Supabase OAuth Configuration
1. In the Supabase dashboard, enable **Google** under **Authentication → Providers**.
2. Set the authorised redirect URI to `http://localhost:3000/auth/callback` (add production URLs later).
3. Copy the **Project URL** and **anon public key** into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. When deploying, configure the same values in your hosting provider (Vercel, Netlify, etc.) and update the OAuth redirect to match the deployed domain.

The middleware (`src/middleware.ts`) validates every request. Authenticated sessions are checked server-side with `getValidatedUserAndToken`, ensuring the CopilotKit proxy only forwards requests for trusted users.

---

## Connecting to the ADK Runtime
- The proxy at `src/app/api/copilotkit/route.ts` builds an `HttpAgent` using `COPILOTKIT_RUNTIME_ORIGIN` and forwards Supabase access tokens as Bearer credentials to the runtime.
- Change the default agent path by editing `agentPaths` in the same file or by setting `COPILOTKIT_RUNTIME_ORIGIN` to target a different deployment.
- If your runtime requires extra headers or authentication strategies, update the `HttpAgent` configuration accordingly.

---

## Composio Integrations
- Supply `COMPOSIO_API_KEY` to unlock the **Connections** page (`/connections`), which lets users list, refresh, delete, and monitor Composio connected accounts.
- The UI coordinates popup-based authorisation through `openAuthPopup`/`closeAuthPopup` helpers and polls `/api/composio/wait-for-connection` until the new account is active.
- API routes wrap common Composio actions (`list`, `get`, `refresh`, `delete`) and normalise error responses so the UI can surface friendly messaging.
- Remote toolkit logos are served through `next.config.ts`, which already whitelists `logos.composio.dev`.

---

## Project Structure
```
.
├─ public/                      # Static assets
├─ src/
│  ├─ app/
│  │  ├─ api/                   # CopilotKit + Composio API routes
│  │  ├─ auth/                  # OAuth callback handling
│  │  ├─ connections/           # Composio management page
│  │  ├─ signin/                # Google sign-in entry point
│  │  ├─ globals.css            # App-level styles
│  │  └─ layout.tsx             # Root layout & metadata
│  ├─ components/               # Reusable UI (chat, header, buttons, tool renderers)
│  ├─ lib/                      # Supabase + Composio helpers and utilities
│  └─ middleware.ts             # Auth + routing guard
├─ next.config.ts               # Next.js configuration (remote images)
├─ package.json                 # Scripts and dependencies
└─ .env.local.example           # Environment variable template
```

---

## Available npm Scripts
- `npm run dev` – Start Next.js with Turbopack.
- `npm run build` – Build the production bundle.
- `npm run start` – Serve the production build (ensure env vars are set).
- `npm run lint` – Run ESLint using the Next.js config.

---

## Deployment Notes
- Provision the same environment variables in your hosting environment (Vercel, Railway, etc.).
- Expose the CopilotKit runtime over HTTPS and update `COPILOTKIT_RUNTIME_ORIGIN` accordingly.
- Configure Supabase redirect URLs for every deployment domain (staging and production).
- If you rely on Composio, store `COMPOSIO_API_KEY` in your hosting provider’s secret manager.

---

## Troubleshooting
- **401 Unauthorized when chatting:** Ensure the Supabase session is valid and that the ADK runtime trusts the forwarded Bearer token. Restart your runtime after updating credentials.
- **Google sign-in loops back to `/signin`:** Double-check redirect URLs in both Supabase and Google Cloud Console; clear cookies if you recently rotated credentials.
- **Composio list shows a server error:** Verify `COMPOSIO_API_KEY` is set. The API responds with `MISSING_API_KEY` when it’s absent.
- **Tool call stalls at “Running”:** Inspect console logs on the ADK runtime; the UI polls for results but will keep the status open until the runtime responds.
- **Missing integration logos:** Add the required domain to `images.remotePatterns` in `next.config.ts` and redeploy.

---

## Additional Resources
- [CopilotKit Documentation](https://docs.copilotkit.ai/)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Composio API Reference](https://docs.composio.dev/)

Happy building!
