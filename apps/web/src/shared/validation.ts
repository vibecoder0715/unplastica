import type { InstallEnvironment, Page, Theme } from "./types";

declare const __APP_BUILD_VERSION__: string | undefined;

export const APP_BUILD_VERSION = (typeof __APP_BUILD_VERSION__ !== "undefined" && __APP_BUILD_VERSION__) ? __APP_BUILD_VERSION__ : "0.6.0";

export function parseSemVer(v: string): number[] {
  return v.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
}

export function compareVersions(v1: string, v2: string): number {
  const a = parseSemVer(v1);
  const b = parseSemVer(v2);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const p1 = a[i] || 0;
    const p2 = b[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  if (!remoteVer || !currentVer) return false;
  return compareVersions(remoteVer, currentVer) > 0;
}

export type PasswordCheck = {
  valid: boolean;
  hasLength: boolean;
  hasLetterAndNumberAndSpecial: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

export function validatePasswordComplexity(pw: string): PasswordCheck {
  const hasLength = pw.length >= 8 && pw.length <= 72;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(pw);
  const hasLetterAndNumberAndSpecial = hasLetter && hasNumber && hasSpecial;
  return {
    valid: hasLength && hasLetterAndNumberAndSpecial,
    hasLength,
    hasLetterAndNumberAndSpecial,
    hasLetter,
    hasNumber,
    hasSpecial,
  };
}

export function generateDefaultUsername(userId?: string): string {
  if (!userId) return "User001";
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 9999) + 1;
  return `User${String(num).padStart(3, "0")}`;
}

export function validateCustomUsername(raw: string): { valid: boolean; error?: string } {
  const trimmed = raw.trim();
  if (trimmed.length <= 1) {
    return { valid: false, error: "Username must be more than 1 character." };
  }
  if (/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/.test(raw)) {
    return { valid: false, error: "Username contains invalid or hidden characters." };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { valid: false, error: "Username may only contain letters, numbers, underscores, dots, and hyphens." };
  }
  if (/^user\d+/i.test(trimmed)) {
    return { valid: false, error: "Usernames starting with 'User' followed by numbers are reserved for system IDs." };
  }
  return { valid: true };
}

export function validateEmailAddress(raw: string): { valid: boolean; error?: string } {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return { valid: true };
  const regex = /^[a-zA-Z0-9_.+-]+@(gmail\.com|outlook\.com|hotmail\.com|live\.com)$/i;
  if (!regex.test(trimmed)) {
    return { valid: false, error: "Only Gmail (@gmail.com) and Outlook (@outlook.com) email addresses are supported." };
  }
  return { valid: true };
}

export function readPage(): Page {
  const path = location.pathname;
  if (path === "/game") return "game";
  if (path === "/login") return "login";
  if (path === "/earn") return "earn";
  if (path === "/events") return "events";
  if (path === "/settings" || path === "/profile") return "settings";
  const stored = localStorage.getItem("unplastica-current-page") as Page | null;
  if (stored && ["home", "earn", "events", "settings", "game"].includes(stored)) {
    return stored;
  }
  return "home";
}
export function getTheme(): Theme {
  const value = localStorage.getItem("unplastica-theme") || localStorage.getItem("theme");
  return value === "dark" || value === "light" ? value : "system";
}
export function pagePath(page: Page) {
  return page === "home" ? "/" : page === "settings" ? "/settings" : "/" + page;
}
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+")) return "+" + digits;
  if (digits.startsWith("60")) return "+" + digits;
  if (digits.startsWith("0")) return "+60" + digits.slice(1);
  return "+60" + digits;
}
export function detectInstallEnvironment(): InstallEnvironment {
  const agent = navigator.userAgent;
  return {
    standalone: matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    insideApp: /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\//i.test(agent),
    iosSafari: /iPhone|iPad|iPod/i.test(agent) && /Safari/i.test(agent) && !/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\//i.test(agent),
  };
}

