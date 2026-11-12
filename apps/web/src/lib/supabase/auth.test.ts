import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  executeSignOut,
  fetchProfile,
  getAuthCallbackUrl,
  isEmailLoginEnabled,
  resolveSignOutTransition,
  signInWithGoogle,
  signInWithOtp,
  signOut,
  updateProfileAlias,
} from "./auth";

describe("auth functions", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isEmailLoginEnabled", () => {
    it("returns false when NEXT_PUBLIC_EMAIL_LOGIN is unset or empty", () => {
      delete process.env.NEXT_PUBLIC_EMAIL_LOGIN;
      expect(isEmailLoginEnabled()).toBe(false);

      process.env.NEXT_PUBLIC_EMAIL_LOGIN = "";
      expect(isEmailLoginEnabled()).toBe(false);
    });

    it("returns false when NEXT_PUBLIC_EMAIL_LOGIN is 'false'", () => {
      process.env.NEXT_PUBLIC_EMAIL_LOGIN = "false";
      expect(isEmailLoginEnabled()).toBe(false);
    });

    it("returns true only when NEXT_PUBLIC_EMAIL_LOGIN is exactly 'true'", () => {
      process.env.NEXT_PUBLIC_EMAIL_LOGIN = "true";
      expect(isEmailLoginEnabled()).toBe(true);
    });
  });

  describe("getAuthCallbackUrl", () => {
    it("returns an auth callback URL when window is available or empty string", () => {
      const url = getAuthCallbackUrl();
      if (typeof window !== "undefined") {
        expect(url).toContain("/auth/callback");
      } else {
        expect(url).toBe("");
      }
    });
  });

  describe("signInWithGoogle", () => {
    it("returns AUTH_NOT_CONFIGURED when Supabase is not configured", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const res = await signInWithGoogle();
      expect(res.error).toBe("AUTH_NOT_CONFIGURED");
    });
  });

  describe("signInWithOtp", () => {
    it("returns EMAIL_LOGIN_DISABLED when flag is off", async () => {
      delete process.env.NEXT_PUBLIC_EMAIL_LOGIN;
      const res = await signInWithOtp("runner@example.com");
      expect(res.error).toBe("EMAIL_LOGIN_DISABLED");
    });

    it("returns INVALID_EMAIL when email format is invalid and flag is on", async () => {
      process.env.NEXT_PUBLIC_EMAIL_LOGIN = "true";
      const res = await signInWithOtp("not-an-email");
      expect(res.error).toBe("INVALID_EMAIL");
    });

    it("returns AUTH_NOT_CONFIGURED when valid email but Supabase not configured", async () => {
      process.env.NEXT_PUBLIC_EMAIL_LOGIN = "true";
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const res = await signInWithOtp("runner@example.com");
      expect(res.error).toBe("AUTH_NOT_CONFIGURED");
    });
  });

  describe("updateProfileAlias", () => {
    it("returns INVALID_FORMAT when alias is invalid", async () => {
      const res = await updateProfileAlias("user-123", "ab"); // too short
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("INVALID_FORMAT");
      }
    });

    it("returns INVALID_FORMAT when alias contains whitespace", async () => {
      const res = await updateProfileAlias("user-123", "bad alias");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("INVALID_FORMAT");
      }
    });
  });

  describe("fetchProfile", () => {
    it("selects only id, alias, created_at (never is_admin or *) and maps Profile without isAdmin", async () => {
      let capturedTable = "";
      let capturedSelect = "";
      const eqFilters: Array<[string, unknown]> = [];
      let usedMaybeSingle = false;

      const mockClient = {
        from(table: string) {
          capturedTable = table;
          const builder = {
            select(cols: string) {
              capturedSelect = cols;
              return builder;
            },
            eq(col: string, val: unknown) {
              eqFilters.push([col, val]);
              return builder;
            },
            maybeSingle() {
              usedMaybeSingle = true;
              return Promise.resolve({
                data: {
                  id: "user-123",
                  alias: "dubai.runner",
                  created_at: "2026-11-01T10:00:00Z",
                },
                error: null,
              });
            },
          };
          return builder;
        },
      } as unknown as SupabaseClient;

      const profile = await fetchProfile("user-123", { getSupabase: () => mockClient });

      expect(capturedTable).toBe("profiles");
      expect(capturedSelect).toBe("id, alias, created_at");
      expect(capturedSelect).not.toContain("is_admin");
      expect(capturedSelect).not.toContain("*");
      expect(eqFilters).toEqual([["id", "user-123"]]);
      expect(usedMaybeSingle).toBe(true);
      expect(profile).toEqual({
        id: "user-123",
        alias: "dubai.runner",
        createdAt: "2026-11-01T10:00:00Z",
      });
      expect("isAdmin" in (profile ?? {})).toBe(false);
    });

    it("returns null on query error, missing row, or thrown exception", async () => {
      const errorClient = {
        from() {
          const builder = {
            select() {
              return builder;
            },
            eq() {
              return builder;
            },
            maybeSingle() {
              return Promise.resolve({ data: null, error: { code: "42501", message: "denied" } });
            },
          };
          return builder;
        },
      } as unknown as SupabaseClient;

      const throwingClient = {
        from() {
          throw new Error("network down");
        },
      } as unknown as SupabaseClient;

      expect(await fetchProfile("user-123", { getSupabase: () => null })).toBeNull();
      expect(await fetchProfile("user-123", { getSupabase: () => errorClient })).toBeNull();
      expect(await fetchProfile("user-123", { getSupabase: () => throwingClient })).toBeNull();
    });
  });

  describe("signOut and AuthContext session transition", () => {
    it("returns { error: null } when client is null or signOut succeeds", async () => {
      const okClient = {
        auth: {
          signOut: async () => ({ error: null }),
        },
      } as unknown as SupabaseClient;

      expect(await signOut({ getSupabase: () => null })).toEqual({ error: null });
      expect(await signOut({ getSupabase: () => okClient })).toEqual({ error: null });
    });

    it("returns { error } when supabase.auth.signOut returns an error", async () => {
      const errClient = {
        auth: {
          signOut: async () => ({ error: { message: "Session revoke failed" } }),
        },
      } as unknown as SupabaseClient;

      expect(await signOut({ getSupabase: () => errClient })).toEqual({
        error: "Session revoke failed",
      });
    });

    it("catches rejected promises from supabase.auth.signOut without throwing", async () => {
      const rejectClient = {
        auth: {
          signOut: async () => {
            throw new Error("Network failure");
          },
        },
      } as unknown as SupabaseClient;

      expect(await signOut({ getSupabase: () => rejectClient })).toEqual({
        error: "Network failure",
      });
    });

    it("clears session state only when signOut succeeds without error", async () => {
      const initialSnapshot = {
        user: { id: "user-123" },
        session: { access_token: "tok" },
        profile: { id: "user-123", alias: "maya", createdAt: "2026-11-01T00:00:00Z" },
      };

      expect(resolveSignOutTransition(initialSnapshot, { error: "Network failure" })).toBe(
        initialSnapshot,
      );
      expect(resolveSignOutTransition(initialSnapshot, { error: null })).toEqual({
        user: null,
        session: null,
        profile: null,
      });

      let clearedOnFail = false;
      const failResult = await executeSignOut(
        async () => ({ error: "Network failure" }),
        () => {
          clearedOnFail = true;
        },
      );
      expect(failResult).toEqual({ error: "Network failure" });
      expect(clearedOnFail).toBe(false);

      let clearedOnSuccess = false;
      const okResult = await executeSignOut(
        async () => ({ error: null }),
        () => {
          clearedOnSuccess = true;
        },
      );
      expect(okResult).toEqual({ error: null });
      expect(clearedOnSuccess).toBe(true);
    });
  });
});
