import type { AliasValidationResult } from "./types";

// Matches ASCII and Unicode control characters
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]/;

// Matches any Unicode whitespace character
const WHITESPACE_REGEX = /\s/;

/**
 * Validates that an alias conforms to the database constraints in public.profiles:
 * - char_length(alias) BETWEEN 3 AND 20
 * - alias = btrim(alias) (no leading/trailing whitespace)
 * - alias !~ '[[:cntrl:][:space:]]' (no whitespace or control characters)
 */
export function validateAlias(raw: string): AliasValidationResult {
  if (typeof raw !== "string") {
    return { valid: false, error: "INVALID_FORMAT" };
  }

  // Check whitespace anywhere (leading, trailing, internal)
  if (WHITESPACE_REGEX.test(raw)) {
    return { valid: false, error: "CONTAINS_WHITESPACE" };
  }

  // Check control characters
  if (CONTROL_CHARS_REGEX.test(raw)) {
    return { valid: false, error: "CONTAINS_CONTROL_CHARS" };
  }

  // Length check (between 3 and 20 characters)
  if (raw.length < 3) {
    return { valid: false, error: "TOO_SHORT" };
  }

  if (raw.length > 20) {
    return { valid: false, error: "TOO_LONG" };
  }

  return { valid: true, normalized: raw };
}

/**
 * Validates an email address format before sending OTP.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}
