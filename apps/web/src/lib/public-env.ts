/** Public project coordinates. The anon key stays out of the repo. */
export const SUPABASE_PROJECT_REF = "usduksotdecgusaxeyva";
export const SUPABASE_REGION = "ap-south-1";
export const SUPABASE_PROJECT_URL = "https://usduksotdecgusaxeyva.supabase.co";

const PLACEHOLDER_KEYS = new Set(["", "your-anon-key"]);

export function publicSupabaseConfig(): { url: string; anonKeyConfigured: boolean } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_PROJECT_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return {
    url,
    anonKeyConfigured: !PLACEHOLDER_KEYS.has(anonKey),
  };
}
