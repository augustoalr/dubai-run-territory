import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAuthCallbackUrl,
  isEmailLoginEnabled,
  signInWithGoogle,
  signInWithOtp,
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
});
