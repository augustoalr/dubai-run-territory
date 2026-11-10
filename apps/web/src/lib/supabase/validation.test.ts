import { describe, expect, it } from "vitest";
import { validateAlias, validateEmail } from "./validation";

describe("validateAlias", () => {
  it("accepts valid aliases between 3 and 20 characters without spaces", () => {
    expect(validateAlias("run")).toEqual({ valid: true, normalized: "run" });
    expect(validateAlias("runner123")).toEqual({ valid: true, normalized: "runner123" });
    expect(validateAlias("Speedy_Falcon-DXB")).toEqual({
      valid: true,
      normalized: "Speedy_Falcon-DXB",
    });
    expect(validateAlias("12345678901234567890")).toEqual({
      valid: true,
      normalized: "12345678901234567890",
    });
  });

  it("rejects aliases shorter than 3 characters", () => {
    expect(validateAlias("")).toEqual({ valid: false, error: "TOO_SHORT" });
    expect(validateAlias("a")).toEqual({ valid: false, error: "TOO_SHORT" });
    expect(validateAlias("ab")).toEqual({ valid: false, error: "TOO_SHORT" });
  });

  it("rejects aliases longer than 20 characters", () => {
    expect(validateAlias("123456789012345678901")).toEqual({ valid: false, error: "TOO_LONG" });
  });

  it("rejects whitespace anywhere in the alias", () => {
    expect(validateAlias(" lead")).toEqual({ valid: false, error: "CONTAINS_WHITESPACE" });
    expect(validateAlias("trail ")).toEqual({ valid: false, error: "CONTAINS_WHITESPACE" });
    expect(validateAlias("run ner")).toEqual({ valid: false, error: "CONTAINS_WHITESPACE" });
    expect(validateAlias("tab\tword")).toEqual({ valid: false, error: "CONTAINS_WHITESPACE" });
    expect(validateAlias("new\nline")).toEqual({ valid: false, error: "CONTAINS_WHITESPACE" });
  });

  it("rejects control characters", () => {
    expect(validateAlias("bad\u0000char")).toEqual({
      valid: false,
      error: "CONTAINS_CONTROL_CHARS",
    });
    expect(validateAlias("bad\u0007char")).toEqual({
      valid: false,
      error: "CONTAINS_CONTROL_CHARS",
    });
    expect(validateAlias("bad\u007Fchar")).toEqual({
      valid: false,
      error: "CONTAINS_CONTROL_CHARS",
    });
  });
});

describe("validateEmail", () => {
  it("accepts valid email addresses", () => {
    expect(validateEmail("runner@example.com")).toBe(true);
    expect(validateEmail("user.name+tag@domain.co.uk")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("@missing-user.com")).toBe(false);
    expect(validateEmail("user@missing-domain")).toBe(false);
    expect(validateEmail("user@domain with space.com")).toBe(false);
  });
});
