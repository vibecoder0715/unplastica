import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("hard-coded interface languages", () => {
  it.each([
    ["English", "settings.login", "Log in to your account"],
    ["Bahasa Melayu", "settings.login", "Log masuk ke akaun"],
    ["中文", "settings.login", "登录账户"],
  ] as const)("translates the guest login action in %s", (language, key, expected) => {
    expect(translate(language, key)).toBe(expected);
  });

  it("interpolates the awarded Greenbits amount", () => {
    expect(translate("中文", "camera.success", { points: 500 })).toContain("500 Greenbits");
  });
});
