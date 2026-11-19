import { describe, expect, it } from "vitest";
import { getLanguage, translate, type Language } from "./i18n";

describe("i18n internationalization", () => {
  const languages: Language[] = ["English", "Bahasa Melayu", "中文", "தமிழ்"];

  it("translates common keys across all four languages", () => {
    for (const lang of languages) {
      const home = translate(lang, "nav.home");
      expect(typeof home).toBe("string");
      expect(home.length).toBeGreaterThan(0);

      const earn = translate(lang, "nav.earn");
      expect(typeof earn).toBe("string");
      expect(earn.length).toBeGreaterThan(0);
    }
  });

  it("substitutes template parameters correctly", () => {
    const text = translate("English", "earn.cooldownActive", { h: 2, m: 30 });
    expect(text).toContain("2");
    expect(text).toContain("30");
  });

  it("resolves default language safely", () => {
    const lang = getLanguage();
    expect(languages).toContain(lang);
  });
});
