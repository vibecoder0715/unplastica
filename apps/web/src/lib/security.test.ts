import { describe, expect, it } from "vitest";
import { validatePasswordComplexity, APP_BUILD_VERSION } from "../app/App";

describe("Security Hardening & Password Policy", () => {
  it("enforces version 0.2.2", () => {
    expect(APP_BUILD_VERSION).toBe("0.2.2");
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = validatePasswordComplexity("Pass1!");
    expect(result.hasLength).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("rejects passwords missing letters", () => {
    const result = validatePasswordComplexity("12345678!");
    expect(result.hasLetter).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("rejects passwords missing numbers", () => {
    const result = validatePasswordComplexity("Password!");
    expect(result.hasNumber).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("rejects passwords missing special characters", () => {
    const result = validatePasswordComplexity("Password123");
    expect(result.hasSpecial).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("accepts strong passwords meeting both criteria (8-36 chars, 1 number, letter, special char)", () => {
    const result = validatePasswordComplexity("Warrior2026@APU!");
    expect(result.hasLength).toBe(true);
    expect(result.hasLetter).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSpecial).toBe(true);
    expect(result.hasLetterAndNumberAndSpecial).toBe(true);
    expect(result.valid).toBe(true);
  });

  it("rejects excessively long passwords (>36 characters)", () => {
    const hugePw = "A1!" + "a".repeat(40);
    const result = validatePasswordComplexity(hugePw);
    expect(result.hasLength).toBe(false);
    expect(result.valid).toBe(false);
  });
});

