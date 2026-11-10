import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PROJECT_URL } from "../public-env";

const PLACEHOLDER_KEYS = new Set(["", "your-anon-key"]);

let cachedClient: SupabaseClient | null = null;

/**
 * Returns whether Supabase credentials are configured in the environment.
 */
export function isSupabaseConfigured(): boolean {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return !PLACEHOLDER_KEYS.has(anonKey.trim());
}

/**
 * Returns the Supabase project URL configured in the environment.
 */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_PROJECT_URL;
}

/**
 * Returns the Supabase public anon key if configured.
 * Never exposes or reads any service-role key.
 */
export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

/**
 * Returns the decoupled singleton Supabase client.
 * Returns null if Supabase is not configured (e.g. during offline development or builds).
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!cachedClient) {
    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();

    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  return cachedClient;
}
