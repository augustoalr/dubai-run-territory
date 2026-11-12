"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  executeSignOut,
  fetchProfile,
  isEmailLoginEnabled,
  signInWithGoogle as authSignInWithGoogle,
  signInWithOtp as authSignInWithOtp,
  signOut as authSignOut,
  updateProfileAlias,
  verifyOtp as authVerifyOtp,
} from "./auth";
import { getSupabase, isSupabaseConfigured } from "./client";
import type { AuthContextValue, Profile, UpdateAliasResult } from "./types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const emailLoginActive = isEmailLoginEnabled();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const loadUserProfile = useCallback(async (userId: string) => {
    const userProfile = await fetchProfile(userId);
    setProfile(userProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  }, [user, loadUserProfile]);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    // Initial session retrieval
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        if (!isMounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          const loaded = await fetchProfile(initialSession.user.id);
          if (isMounted) setProfile(loaded);
        }
      })
      .catch(() => {
        // Safe fallback on network or configuration issue
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Listen to auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const loaded = await fetchProfile(currentUser.id);
        if (isMounted) setProfile(loaded);
      } else {
        setProfile(null);
      }

      if (event === "SIGNED_IN") {
        setIsAuthModalOpen(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured, loadUserProfile]);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const handleSignInWithGoogle = useCallback(async () => {
    return authSignInWithGoogle();
  }, []);

  const handleSignInWithOtp = useCallback(async (email: string) => {
    return authSignInWithOtp(email);
  }, []);

  const handleVerifyOtp = useCallback(async (email: string, token: string) => {
    const result = await authVerifyOtp(email, token);
    if (!result.error) {
      setIsAuthModalOpen(false);
    }
    return result;
  }, []);

  const handleSignOut = useCallback(async () => {
    return executeSignOut(authSignOut, () => {
      setUser(null);
      setSession(null);
      setProfile(null);
    });
  }, []);

  const handleSaveAlias = useCallback(
    async (alias: string): Promise<UpdateAliasResult> => {
      if (!user) {
        return { success: false, error: "UNAUTHENTICATED" };
      }
      const result = await updateProfileAlias(user.id, alias);
      if (result.success) {
        setProfile((prev) =>
          prev
            ? { ...prev, alias: result.alias }
            : {
                id: user.id,
                alias: result.alias,
                createdAt: new Date().toISOString(),
              },
        );
      }
      return result;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isConfigured: configured,
      isEmailLoginEnabled: emailLoginActive,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      signInWithGoogle: handleSignInWithGoogle,
      signInWithOtp: handleSignInWithOtp,
      verifyOtp: handleVerifyOtp,
      signOut: handleSignOut,
      saveAlias: handleSaveAlias,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      configured,
      emailLoginActive,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      handleSignInWithGoogle,
      handleSignInWithOtp,
      handleVerifyOtp,
      handleSignOut,
      handleSaveAlias,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
