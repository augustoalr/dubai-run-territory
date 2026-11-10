export { getSupabase, isSupabaseConfigured, getSupabaseUrl } from "./client";
export {
  signInWithGoogle,
  signInWithOtp,
  verifyOtp,
  signOut,
  fetchProfile,
  updateProfileAlias,
  isEmailLoginEnabled,
  getAuthCallbackUrl,
} from "./auth";
export { validateAlias, validateEmail } from "./validation";
export { AuthProvider, useAuth } from "./AuthContext";
export type {
  Profile,
  AliasValidationError,
  AliasValidationResult,
  UpdateAliasResult,
  AuthContextValue,
} from "./types";
