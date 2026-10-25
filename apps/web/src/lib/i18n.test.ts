import { describe, expect, it } from "vitest";
import { messages, translate } from "./i18n";

describe("i18n localization tests", () => {
  it.each([
    ["English", "settings.login", "Log in to your account"],
    ["Bahasa Melayu", "settings.login", "Log masuk ke akaun"],
    ["中文", "settings.login", "登录账户"],
  ] as const)("translates the guest login action in %s", (language, key, expected) => {
    expect(translate(language, key)).toBe(expected);
  });

  it.each([
    ["English", "camera.success", { points: 500 }, "Verified! +500 Greenbits"],
    ["Bahasa Melayu", "camera.success", { points: 500 }, "Disahkan! +500 Greenbits"],
    ["中文", "camera.success", { points: 500 }, "已验证！+500 绿色积分"],
  ] as const)("interpolates the awarded Greenbits in %s", (language, key, values, expected) => {
    expect(translate(language, key, values)).toBe(expected);
  });

  it.each([
    ["English", "APU Campus"],
    ["Bahasa Melayu", "Kampus APU"],
    ["中文", "APU 校园"],
  ] as const)("translates tournament campus card in %s", (language, expected) => {
    expect(translate(language, "events.campusName")).toBe(expected);
  });

  it.each([
    ["English", "auth.logoutConfirmTitle", "Are you sure you want to log out?"],
    ["Bahasa Melayu", "auth.logoutConfirmTitle", "Adakah anda pasti mahu log keluar?"],
    ["中文", "auth.logoutConfirmTitle", "确定要退出登录吗？"],
    ["English", "common.cancel", "Cancel"],
    ["Bahasa Melayu", "common.cancel", "Batal"],
    ["中文", "common.cancel", "取消"],
    ["English", "profile.cropTitle", "Crop profile photo"],
    ["Bahasa Melayu", "profile.cropTitle", "Pangkas foto profil"],
    ["中文", "profile.cropTitle", "裁剪个人头像"],
  ] as const)("translates logout and crop keys in %s", (language, key, expected) => {
    expect(translate(language, key)).toBe(expected);
  });

  it.each([
    ["English", "events.prizeChampion", "RM 500"],
    ["Bahasa Melayu", "events.prizeChampion", "RM 500"],
    ["中文", "events.prizeChampion", "500 令吉"],
    ["English", "events.prizeSecond", "RM 200"],
    ["Bahasa Melayu", "events.prizeSecond", "RM 200"],
    ["中文", "events.prizeSecond", "200 令吉"],
    ["English", "events.prizeThird", "RM 100"],
    ["Bahasa Melayu", "events.prizeThird", "RM 100"],
    ["中文", "events.prizeThird", "100 令吉"],
  ] as const)("translates tournament prize %s in %s", (language, key, expected) => {
    expect(translate(language, key)).toBe(expected);
  });

  it.each([
    ["English", "nav.mainNav", "Main navigation"],
    ["Bahasa Melayu", "nav.mainNav", "Navigasi utama"],
    ["中文", "nav.mainNav", "主导航"],
  ] as const)("translates bottom navigation aria-label in %s", (language, key, expected) => {
    expect(translate(language, key)).toBe(expected);
  });

  it("verifies all 9 previously corrupted Chinese auth keys translate to proper Chinese", () => {
    const keysToCheck = [
      "auth.setPasswordGoogleDesc",
      "auth.oauthMicrosoftNotice",
      "auth.oauthGoogleNotice",
      "auth.invalidUsernameOrPassword",
      "auth.invalidCredentialsMicrosoftHint",
      "auth.invalidCredentialsGoogleHint",
      "auth.saveUsername",
      "auth.keepUsername",
      "auth.microsoftAzureNotice",
    ];

    for (const key of keysToCheck) {
      const translated = translate("中文", key, { username: "ecouser" });
      expect(translated).not.toBe(key);
      const english = translate("English", key, { username: "ecouser" });
      expect(translated).not.toBe(english);
      expect(/[\u4e00-\u9fa5]/.test(translated)).toBe(true);
    }
  });

  it("verifies Chinese notifications contain zero untranslated English words (allowing APU, KB, PET)", () => {
    const notificationKeys = [
      "notification.apuTitle",
      "notification.apuBody",
      "notification.welcomeTitle",
      "notification.welcomeBody",
      "notification.verifiedTitle",
      "notification.verifiedBody",
    ];

    for (const key of notificationKeys) {
      const text = translate("中文", key, { points: 100 });
      const cleaned = text.replace(/\{[a-zA-Z0-9_]+\}/g, "").replace(/\b(APU|KB|PET)\b/g, "");
      const englishWords = cleaned.match(/[a-zA-Z]{2,}/g) || [];
      expect(englishWords).toEqual([]);
    }
  });

  it("falls back to English when translation is missing in other languages", () => {
    expect(translate("中文", "nonexistent.test.key")).toBe("nonexistent.test.key");
    expect(translate("English", "nonexistent.test.key")).toBe("nonexistent.test.key");
  });

  it("ensures dictionary parity and validity across all three languages", () => {
    const enKeys = Object.keys(messages.English);
    const bmKeys = Object.keys(messages["Bahasa Melayu"]);
    const zhKeys = Object.keys(messages["中文"]);

    expect(enKeys.length).toBeGreaterThanOrEqual(280);
    expect(bmKeys.length).toBe(enKeys.length);
    expect(zhKeys.length).toBe(enKeys.length);

    const bmSet = new Set(bmKeys);
    const zhSet = new Set(zhKeys);

    for (const key of enKeys) {
      expect(bmSet.has(key), `Missing BM key: ${key}`).toBe(true);
      expect(zhSet.has(key), `Missing ZH key: ${key}`).toBe(true);
      expect(/^[\x00-\x7F]+$/.test(key), `Key contains non-ASCII characters: ${key}`).toBe(true);
      expect(typeof messages.English[key]).toBe("string");
      expect(typeof messages["Bahasa Melayu"][key]).toBe("string");
      expect(typeof messages["中文"][key]).toBe("string");
    }
  });
});
