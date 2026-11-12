import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./client";
import type { Profile, UpdateAliasResult } from "./types";
import { validateAlias, validateEmail } from "./validation";

export interface AuthClientDeps {
  getSupabase?: () => SupabaseClient | null;
}

export interface AuthSessionSnapshot<TUser = unknown, TSession = unknown> {
  user: TUser | null;
  session: TSession | null;
  profile: Profile | null;
}

/**
 * Resolves the next auth session snapshot after a signOut attempt.
 * Keeps existing session state intact whenever signOut returns an error.
 */
export function resolveSignOutTransition<TUser, TSession>(
  current: AuthSessionSnapshot<TUser, TSession>,
  result: { error: string | null },
): AuthSessionSnapshot<TUser, TSession> {
  if (result.error) {
    return current;
  }
  return { user: null, session: null, profile: null };
}

/**
 * Executes a signOut call and runs the clear callback only if signOut succeeds without error.
 */
export async function executeSignOut(
  signOutFn: () => Promise<{ error: string | null }>,
  onSuccessClear: () => void,
): Promise<{ error: string | null }> {
  try {
    const result = await signOutFn();
    if (!result.error) {
      onSuccessClear();
    }
    return result;
  } catch (err) {
    return {
      error: err instanceof Error && err.message ? err.message : "SIGN_OUT_FAILED",
    };
  }
}

/**
 * Checks whether the email OTP login option is active via environment flag.
 */
export function isEmailLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EMAIL_LOGIN === "true";
}

/**
 * Calculates the browser redirect URL for auth callbacks.
 */
export function getAuthCallbackUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return "";
}

/**
 * Initiates the Google OAuth login flow.
 */
export async function signInWithGoogle(
  customRedirectUrl?: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return { error: "AUTH_NOT_CONFIGURED" };
  }

  const redirectTo = customRedirectUrl || getAuthCallbackUrl();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Sends a one-time passcode (OTP) to the provided email address.
 * Only functional when email login is enabled.
 */
export async function signInWithOtp(
  email: string,
  customRedirectUrl?: string,
): Promise<{ error: string | null }> {
  if (!isEmailLoginEnabled()) {
    return { error: "EMAIL_LOGIN_DISABLED" };
  }

  if (!validateEmail(email)) {
    return { error: "INVALID_EMAIL" };
  }

  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return { error: "AUTH_NOT_CONFIGURED" };
  }

  const emailRedirectTo = customRedirectUrl || getAuthCallbackUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Verifies the 6-digit OTP token sent by email.
 */
export async function verifyOtp(email: string, token: string): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return { error: "AUTH_NOT_CONFIGURED" };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Signs the user out of the current session.
 */
export async function signOut(deps?: AuthClientDeps): Promise<{ error: string | null }> {
  try {
    const resolveSupabase = deps?.getSupabase ?? getSupabase;
    const supabase = resolveSupabase();
    if (!supabase) {
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message || "SIGN_OUT_FAILED" };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error && err.message ? err.message : "SIGN_OUT_FAILED",
    };
  }
}

interface RawProfileRow {
  id: string;
  alias: string | null;
  created_at: string;
}

/**
 * Fetches the user profile from public.profiles.
 */
export async function fetchProfile(userId: string, deps?: AuthClientDeps): Promise<Profile | null> {
  try {
    const resolveSupabase = deps?.getSupabase ?? getSupabase;
    const supabase = resolveSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, alias, created_at")
      .eq("id", userId)
      .maybeSingle<RawProfileRow>();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      alias: data.alias,
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Updates the user's alias in public.profiles.
 * Validates alias format and checks for unique constraint violations (profiles_alias_lower_uidx).
 */
export async function updateProfileAlias(
  userId: string,
  rawAlias: string,
): Promise<UpdateAliasResult> {
  const validation = validateAlias(rawAlias);
  if (!validation.valid) {
    return { success: false, error: "INVALID_FORMAT" };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: "UNAUTHENTICATED" };
  }

  const alias = validation.normalized;

  try {
    const { error } = await supabase.from("profiles").update({ alias }).eq("id", userId);

    if (error) {
      // Postgres unique constraint violation on profiles_alias_lower_uidx (code 23505)
      const isUniqueViolation =
        error.code === "23505" ||
        error.message?.includes("profiles_alias_lower_uidx") ||
        error.details?.includes("already exists");

      if (isUniqueViolation) {
        return { success: false, error: "ALIAS_TAKEN" };
      }

      return { success: false, error: "UNKNOWN" };
    }

    return { success: true, alias };
  } catch {
    return { success: false, error: "UNKNOWN" };
  }
}
