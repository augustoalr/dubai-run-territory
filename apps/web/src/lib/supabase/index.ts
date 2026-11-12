export { getSupabase, isSupabaseConfigured, getSupabaseUrl } from "./client";
export {
  getActiveUserLeague,
  isLeagueCode,
  type GetActiveUserLeagueParams,
} from "./active-user-league";
export {
  signInWithGoogle,
  signInWithOtp,
  verifyOtp,
  signOut,
  fetchProfile,
  updateProfileAlias,
  isEmailLoginEnabled,
  getAuthCallbackUrl,
  resolveSignOutTransition,
  executeSignOut,
  type AuthClientDeps,
  type AuthSessionSnapshot,
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
