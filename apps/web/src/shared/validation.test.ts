import { describe, expect, it } from "vitest";
import {
  compareVersions,
  generateDefaultUsername,
  isNewerVersion,
  normalizePhone,
  parseSemVer,
  validateCustomUsername,
  validateEmailAddress,
  validatePasswordComplexity,
} from "./validation";

describe("SemVer version utilities", () => {
  it("parses valid semver strings", () => {
    expect(parseSemVer("0.7.0")).toEqual([0, 7, 0]);
    expect(parseSemVer("v1.2.34")).toEqual([1, 2, 34]);
    expect(parseSemVer("invalid")).toEqual([0]);
  });

  it("compares versions correctly", () => {
    expect(compareVersions("0.7.0", "0.6.0")).toBe(1);
    expect(compareVersions("0.6.0", "0.7.0")).toBe(-1);
    expect(compareVersions("0.7.0", "0.7.0")).toBe(0);
    expect(compareVersions("1.0.0", "0.9.9")).toBe(1);
  });

  it("detects newer version flags correctly", () => {
    expect(isNewerVersion("0.7.0", "0.6.0")).toBe(true);
    expect(isNewerVersion("0.6.0", "0.7.0")).toBe(false);
    expect(isNewerVersion("0.7.0", "0.7.0")).toBe(false);
  });
});

describe("Username validation and generation", () => {
  it("generates default username from user id", () => {
    const name = generateDefaultUsername("abc123xyz456");
    expect(name).toMatch(/^User\d+/);
    expect(name.length).toBeGreaterThan(6);
  });

  it("validates custom usernames", () => {
    expect(validateCustomUsername("eco_warrior").valid).toBe(true);
    expect(validateCustomUsername("green-hero.01").valid).toBe(true);
    expect(validateCustomUsername("a").valid).toBe(false);
    expect(validateCustomUsername("user with spaces").valid).toBe(false);
    expect(validateCustomUsername("bad$char!").valid).toBe(false);
    expect(validateCustomUsername("User123").valid).toBe(false);
  });
});

describe("Password complexity validation", () => {
  it("evaluates strong passwords", () => {
    const res = validatePasswordComplexity("GreenPlanet2026!");
    expect(res.valid).toBe(true);
    expect(res.hasLength).toBe(true);
    expect(res.hasLetter).toBe(true);
    expect(res.hasNumber).toBe(true);
    expect(res.hasSpecial).toBe(true);
  });

  it("flags weak passwords", () => {
    const res = validatePasswordComplexity("simple");
    expect(res.valid).toBe(false);
  });
});

describe("Email and Phone validation", () => {
  it("validates valid and invalid email addresses", () => {
    expect(validateEmailAddress("user@gmail.com").valid).toBe(true);
    expect(validateEmailAddress("eco@outlook.com").valid).toBe(true);
    expect(validateEmailAddress("invalid-email").valid).toBe(false);
    expect(validateEmailAddress("").valid).toBe(true);
  });

  it("normalizes phone numbers", () => {
    expect(normalizePhone("+60 12-345 6789")).toBe("+60123456789");
  });
});
