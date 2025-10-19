## Supabase Auth Setup

1. Create a [Supabase project](https://supabase.com/dashboard/projects) and enable **Google** as an OAuth provider under **Authentication → Providers**.  
   - Set the authorized redirect URL to `http://localhost:3000/auth/callback` for local development.
2. Copy `.env.local.example` to `.env.local` and fill in your project details:

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL="https://<your-project-ref>.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
   ```

3. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Visit [http://localhost:3000](http://localhost:3000) and sign in with Google to access the Copilot workspace. A signed-in session surfaces your Google profile in the header and unlocks the chat experience.

## Development Notes

- The `/auth/callback` route exchanges the Supabase OAuth code and persists the session cookies.
- Signing out uses the Supabase browser client and automatically refreshes the current view.
- The Google avatar is rendered through `next/image`, so additional domains must be added to `next.config.ts` if you enable other identity providers.
