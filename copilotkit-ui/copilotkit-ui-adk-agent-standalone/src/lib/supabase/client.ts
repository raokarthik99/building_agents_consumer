import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseConfig } from "./config";

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey);
  }

  return client;
}
