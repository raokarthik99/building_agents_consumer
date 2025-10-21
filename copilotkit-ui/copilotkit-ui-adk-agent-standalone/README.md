# Agent Chat Workspace

A Next.js 15 application that pairs Supabase Auth with CopilotKit to provide a secure chat workspace for ADK agents. By default the UI connects to a `github-issues` agent exposed by the CopilotKit Agent Dev Kit (ADK) runtime over HTTP.

## Highlights
- Supabase OAuth with Google, including server-side session validation and middleware-protected routes.
- CopilotKit React UI with a chat surface bound to a remote ADK agent.
- Ready-to-use sign-in experience with branded Google sign-in button and profile-aware header.
- TypeScript-first setup using Turbopack for fast local rebuilds.

## Prerequisites
- Node.js 18.18+ (Node 20 LTS recommended; tested with v24.4.0) and npm 9+.
- A Supabase project with Google OAuth credentials.
- A running CopilotKit ADK runtime exposing an agent at `http://localhost:8000/agents/github-issues` (override the origin with `COPILOTKIT_RUNTIME_ORIGIN` if different).

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the sample environment file and add your Supabase details (see the next section):
   ```bash
   cp .env.local.example .env.local
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Start (or point to) your CopilotKit ADK runtime so the UI can reach the agent endpoint.
5. Visit [http://localhost:3000](http://localhost:3000) and sign in with Google to access the workspace.

## Configure Supabase OAuth
1. Create or open a Supabase project.
2. In **Authentication → Providers**, enable **Google** and supply your Google OAuth credentials.
3. Add `http://localhost:3000/auth/callback` as an authorized redirect URL (add production URLs when deploying).
4. In the Supabase dashboard copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://<your-project-ref>.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
   ```
   Restart the dev server after changing environment variables.

## CopilotKit Agent Runtime
- The chat surface sends requests to `/api/copilotkit`, which proxies them to the ADK runtime.
- By default the runtime client is configured for `http://localhost:8000/agents/github-issues` with the Supabase access token forwarded as a Bearer token.
- Set `COPILOTKIT_RUNTIME_ORIGIN` in `.env.local` to point at a different backend origin when hosting the ADK runtime elsewhere.
- If your runtime is hosted elsewhere or uses a different agent id, update the `HttpAgent` configuration in `src/app/api/copilotkit/route.ts`.

## Project Layout
- `src/app` – App Router entrypoints, including `/signin`, `/auth/callback`, and the CopilotKit chat page.
- `src/components` – Reusable UI (header, footer, sign-in panel, Google button).
- `src/lib/supabase` – Browser/server helpers and auth validation logic.
- `src/middleware.ts` – Guards all routes, ensuring authenticated access except for exempt paths.

## Useful Scripts
- `npm run dev` – Start the Next.js dev server with Turbopack.
- `npm run build` – Production build.
- `npm run start` – Serve the production build.
- `npm run lint` – Run ESLint with the Next.js config.

## Authentication Flow
- The middleware checks each request; unauthenticated users are redirected to `/signin`.
- The Google sign-in button uses Supabase OAuth, requesting offline access and handling redirect URLs automatically.
- `/auth/callback` exchanges the Supabase authorization code for a session and persists cookies before returning the user to the original page.
- API routes accept either the Supabase session cookie or a Bearer token (used when CopilotKit forwards requests).

## Troubleshooting
- **401 Unauthorized:** Confirm your Supabase credentials are correct and that the ADK runtime is forwarding a valid Supabase access token.
- **Google sign-in stalls:** Verify the redirect URL matches exactly in both Supabase and Google Cloud Console configurations.
- **Images blocked for other providers:** Update `next.config.ts` with additional image domains when adding non-Google identity providers.
