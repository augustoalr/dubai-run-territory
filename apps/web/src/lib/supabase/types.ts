import type { User, Session } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  alias: string | null;
  createdAt: string;
  isAdmin: boolean;
}

export type AliasValidationError =
  "TOO_SHORT" | "TOO_LONG" | "CONTAINS_WHITESPACE" | "CONTAINS_CONTROL_CHARS" | "INVALID_FORMAT";

export type AliasValidationResult =
  { valid: true; normalized: string } | { valid: false; error: AliasValidationError };

export type UpdateAliasResult =
  | { success: true; alias: string }
  | { success: false; error: "ALIAS_TAKEN" | "INVALID_FORMAT" | "UNAUTHENTICATED" | "UNKNOWN" };

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isEmailLoginEnabled: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  saveAlias: (alias: string) => Promise<UpdateAliasResult>;
  refreshProfile: () => Promise<void>;
}
