import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { HABITS, ML_SCORE_THRESHOLD_DEFAULT, type HabitCode } from "@unplastica/shared";
import { Icon, type IconName } from "../components/Icon";
import { isSupabaseConfigured, supabase, uploadProfileAvatar } from "../lib/supabase";
import { formatPoints } from "../lib/format";
import { getLanguage, translate, type Language } from "../lib/i18n";

type Page = "home" | "earn" | "events" | "settings" | "login";
type Theme = "light" | "dark" | "system";
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
type InstallEnvironment = { standalone: boolean; insideApp: boolean; iosSafari: boolean };
const LanguageContext = createContext<Language>("English");
function useCopy() {
  const language = useContext(LanguageContext);
  return useCallback((key: string, values?: Record<string, string | number>) => translate(language, key, values), [language]);
}
type Profile = {
  display_name: string;
  username: string;
  email: string;
  phone: string;
  tagline: string;
  avatar_path: string | null;
  avatar_url: string | null;
  preferences: { theme?: Theme; language?: string; notifications?: boolean };
};

const guestProfile: Profile = {
  display_name: "Guest account",
  username: "guest",
  email: "",
  phone: "",
  tagline: "",
  avatar_path: null,
  avatar_url: null,
  preferences: { theme: "light", language: "English", notifications: true },
};
const habitImages: Record<HabitCode, string> = {
  box_cutlery: "/assets/habits/box-cutlery.png",
  recycle_bags: "/assets/habits/recycle-bags.png",
  self_bottle_refill: "/assets/habits/self-bottle-refill.png",
  greenery_furniture: "/assets/habits/greenery-furniture.png?v=2",
  handicraft_projects: "/assets/habits/handicraft-projects.png?v=2",
};

declare const __APP_BUILD_VERSION__: string | undefined;
export const APP_BUILD_VERSION = (typeof __APP_BUILD_VERSION__ !== "undefined" && __APP_BUILD_VERSION__) ? __APP_BUILD_VERSION__ : "0.2.4";

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

function readPage(): Page {
  const path = location.pathname;
  if (path === "/login") return "login";
  if (path === "/earn") return "earn";
  if (path === "/events") return "events";
  if (path === "/settings" || path === "/profile") return "settings";
  const stored = localStorage.getItem("unplastica-current-page") as Page | null;
  if (stored && ["home", "earn", "events", "settings"].includes(stored)) {
    return stored;
  }
  return "home";
}
function getTheme(): Theme {
  const value = localStorage.getItem("unplastica-theme");
  return value === "dark" || value === "system" || value === "light" ? value : "light";
}
function pagePath(page: Page) {
  return page === "home" ? "/" : page === "settings" ? "/settings" : "/" + page;
}
function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+")) return "+" + digits;
  if (digits.startsWith("60")) return "+" + digits;
  if (digits.startsWith("0")) return "+60" + digits.slice(1);
  return "+60" + digits;
}
function detectInstallEnvironment(): InstallEnvironment {
  const agent = navigator.userAgent;
  return {
    standalone: matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    insideApp: /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\//i.test(agent),
    iosSafari: /iPhone|iPad|iPod/i.test(agent) && /Safari/i.test(agent) && !/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\//i.test(agent),
  };
}

export function isNotificationsEnabled(): boolean {
  try {
    const raw = localStorage.getItem("unplastica-notifications");
    if (raw !== null) {
      return raw === "true";
    }
    const guestPref = localStorage.getItem("unplastica-guest-preferences");
    if (guestPref) {
      const parsed = JSON.parse(guestPref);
      if (typeof parsed.notifications === "boolean") return parsed.notifications;
    }
  } catch (_) {}
  return true;
}

export function getStoredNotificationPreference(): boolean {
  return isNotificationsEnabled();
}

export async function sendSystemNotification({
  title,
  body,
  url = "/",
  tag = "unplastica-alert",
  icon = "/icons/icon-192.png",
}: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}): Promise<boolean> {
  try {
    // Strict guard: do NOT send any notification if user turned off in Unplastica settings!
    if (!isNotificationsEnabled()) return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;

    const options: any = {
      body,
      icon,
      badge: "/icons/icon-192.png",
      tag,
      renotify: false, // Never re-alert repeatedly
      data: { url },
    };

    if ("serviceWorker" in navigator) {
      try {
        const regPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
        const reg = await Promise.race([regPromise, timeoutPromise]);
        if (reg && typeof reg.showNotification === "function") {
          await reg.showNotification(title, options);
          return true;
        }
      } catch (_) {}
    }

    try {
      const notif = new Notification(title, options);
      if (url) {
        notif.onclick = () => {
          window.focus();
          if (url.startsWith("/")) {
            history.pushState({}, "", url);
            window.dispatchEvent(new PopStateEvent("popstate"));
          } else {
            window.location.href = url;
          }
        };
      }
      return true;
    } catch (_) {}
  } catch (_) {}
  return false;
}

export async function sendCompetitionNotification(lang: Language = "English"): Promise<boolean> {
  if (!isNotificationsEnabled()) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  // Send it ONE TIME IS ENOUGH!
  if (
    localStorage.getItem("unplastica_apu_warrior_notified") === "true" ||
    localStorage.getItem("unplastica_notified_competition_apu") === "true"
  ) {
    return false;
  }
  localStorage.setItem("unplastica_apu_warrior_notified", "true");
  localStorage.setItem("unplastica_notified_competition_apu", "true");

  const title = translate(lang, "notification.apuTitle");
  const body = translate(lang, "notification.apuBody");

  return await sendSystemNotification({
    title,
    body,
    url: "/events",
    tag: "unplastica-competition-apu",
    icon: "/assets/events/apu-mark.png",
  });
}

export async function sendVerificationSuccessNotification(
  habitTitle: string,
  points: number,
  submissionId?: string,
  lang: Language = "English"
): Promise<boolean> {
  if (!isNotificationsEnabled()) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  if (submissionId) {
    const key = "unplastica_verified_notified_" + submissionId;
    if (localStorage.getItem(key) === "true") return false;
    localStorage.setItem(key, "true");
  }

  const title = translate(lang, "notification.verifiedTitle");
  const body = translate(lang, "notification.verifiedBody", { points, habit: habitTitle });

  return await sendSystemNotification({
    title,
    body,
    url: "/earn",
    tag: submissionId ? `unplastica-verify-${submissionId}` : "unplastica-verify",
    icon: "/icons/icon-192.png",
  });
}

export default function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 32);
  const [theme, setTheme] = useState<Theme>(getTheme);
  const [language, setLanguage] = useState<Language>(getLanguage);
  const [, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState(0);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const pendingPage = useRef<Page>("home");
  const [selectedHabit, setSelectedHabit] = useState<HabitCode | null>(null);
  const [infoHabit, setInfoHabit] = useState<HabitCode | null>(null);
  const [camera, setCamera] = useState(false);
  const [sample, setSample] = useState(false);
  const [eventSubpage, setEventSubpage] = useState<"challenge" | "done" | null>(null);
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState<boolean>(getStoredNotificationPreference);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installEnvironment, setInstallEnvironment] = useState<InstallEnvironment>(detectInstallEnvironment);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(language, key, values), [language]);
  userRef.current = user;

  useEffect(() => {
    const langCode = language === "中文" ? "zh-CN" : language === "Bahasa Melayu" ? "ms" : "en";
    document.documentElement.lang = langCode;
    document.title = t("app.title");
  }, [language, t]);

  const [dailyUsage, setDailyUsage] = useState<Record<string, number>>({});
  const [boxCutleryLastVerified, setBoxCutleryLastVerified] = useState<number>(() => {
    const local = localStorage.getItem("unplastica_box_cutlery_last_verified");
    return local ? Number(local) : 0;
  });
  const boxCutleryCooldownMs = Math.max(0, 5 * 3600 * 1000 - (Date.now() - boxCutleryLastVerified));

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  }, []);
  const navigate = useCallback((next: Page) => {
    if (location.pathname !== pagePath(next)) history.pushState({}, "", pagePath(next));
    setPage(next);
    if (next !== "events") setEventSubpage(null);
    localStorage.setItem("unplastica-current-page", next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const loadAccount = useCallback(async (activeUser: User | null) => {
    if (!activeUser || !supabase) { setProfile(null); setBalance(0); setDailyUsage({}); return; }
    const klNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const klDateStr = klNow.toISOString().slice(0, 10);
    const klStartUtc = new Date(`${klDateStr}T00:00:00.000+08:00`).toISOString();

    const [profileResult, balanceResult, dailyResult, lastBoxResult] = await Promise.all([
      supabase.from("profiles").select("display_name,username,email,phone,tagline,preferences,avatar_path").eq("id", activeUser.id).maybeSingle(),
      supabase.from("greenbit_balances").select("balance").eq("user_id", activeUser.id).maybeSingle(),
      supabase.from("habit_submissions").select("habit_code").eq("user_id", activeUser.id).eq("status", "approved").gte("created_at", klStartUtc),
      supabase.from("habit_submissions").select("scored_at,created_at").eq("user_id", activeUser.id).eq("habit_code", "box_cutlery").eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (lastBoxResult?.data) {
      const lastTime = new Date(lastBoxResult.data.scored_at || lastBoxResult.data.created_at).getTime();
      if (lastTime > 0) {
        setBoxCutleryLastVerified(lastTime);
        localStorage.setItem("unplastica_box_cutlery_last_verified", String(lastTime));
      }
    }
    const usage: Record<string, number> = {};
    if (dailyResult.data) {
      for (const item of dailyResult.data) {
        usage[item.habit_code] = (usage[item.habit_code] || 0) + 1;
      }
    }
    setDailyUsage(usage);
    const row = profileResult.data;
    const metadata = activeUser.user_metadata;
    const avatarPath = typeof row?.avatar_path === "string" ? row.avatar_path : null;
    const { data: signedAvatar } = avatarPath
      ? await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 3600)
      : { data: null };

    const defaultHandle = generateDefaultUsername(activeUser?.id);
    const isSystemDefault = !row?.username || row.username.startsWith("user_") || row.username.startsWith("User ") || row.username === "warrior" || row.username.includes("@");
    const username = isSystemDefault ? defaultHandle : row.username;
    const displayName = username;

    const userEmail = (row?.email || metadata?.email || activeUser.email || "").trim();

    setProfile({
      display_name: displayName,
      username: username,
      email: userEmail,
      phone: row?.phone || metadata?.phone || activeUser.phone || "",
      tagline: row?.tagline || metadata?.tagline || "Refusing plastic, one meal at a time.",
      avatar_path: avatarPath,
      avatar_url: signedAvatar?.signedUrl ?? metadata?.avatar_url ?? metadata?.picture ?? null,
      preferences: row?.preferences || {},
    });
    setBalance(Number(balanceResult.data?.balance ?? 0));

    if (activeUser) {
      const isDefault = (/^user\d+/i.test(username) || isSystemDefault) && !localStorage.getItem("unplastica_username_prompted_" + activeUser.id);
      if (isDefault) {
        setShowUsernamePrompt(true);
      }
    }
  }, []);

  useEffect(() => {
    const pop = () => {
      const next = readPage();
      if (next === "earn" && !userRef.current) {
        history.replaceState({}, "", "/");
        pendingPage.current = "earn";
        setPage("home");
        localStorage.setItem("unplastica-current-page", "home");
        setShowLoginGate(true);
        return;
      }
      setPage(next);
      localStorage.setItem("unplastica-current-page", next);
    };
    window.addEventListener("popstate", pop);
    const authClient = supabase;
    if (!authClient) return () => window.removeEventListener("popstate", pop);

    const initAuth = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        const hasHashToken = window.location.hash.includes("access_token");
        const isOAuthCallback = Boolean(code || hasHashToken);

        // 1. Supabase automatically exchanges PKCE / URL tokens when detectSessionInUrl is true.
        // getSession() will await client initialization.
        let { data: { session } } = await authClient.auth.getSession();

        // 2. Fallback: manual PKCE exchange if session was not automatically established
        if (!session && code) {
          try {
            const flowIdParam = searchParams.get("sb_flow_id");
            let flowId = flowIdParam;
            if (!flowId) {
              try {
                const flowKeys = Object.keys(localStorage).filter((k) => k.includes("-flow-") && k.endsWith("-code-verifier"));
                if (flowKeys.length > 0) {
                  const match = flowKeys[flowKeys.length - 1].match(/-flow-([a-f0-9]+)-code-verifier/i);
                  if (match) flowId = match[1];
                }
              } catch (_) {}
            }
            const { data, error } = await authClient.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
            if (!error && data.session) {
              session = data.session;
            } else if (error) {
              console.warn("PKCE manual exchange warning:", error.message);
            }
          } catch (e) {
            console.warn("PKCE manual exchange exception:", e);
          }
        }

        // Clean up URL parameters and clear any unvalidated hash tokens from history (prevents login CSRF via hash injection - FLAW-21)
        if (code || searchParams.has("code") || hasHashToken || window.location.hash) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("code");
          cleanUrl.searchParams.delete("state");
          cleanUrl.searchParams.delete("sb_flow_id");
          cleanUrl.hash = "";
          window.history.replaceState(window.history.state, "", cleanUrl.pathname + cleanUrl.search);
        }

        if (session) {
          setSession(session);
          setUser(session.user);
          await loadAccount(session.user);

          // If returning from OAuth or currently on login page, navigate to destination (defaulting to home)
          if (isOAuthCallback || (location.pathname === "/login" && session)) {
            const target = sessionStorage.getItem("unplastica-return-to") as Page | null;
            sessionStorage.removeItem("unplastica-return-to");
            const destination = target && target !== "login" ? target : "home";
            history.replaceState({}, "", pagePath(destination));
            setPage(destination);
            localStorage.setItem("unplastica-current-page", destination);
          }
        } else {
          setSession(null);
          setUser(null);
          await loadAccount(null);
          if (readPage() === "earn") {
            history.replaceState({}, "", "/");
            pendingPage.current = "earn";
            setPage("home");
            setShowLoginGate(true);
          }
        }
      } catch (err) {
        console.error("Auth init exception:", err);
      } finally {
        setReady(true);
      }
    };

    void initAuth();

    const { data } = authClient.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      window.setTimeout(() => {
        void loadAccount(next?.user ?? null);
        if (next?.user) {
          if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            void authClient.functions.invoke("welcome-bonus").then(() => loadAccount(next.user));
          }
          const hasReturn = sessionStorage.getItem("unplastica-return-to");
          const isCallback = window.location.search.includes("code=") || window.location.hash.includes("access_token=");
          // Only redirect when genuinely completing a login or return action
          if ((event === "SIGNED_IN" && (hasReturn || location.pathname === "/login" || isCallback)) || isCallback) {
            const target = hasReturn as Page | null;
            sessionStorage.removeItem("unplastica-return-to");
            const destination = (target && target !== "login" ? target : "home") as Page;
            history.replaceState({}, "", pagePath(destination));
            setPage(destination);
            localStorage.setItem("unplastica-current-page", destination);
          }
        }
      }, 0);
    });
    return () => {
      window.removeEventListener("popstate", pop);
      data.subscription.unsubscribe();
    };
  }, [loadAccount]);

  useEffect(() => {
    const applyTheme = () => {
      const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    applyTheme();
    localStorage.setItem("unplastica-theme", theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);
  useEffect(() => {
    if (!profile) return;
    const dbNotif = profile.preferences?.notifications;
    const notifVal = typeof dbNotif === "boolean" ? dbNotif : getStoredNotificationPreference();
    setNotifications(notifVal);
    localStorage.setItem("unplastica-notifications", String(notifVal));
    const savedLanguage = profile.preferences?.language;
    if (savedLanguage === "Bahasa Melayu" || savedLanguage === "中文" || savedLanguage === "English") {
      setLanguage(savedLanguage);
    }
    if (profile.preferences?.theme) setTheme(profile.preferences.theme);
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("unplastica-language", language);
  }, [language]);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    setInstallEnvironment(detectInstallEnvironment());
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => {
      setInstallEnvironment((current) => ({ ...current, standalone: true }));
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  useEffect(() => {
    if (ready && page === "earn" && !user) {
      history.replaceState({}, "", "/");
      setPage("home");
      pendingPage.current = "earn";
      setShowLoginGate(true);
    }
  }, [ready, page, user]);

  const savePreference = useCallback(async (key: "theme" | "language" | "notifications", value: string | boolean) => {
    if (key === "notifications") {
      localStorage.setItem("unplastica-notifications", String(value));
    }
    const next = { ...(profile?.preferences ?? {}), [key]: value };
    setProfile((current) => current ? { ...current, preferences: next } : current);
    if (supabase && user) {
      const { error } = await supabase.from("profiles").update({ preferences: next }).eq("id", user.id);
      if (error) {
        notify(t("settings.preferenceSaveError"));
        return false;
      }
      return true;
    } else {
      localStorage.setItem("unplastica-guest-preferences", JSON.stringify(next));
      return true;
    }
  }, [profile, user, notify, t]);

  const handleNotificationToggle = useCallback(async (value: boolean) => {
    setNotifications(value);
    localStorage.setItem("unplastica-notifications", String(value));
    await savePreference("notifications", value);

    if (value) {
      // Send one-time notification: APU competition if never notified, else welcome once
      const apuSent = localStorage.getItem("unplastica_notified_competition_apu") === "true";
      if (!apuSent) {
        void sendCompetitionNotification(language);
      } else {
        const welcomeSent = localStorage.getItem("unplastica_welcome_notified") === "true";
        if (!welcomeSent) {
          localStorage.setItem("unplastica_welcome_notified", "true");
          void sendSystemNotification({
            title: translate(language, "notification.welcomeTitle"),
            body: translate(language, "notification.welcomeBody"),
            icon: "/icons/icon-192.png",
            tag: "unplastica-welcome-alert",
            url: "/settings",
          });
        }
      }
    }
  }, [language, savePreference]);

  useEffect(() => {
    // Only push when notifications are active and allowed
    if (!notifications || !isNotificationsEnabled()) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Send competition notification ONE TIME ONLY if user has never received it
    const apuSent = localStorage.getItem("unplastica_notified_competition_apu") === "true";
    if (!apuSent) {
      const timer = window.setTimeout(() => {
        if (isNotificationsEnabled() && Notification.permission === "granted") {
          void sendCompetitionNotification(language);
        }
      }, 4000);
      return () => window.clearTimeout(timer);
    }
  }, [notifications, language]);

  if (!ready) return <div className="loading-shell"><BrandWordmark /></div>;
  const activeProfile = profile ?? { ...guestProfile, display_name: t("settings.guest"), preferences: { ...guestProfile.preferences, language } };
  const guest = !user;
  const openSettings = () => navigate("settings");
  const requestLogin = (target: Page) => {
    if (user) { navigate(target); return; }
    pendingPage.current = target;
    setShowLoginGate(true);
  };
  const startLogin = () => {
    sessionStorage.setItem("unplastica-return-to", pendingPage.current);
    setShowLoginGate(false);
    navigate("login");
  };
  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };
  const uploadAvatar = async (file: File) => {
    if (file.size > 50 * 1024) { notify(t("profile.photoTooLarge")); return; }
    if (file.type !== "image/jpeg" && file.type !== "image/png") { notify(t("profile.photoType")); return; }
    if (!user) { navigate("login"); return; }
    setAvatarBusy(true);
    try {
      await uploadProfileAvatar(file);
      await loadAccount(user);
      notify(t("profile.photoUploaded"));
    } catch (error) {
      console.error("Profile photo upload failed", error);
      notify(error instanceof Error && error.message.includes("50 KB") ? error.message : t("profile.photoError"));
    } finally {
      setAvatarBusy(false);
    }
  };

  const updateProfile = async (updated: { display_name: string; username: string; email?: string; phone: string; tagline: string }) => {
    if (!supabase || !user) return;
    const cleanUsername = updated.username.trim();
    const cleanEmail = (updated.email ?? "").trim().toLowerCase();
    const cleanPhone = updated.phone.trim();

    // Check identifier uniqueness using RPC (works securely under RLS)
    if (cleanPhone) {
      const { data: phoneAvailable } = await supabase.rpc("check_identifier_available", {
        p_type: "phone",
        p_value: cleanPhone,
      });
      if (phoneAvailable === false) {
        const err = new Error("This phone number is already registered to another account. Please use a different phone number.");
        notify(err.message);
        throw err;
      }
    }

    if (cleanEmail && cleanEmail !== user.email?.toLowerCase()) {
      const { data: emailAvailable } = await supabase.rpc("check_identifier_available", {
        p_type: "email",
        p_value: cleanEmail,
      });
      if (emailAvailable === false) {
        const err = new Error("This email is already registered to another account. Please use a different email.");
        notify(err.message);
        throw err;
      }
    }

    const payload: Record<string, string> = {
      display_name: cleanUsername,
      username: cleanUsername,
      tagline: updated.tagline.trim(),
    };

    let { error: profileErr } = await supabase.from("profiles").update(payload).eq("id", user.id);

    if (profileErr) {
      let friendlyMsg = "Failed to update profile. Please check your details and try again.";
      if (profileErr.message.includes("profiles_phone_unique") || profileErr.message.includes("phone")) {
        friendlyMsg = "This phone number is already registered to another account. Please use a different phone number.";
      } else if (profileErr.message.includes("profiles_email_unique") || profileErr.message.includes("email")) {
        friendlyMsg = "This email is already registered to another account. Please use a different email.";
      } else if (profileErr.message.includes("profiles_username") || profileErr.message.includes("unique")) {
        friendlyMsg = "This username is already taken. Please choose another.";
      }
      notify(friendlyMsg);
      throw new Error(friendlyMsg);
    }

    setProfile((current) => current ? {
      ...current,
      display_name: cleanUsername,
      username: cleanUsername,
      phone: cleanPhone,
      tagline: updated.tagline.trim(),
      email: cleanEmail || current.email,
    } : current);

    const userUpdatePayload: { data: Record<string, string>; email?: string } = {
      data: {
        display_name: cleanUsername,
        username: cleanUsername,
        phone: cleanPhone,
      },
    };
    if (cleanEmail && cleanEmail !== user.email?.toLowerCase()) {
      userUpdatePayload.email = cleanEmail;
    }
    await supabase.auth.updateUser(userUpdatePayload).catch((e) => {
      console.warn("Auth user update notice:", e);
    });

    await loadAccount(user);
    notify(t("settings.profileUpdatedSuccess"));
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase || !user) return;
    const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword });
    if (pwdErr) {
      notify(t("auth.passwordSetFailed", { error: pwdErr.message }));
      throw pwdErr;
    }
    notify(t("auth.passwordSetSuccess"));
  };

  return (
    <LanguageContext.Provider value={language}>
    <div className="app-shell">
      <Header
        page={page}
        eventSubpage={eventSubpage}
        onEventBack={() => setEventSubpage(null)}
        balance={balance}
        scrolled={scrolled}
        avatarUrl={profile?.avatar_url ?? null}
        onProfile={openSettings}
        onHome={() => navigate("home")}
      />
      <main className={"page page-" + page}>
        {page === "home" && <HomePage onEnter={() => requestLogin("earn")} />}
        {page === "earn" && <EarnPage
          selected={selectedHabit}
          dailyUsage={dailyUsage}
          boxCutleryCooldownMs={boxCutleryCooldownMs}
          onSelect={setSelectedHabit}
          onInfo={setInfoHabit}
          onCamera={() => {
            if (guest) { requestLogin("earn"); return; }
            if (!selectedHabit) { notify(t("earn.chooseFirst")); return; }
            if (selectedHabit === "box_cutlery" && boxCutleryCooldownMs > 0) {
              const h = Math.floor(boxCutleryCooldownMs / 3600000);
              const m = Math.ceil((boxCutleryCooldownMs % 3600000) / 60000);
              notify(t("earn.cooldownActive", { h, m }));
              return;
            }
            const limit = selectedHabit === "box_cutlery" ? 3 : 1;
            const used = dailyUsage[selectedHabit] || 0;
            if (used >= limit) {
              notify(t("earn.dailyQuotaNotice", { limit, s: limit > 1 ? "s" : "" }));
              return;
            }
            setCamera(true);
          }}
        />}
        {page === "events" && (
          <EventsPage
            activeTab={eventSubpage}
            onSelectTab={setEventSubpage}
            onSample={() => setSample(true)}
          />
        )}
        {page === "settings" && <SettingsPage
          profile={activeProfile}
          email={user?.email ?? ""}
          user={user}
          guest={guest}
          notifications={notifications}
          language={language}
          theme={theme}
          onNotification={handleNotificationToggle}
          onLanguage={(value) => { setLanguage(value); void savePreference("language", value); }}
          onTheme={(value) => { setTheme(value); void savePreference("theme", value); }}
          installAvailable={Boolean(installPrompt)}
          installEnvironment={installEnvironment}
          onInstall={installApp}
          avatarBusy={avatarBusy}
          onUploadAvatar={uploadAvatar}
          onAuth={() => { pendingPage.current = "settings"; sessionStorage.setItem("unplastica-return-to", "settings"); navigate("login"); }}
          onSignOut={async () => { await supabase?.auth.signOut(); navigate("home"); notify(t("common.logoutSuccess")); }}
          onUpdateProfile={updateProfile}
          onUpdatePassword={updatePassword}
          notify={notify}
        />}
        {page === "login" && <AuthPage user={user} onAuthenticated={() => { const target = sessionStorage.getItem("unplastica-return-to") as Page | null; sessionStorage.removeItem("unplastica-return-to"); navigate(target && target !== "login" ? target : "settings"); }} />}
      </main>
      {page !== "login" && <BottomNav page={page} onNavigate={(target) => target === "earn" ? requestLogin("earn") : navigate(target)} />}
      {page !== "login" && <InstallPrompt prompt={installPrompt} environment={installEnvironment} onInstall={installApp} />}
      <UpdateNotice />
      {toast && <div className="toast" role="status">{toast}</div>}
      {showLoginGate && <LoginRequiredDialog onClose={() => setShowLoginGate(false)} onLogin={startLogin} />}
      {camera && <CameraDialog
        habitCode={selectedHabit}
        onClose={() => setCamera(false)}
        onComplete={(message) => {
          setCamera(false);
          notify(message);
          if (selectedHabit === "box_cutlery" && (message.includes("Verified!") || message.includes("Disahkan!") || message.includes("已验证！"))) {
            const now = Date.now();
            setBoxCutleryLastVerified(now);
            localStorage.setItem("unplastica_box_cutlery_last_verified", String(now));
          }
          if (user) void loadAccount(user);
        }}
      />}
      {sample && <SampleDialog onClose={() => setSample(false)} />}
      {infoHabit && <HabitInfoDialog code={infoHabit} onClose={() => setInfoHabit(null)} />}
      {showUsernamePrompt && user && profile && (
        <UsernamePromptDialog
          initialUsername={profile.username}
          onSave={async (newUsername) => {
            await updateProfile({
              username: newUsername,
              display_name: newUsername,
              phone: profile.phone,
              tagline: profile.tagline,
            });
            localStorage.setItem("unplastica_username_prompted_" + user.id, "true");
            setShowUsernamePrompt(false);
            notify(t("auth.usernameUpdatedSuccess"));
          }}
          onDismiss={() => {
            localStorage.setItem("unplastica_username_prompted_" + user.id, "true");
            setShowUsernamePrompt(false);
          }}
        />
      )}
    </div>
    </LanguageContext.Provider>
  );
}

function Header({
  page,
  eventSubpage,
  onEventBack,
  balance,
  scrolled,
  avatarUrl,
  onProfile,
  onHome,
}: {
  page: Page;
  eventSubpage?: "challenge" | "done" | null;
  onEventBack?: () => void;
  balance: number;
  scrolled: boolean;
  avatarUrl: string | null;
  onProfile: () => void;
  onHome: () => void;
}) {
  const t = useCopy();
  return (
    <header className={"topbar topbar-" + page}>
      <div className="topbar-inner">
        {page === "settings" ? <>
          <button className="header-back" onClick={onHome} aria-label={t("common.back")}><Icon name="back" /></button>
          <h1 className="settings-header-title">{t("settings.profile")}</h1>
          <span className="header-spacer" />
        </> : <>
          {page === "events" && eventSubpage ? (
            <button className="header-back" onClick={onEventBack} aria-label={t("common.back")}>
              <Icon name="back" />
            </button>
          ) : (
            <button className={"brand-button " + (scrolled ? "is-scrolled" : "")} onClick={onHome} aria-label={t("nav.home")}>
              <BrandLogo scrolled={scrolled} />
            </button>
          )}
          {page !== "login" && <div className="balance-pill"><img src="/assets/brand/greenbits.png" alt="" /><strong>{formatPoints(balance)}</strong></div>}
          {page !== "login" && <button className="avatar-button" onClick={onProfile} aria-label={t("common.profile")}>{avatarUrl ? <img className="header-avatar-photo" src={avatarUrl} alt="" /> : <Icon name="user" />}</button>}
        </>}
      </div>
    </header>
  );
}

function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={"brand-wordmark-wrapper " + className} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img className="brand-image-light" src="/assets/brand/brand-wordmark-light.png?v=0.2.4" alt="Unplastica" style={{ width: "220px", height: "auto", maxWidth: "75vw", objectFit: "contain" }} />
      <img className="brand-image-dark" src="/assets/brand/brand-wordmark-dark.png?v=0.2.4" alt="Unplastica" style={{ width: "220px", height: "auto", maxWidth: "75vw", objectFit: "contain" }} />
    </div>
  );
}

function BrandLogo({ scrolled = false }: { scrolled?: boolean } = {}) {
  return (
    <span className={"brand-crop " + (scrolled ? "wordmark-visible" : "mark-visible")} aria-hidden="true">
      <img className="brand-mark brand-image-light" src="/assets/brand/brand-mark-light.png?v=0.2.4" alt="Unplastica" />
      <img className="brand-mark brand-image-dark" src="/assets/brand/brand-mark-dark.png?v=0.2.4" alt="Unplastica" />
      <img className="brand-wordmark brand-image-light" src="/assets/brand/brand-wordmark-light.png?v=0.2.4" alt="Unplastica" />
      <img className="brand-wordmark brand-image-dark" src="/assets/brand/brand-wordmark-dark.png?v=0.2.4" alt="Unplastica" />
    </span>
  );
}

function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  const t = useCopy();
  const items: Array<{ page: Page; title: string; icon: IconName }> = [
    { page: "home", title: t("nav.home"), icon: "home" },
    { page: "earn", title: t("nav.earn"), icon: "earn" },
    { page: "events", title: t("nav.events"), icon: "events" },
  ];
  return <nav className="bottom-nav" aria-label={t("nav.mainNav")}>
    {items.map((item) => <button key={item.page} className={"nav-tab " + (page === item.page ? "active" : "")} onClick={() => onNavigate(item.page)} aria-current={page === item.page ? "page" : undefined}>
      {item.page === "earn" ? (
        <img src="/assets/brand/greenbits.png" alt="" className="nav-earn-icon" style={{ width: 23, height: 23, objectFit: "contain", display: "block", background: "transparent" }} />
      ) : (
        <Icon name={item.icon} size={23} />
      )}
      <span>{item.title}</span>
    </button>)}
  </nav>;
}

function HomePage({ onEnter }: { onEnter: () => void }) {
  const t = useCopy();
  return <div className="content home-content">
    <section className="home-hero">
      <video className="hero-video" autoPlay muted loop playsInline aria-label="Polluted river with plastic waste">
        <source src="/assets/home/polluted-river.mp4" type="video/mp4" />
      </video>
      <div className="hero-tint" />
      <h1>{t("home.title1")}<br /><span>{t("home.title2")}</span></h1>
    </section>
    <section className="sanctuary">
      <h2>{t("home.sanctuary")}</h2>
      <button className="primary-button" onClick={onEnter}>{t("home.enter")} <Icon name="arrow" size={20} /></button>
      <p className="speech-card">{t("home.speech")}</p>
    </section>
  </div>;
}

function EarnPage({ selected, dailyUsage, boxCutleryCooldownMs, onSelect, onInfo, onCamera }: {
  selected: HabitCode | null;
  dailyUsage: Record<string, number>;
  boxCutleryCooldownMs: number;
  onSelect: (code: HabitCode) => void;
  onInfo: (code: HabitCode) => void;
  onCamera: () => void;
}) {
  const t = useCopy();
  const habit = HABITS.find((item) => item.code === selected);
  const selectedLimit = selected === "box_cutlery" ? 3 : 1;
  const selectedUsed = (selected && dailyUsage[selected]) || 0;
  const isSelectedCapped = selectedUsed >= selectedLimit;
  const isBoxCooldown = selected === "box_cutlery" && boxCutleryCooldownMs > 0;
  const isBlocked = isSelectedCapped || isBoxCooldown;

  return <div className="content earn-content">
    <section className="earn-heading"><h1><span>{t("earn.titleStart")}</span><img src="/assets/brand/greenbits.png" alt="Greenbits" style={{ background: "transparent" }} /><span>{t("earn.titleEnd")}</span></h1><p>{t("earn.subtitle")}</p></section>
    <section className="camera-section">
      <div className="section-heading"><h2>{t("earn.checker")}</h2></div>
      <button className={"camera-frame " + (isBlocked ? "is-capped" : "")} onClick={onCamera}>
        <i className="frame-corner corner-top-left" /><i className="frame-corner corner-top-right" />
        <i className="frame-corner corner-bottom-left" /><i className="frame-corner corner-bottom-right" />
        <span className="camera-helper"><img src="/assets/brand/greenbits.png" alt="Greenbits" style={{ width: 28, height: 28, objectFit: "contain", background: "transparent" }} /></span>
        <span className="camera-copy">
          <strong>{habit ? t("habit." + habit.code) : t("camera.title")}</strong>
          <span>
            {isBoxCooldown
              ? t("earn.cooldownActive", { h: Math.floor(boxCutleryCooldownMs / 3600000), m: Math.ceil((boxCutleryCooldownMs % 3600000) / 60000) })
              : isSelectedCapped
              ? t("earn.dailyLimitReachedToday")
              : habit
              ? t("earn.reward", { points: habit.points })
              : t("earn.hold")}
          </span>
        </span>
        <span className="camera-action"><Icon name="camera" size={25} /></span>
      </button>
    </section>
    <section className="habit-section">
      <div className="section-heading"><h2>{t("earn.habits")}</h2></div>
      <div className="habit-list">{HABITS.map((item) => {
        const limit = item.code === "box_cutlery" ? 3 : 1;
        const used = dailyUsage[item.code] || 0;
        const capped = used >= limit;
        const isCooldown = item.code === "box_cutlery" && boxCutleryCooldownMs > 0;
        return (
          <article key={item.code} className={"habit-row " + (selected === item.code ? "selected" : "") + (capped || isCooldown ? " is-capped" : "")}>
            <button className="habit-select" onClick={() => onSelect(item.code)} aria-pressed={selected === item.code}>
              <img src={habitImages[item.code]} alt="" />
              <span className="habit-labels">
                <strong>{t("habit." + item.code)}</strong>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <b style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}><img className="habit-points-icon" src="/assets/brand/greenbits.png" alt="" style={{ width: 16, height: 16, objectFit: "contain", background: "transparent" }} />+{item.points}</b>
                  <span className={"daily-quota-pill" + (capped || isCooldown ? " capped" : "")}>
                    {isCooldown ? t("earn.dailyQuotaCooldown", { h: Math.floor(boxCutleryCooldownMs / 3600000), m: Math.ceil((boxCutleryCooldownMs % 3600000) / 60000) }) : capped ? t("earn.dailyQuotaCapped") : t("earn.dailyQuotaToday", { used, limit })}
                  </span>
                </span>
              </span>
            </button>
            <button className="info-button" aria-label={t("common.about", { habit: t("habit." + item.code) })} onClick={() => onInfo(item.code)}><Icon name="info" /></button>
          </article>
        );
      })}</div>
    </section>
  </div>;
}

function renderHashtags(text: string) {
  const parts = text.split(/(#unplasticaAPU|#unplastica|@ our official social media|@ media sosial rasmi kami|@ 我们的官方社交账号)/gi);
  return parts.map((part, idx) => {
    if (part.startsWith("#") || part.startsWith("@")) {
      return <strong key={idx}>{part}</strong>;
    }
    return part;
  });
}

function EventsPage({
  activeTab,
  onSelectTab,
  onSample,
}: {
  activeTab: "challenge" | "done" | null;
  onSelectTab: (tab: "challenge" | "done" | null) => void;
  onSample: () => void;
}) {
  const t = useCopy();

  const milestones = [
    { title: t("events.items"), detail: t("events.itemsDetail"), image: habitImages.box_cutlery },
    { title: t("events.campus"), detail: t("events.campusDetail"), image: habitImages.recycle_bags },
    { title: t("events.pioneer"), detail: t("events.pioneerDetail"), image: "/assets/events/apu-mark.png" },
  ];

  return (
    <div className="content events-content">
      {/* Horizontal Rectangle Event Cards Overview: only shown before clicking */}
      {!activeTab && (
        <section className="events-columns-selector">
          <button
            className="event-column-card"
            onClick={() => onSelectTab("challenge")}
          >
            <div className="event-column-bg" style={{ backgroundImage: "url(/assets/events/noplastic-challenge.png)" }} />
            <div className="event-column-overlay" />
            <div className="event-column-content">
              <h3>{t("events.columnChallenge")}</h3>
            </div>
            <span className="event-card-arrow"><Icon name="arrow" size={20} /></span>
          </button>

          <button
            className="event-column-card"
            onClick={() => onSelectTab("done")}
          >
            <div className="event-column-bg apu-logo-bg" style={{ backgroundImage: "url(/assets/events/apu-mark.png)" }} />
            <div className="event-column-overlay" />
            <div className="event-column-content">
              <h3>{t("events.columnDone")}</h3>
            </div>
            <span className="event-card-arrow"><Icon name="arrow" size={20} /></span>
          </button>
        </section>
      )}

      {/* Column 1 Content: No-plastic Challenge */}
      {activeTab === "challenge" && (
        <div className="event-column-view challenge-view">
          <section className="event-intro">
            <h1>{t("events.headline")}</h1>
            <article className="campus-feature">
              <div className="campus-feature-main">
                <img className="campus-feature-logo" src="/assets/events/apu-mark.png" alt="APU logo" />
                <div className="campus-feature-info">
                  <h2>{t("events.campusName")}</h2>
                  <p>{t("events.campusFullName")}</p>
                </div>
              </div>
              <div className="deadline-badge">
                <strong>{t("events.deadline")}</strong>
              </div>
            </article>
          </section>

          <div className="challenge-columns-wrapper">
            <section className="prizes">
              <div className="section-heading"><h2>{t("events.prizes")}</h2></div>
              <article className="champion-prize">
                <span className="prize-icon"><Icon name="trophy" /></span>
                <strong>{t("events.champion")}</strong>
                <b>{t("events.prizeChampion")}</b>
              </article>
              <div className="runner-up-prizes">
                <article>
                  <span><Icon name="medal" size={18} /> {t("events.runner")}</span>
                  <b>{t("events.prizeSecond")}</b>
                </article>
                <article>
                  <span><Icon name="medal" size={18} /> {t("events.tiers")}</span>
                  <b>{t("events.prizeThird")}</b>
                </article>
              </div>
            </section>

            <div className="challenge-divider" aria-hidden="true" />

            <section className="tournament">
              <h2>{t("events.details")}</h2>
              <div className="action-card">
                <h3>{t("events.action")}</h3>
                <p><Icon name="check" />{t("events.proof")}</p>
                <p><Icon name="check" />{t("events.actionCollab")}</p>
                <div className="social-rule">
                  <strong className="supported-social-media-title">{t("events.socialRule")}</strong>
                </div>
                <img className="social-media-strip" src="/assets/brand/social-media.png" alt="Supported social media" />
                <p className="hashtag-note">
                  {renderHashtags(t("events.tagRule"))}
                </p>
              </div>
            </section>
          </div>

          <section className="criteria">
            <h2>{t("events.judging")}</h2>
            <div className="criteria-grid">
              <Criterion icon="leaf" percent="50%" title={t("events.impact")} detail={t("events.diversion")} />
              <Criterion icon="users" percent="25%" title={t("events.collaboration")} detail={t("events.engagement")} />
              <Criterion icon="like" percent="15%" title={t("events.popularity")} detail={t("events.verification")} />
              <Criterion icon="bulb" percent="10%" title={t("events.creative")} detail={t("events.substitutes")} />
            </div>
          </section>

          <button className="sample-link" onClick={onSample}>
            <span className="play-circle"><Icon name="play" /></span>
            <span><strong>{t("events.sample")}</strong><small>{t("events.inspect")}</small></span>
            <Icon name="arrow" />
          </button>
        </div>
      )}

      {/* Column 2 Content: What we had done in APU? */}
      {activeTab === "done" && (
        <div className="event-column-view done-view">
          <section className="milestones">
            <div className="section-heading"><h2>{t("events.done")}</h2><span>{t("events.milestones")}</span></div>
            <div className="milestone-list">
              {milestones.map((item) => (
                <article className="milestone" key={item.title}>
                  <img src={item.image} alt="" />
                  <div><span>{item.title}</span><strong>{item.detail}</strong></div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Criterion({ icon, percent, title, detail }: { icon: IconName; percent: string; title: string; detail: string }) {
  return <article className="criterion"><div className="criterion-top"><span><Icon name={icon} /></span><b>{percent}</b></div><strong>{title}</strong><small>{detail}</small></article>;
}

function AvatarCropModal({
  imageSrc,
  onCrop,
  onCancel,
}: {
  imageSrc: string;
  onCrop: (file: File) => Promise<void> | void;
  onCancel: () => void;
}) {
  const t = useCopy();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleSave = async () => {
    const img = imgRef.current;
    if (!img) return;
    setSaving(true);
    try {
      const OUTPUT_SIZE = 256;
      const VIEWPORT_SIZE = 260;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.translate(pan.x * ratio, pan.y * ratio);
      ctx.scale(zoom * ratio, zoom * ratio);

      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      const fitScale = Math.max(VIEWPORT_SIZE / naturalW, VIEWPORT_SIZE / naturalH);
      const renderW = naturalW * fitScale;
      const renderH = naturalH * fitScale;
      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.restore();

      // Compress to guarantee size <= 50 KB
      let quality = 0.85;
      let blob: Blob | null = null;
      for (let i = 0; i < 5; i++) {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= 50 * 1024) break;
        quality -= 0.15;
      }

      if (!blob) throw new Error("Could not create cropped image");
      const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      await onCrop(croppedFile);
    } catch (err) {
      console.error("Avatar crop error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog-sheet avatar-crop-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header" style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "var(--forest)", fontSize: "1.1rem" }}>{t("profile.cropTitle")}</h3>
          <button type="button" className="dialog-close" onClick={onCancel} aria-label={t("common.close")}>
            <Icon name="close" />
          </button>
        </div>
        <div
          className="avatar-crop-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            className="avatar-crop-image"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
            draggable={false}
          />
          <div className="avatar-crop-mask" />
        </div>
        <div className="avatar-crop-controls">
          <label>
            <span>{t("profile.zoom")}</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="dialog-actions" style={{ width: "100%", display: "flex", gap: "10px" }}>
          <button type="button" className="ghost-button" onClick={onCancel} disabled={saving} style={{ flex: 1 }}>
            {t("common.cancel")}
          </button>
          <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={saving} style={{ flex: 1 }}>
            {saving ? t("profile.uploading") : t("profile.cropSave")}
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoutConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useCopy();
  return (
    <Modal onClose={onCancel} labelledBy="logout-confirm-title">
      <div className="dialog login-required-dialog logout-confirm-dialog">
        <button className="dialog-close" onClick={onCancel} aria-label={t("common.close")}>
          <Icon name="close" />
        </button>
        <BrandWordmark />
        <h2 id="logout-confirm-title">{t("auth.logoutConfirmTitle")}</h2>
        <p>{t("auth.logoutConfirmDesc")}</p>
        <button type="button" className="primary-button logout-confirm-btn" onClick={onConfirm}>
          {t("settings.logoutAction")}
        </button>
        <button type="button" className="text-button" onClick={onCancel}>
          {t("common.cancel")}
        </button>
      </div>
    </Modal>
  );
}

function SettingsPage(props: {
  profile: Profile; email: string; user: User | null; guest: boolean; notifications: boolean; language: Language; theme: Theme;
  installAvailable: boolean; installEnvironment: InstallEnvironment; onInstall: () => Promise<void>;
  avatarBusy: boolean; onUploadAvatar: (file: File) => void;
  onNotification: (value: boolean) => Promise<void> | void; onLanguage: (value: Language) => void; onTheme: (value: Theme) => void;
  onAuth: () => void; onSignOut: () => void;
  onUpdateProfile?: (updated: { display_name: string; username: string; email?: string; phone: string; tagline: string }) => Promise<void>;
  onUpdatePassword?: (password: string) => Promise<void>;
  notify: (message: string) => void;
}) {
  const t = useCopy();
  const [toggleBusy, setToggleBusy] = useState(false);
  const [updatePending, setUpdatePending] = useState(() => {
    const pendingVer = localStorage.getItem("unplastica_update_available");
    if (!pendingVer) return false;
    const installed = localStorage.getItem("unplastica_app_version");
    if (installed && compareVersions(installed, pendingVer) >= 0) return false;
    return isNewerVersion(pendingVer, APP_BUILD_VERSION);
  });
  const [targetVersion, setTargetVersion] = useState(() => {
    const pendingVer = localStorage.getItem("unplastica_update_available");
    return (pendingVer && isNewerVersion(pendingVer, APP_BUILD_VERSION)) ? pendingVer : APP_BUILD_VERSION;
  });

  useEffect(() => {
    const handleUpdateDetected = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (detail?.upToDate) {
        setUpdatePending(false);
        return;
      }
      const newVer = detail?.version;
      if (newVer && isNewerVersion(newVer, APP_BUILD_VERSION)) {
        setTargetVersion(newVer);
        setUpdatePending(true);
      } else {
        setUpdatePending(false);
      }
    };
    window.addEventListener("unplastica-update-detected", handleUpdateDetected);
    return () => window.removeEventListener("unplastica-update-detected", handleUpdateDetected);
  }, []);
  const [updatingApp, setUpdatingApp] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [editUsername, setEditUsername] = useState(props.profile.username);
  const [editEmail, setEditEmail] = useState(props.profile.email || props.email || "");
  const [editPhone, setEditPhone] = useState(props.profile.phone);
  const [editTagline, setEditTagline] = useState(props.profile.tagline);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const initials = props.profile.display_name.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();

  const displayEmail = (props.profile.email || props.email || "").trim();

  const isGoogleOAuth = Boolean(
    props.user?.app_metadata?.providers?.includes("google") ||
    props.user?.app_metadata?.provider === "google" ||
    props.user?.identities?.some((id) => id.provider === "google") ||
    displayEmail.toLowerCase().endsWith("@gmail.com")
  );

  const isMicrosoftOAuth = Boolean(
    props.user?.app_metadata?.providers?.includes("azure") ||
    props.user?.app_metadata?.provider === "azure" ||
    props.user?.identities?.some((id) => id.provider === "azure") ||
    displayEmail.toLowerCase().endsWith("@outlook.com") ||
    displayEmail.toLowerCase().endsWith("@hotmail.com") ||
    displayEmail.toLowerCase().endsWith("@live.com")
  );

  useEffect(() => {
    setEditUsername(props.profile.username);
    setEditEmail(props.profile.email || props.email || "");
    setEditPhone(props.profile.phone);
    setEditTagline(props.profile.tagline);
  }, [props.profile, props.email]);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp") {
      props.notify(t("profile.photoType"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!props.onUpdateProfile) return;
    setProfileError("");

    const userCheck = validateCustomUsername(editUsername);
    if (!userCheck.valid) {
      setProfileError(userCheck.error || "Invalid username");
      return;
    }

    const cleanUsername = editUsername.trim();
    const cleanEmail = editEmail.trim().toLowerCase();
    if (cleanEmail) {
      const emailCheck = validateEmailAddress(cleanEmail);
      if (!emailCheck.valid) {
        setProfileError(emailCheck.error || "Invalid email address");
        return;
      }
    }

    const cleanPhone = editPhone.replace(/[^\d+ ()-]/g, "").slice(0, 20);
    const cleanTagline = editTagline.replace(/[\u200B-\u200D\uFEFF]/g, "").slice(0, 120);

    setSavingProfile(true);
    try {
      await props.onUpdateProfile({
        display_name: cleanUsername,
        username: cleanUsername,
        email: cleanEmail.slice(0, 100),
        phone: cleanPhone,
        tagline: cleanTagline,
      });
      setShowEditProfile(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const pwCheck = validatePasswordComplexity(newPassword);

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!props.onUpdatePassword) return;
    setPasswordError("");
    if (!pwCheck.valid) {
      setPasswordError(t("auth.passwordRequirement"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("auth.passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    try {
      await props.onUpdatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setShowSetPassword(false);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t("auth.passwordSetFailed", { error: "" }));
    } finally {
      setSavingPassword(false);
    }
  };

  return <div className="content settings-content">
    {!props.installEnvironment.standalone && <section className="download-app-card">
      <span className="download-app-icon"><Icon name="download" size={21} /></span>
      <div className="download-app-copy"><strong>{t("install.keep")}</strong><span>{t("install.help")}</span></div>
      <button className="download-app-button" onClick={() => props.installAvailable ? void props.onInstall() : setShowInstallHelp((value) => !value)}>{t("settings.downloadApp")}</button>
      {showInstallHelp && <p className="download-app-help">{props.installEnvironment.insideApp ? t("install.browserHelp") : props.installEnvironment.iosSafari ? t("install.iosHelp") : t("install.manualHelp")}</p>}
    </section>}
    <div className="profile-identity">
      <div className="profile-avatar">{props.profile.avatar_url ? <img src={props.profile.avatar_url} alt="" /> : initials}</div>
      <h2>{props.profile.display_name}</h2>
      {isGoogleOAuth && (
        <div className="oauth-status-badge">
          <GoogleMark />
          <span>Google Connected{displayEmail ? `: ${displayEmail}` : ""}</span>
        </div>
      )}
      {isMicrosoftOAuth && (
        <div className="oauth-status-badge" style={{ borderColor: "#00a4ef" }}>
          <MicrosoftMark />
          <span>Microsoft Connected{displayEmail ? `: ${displayEmail}` : ""}</span>
        </div>
      )}
      {props.guest ? <button className="profile-photo-upload" onClick={props.onAuth}><Icon name="camera" size={18} />{t("profile.loginToUpload")}</button> :
        <label className={"profile-photo-upload " + (props.avatarBusy ? "is-busy" : "")}>
          <Icon name="camera" size={18} /><span>{props.avatarBusy ? t("profile.uploading") : props.profile.avatar_url ? t("profile.changePhoto") : t("profile.uploadPhoto")}</span>
          <input type="file" accept="image/jpeg,image/png" onChange={chooseAvatar} disabled={props.avatarBusy} />
        </label>}
      <p className="profile-photo-note">{t("profile.photoLimit")}</p>
    </div>

    {updatePending && (
      <div style={{ textAlign: "center", margin: "6px 0 16px" }}>
        <button
          type="button"
          className="ghost-button"
          disabled={updatingApp}
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--forest)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            border: "1.5px dashed var(--leaf)",
            borderRadius: 8,
            background: "rgba(86, 217, 133, 0.14)",
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
          }}
          onClick={async () => {
            setUpdatingApp(true);
            try {
              if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.unregister();
              }
              if ("caches" in window) {
                const keys = await caches.keys();
                for (const key of keys) await caches.delete(key);
              }
            } catch (e) {
              console.error(e);
            }
            localStorage.removeItem("unplastica_update_available");
            localStorage.setItem("unplastica_acknowledged_update_ver", targetVersion);
            localStorage.setItem("unplastica_app_version", targetVersion);
            setUpdatePending(false);
            window.location.href = window.location.pathname + "?_ts=" + Date.now();
          }}
        >
          <Icon name="arrow" size={14} />
          <span>{updatingApp ? t("settings.updatingApp") : `v${targetVersion} (${t("settings.updateReady")}) • ${t("settings.forceRefreshClearCache")}`}</span>
        </button>
      </div>
    )}

    <div className="profile-details">
      <DetailRow label={t("settings.username")} value={props.guest ? t("settings.guest") : "@" + props.profile.username} icon="users" />
      <DetailRow
        label={isMicrosoftOAuth ? t("settings.outlookAccountLabel") : isGoogleOAuth || displayEmail.toLowerCase().endsWith("@gmail.com") ? t("settings.googleAccountLabel") : t("settings.email")}
        value={displayEmail ? displayEmail : props.guest ? t("settings.guestConnectHint") : t("settings.notLinkedHint")}
        icon="mail"
      />
      <DetailRow
        label={t("settings.phone")}
        value={props.profile.phone ? props.profile.phone : props.guest ? t("settings.guestPhoneHint") : t("settings.notLinkedHint")}
        icon="user"
      />
      {!props.guest && props.profile.tagline && <DetailRow label={t("settings.tagline")} value={props.profile.tagline} icon="bulb" />}
    </div>

    {!props.guest && (
      <div className="settings-action-row">
        <button
          type="button"
          className="settings-action-button"
          onClick={() => { setShowEditProfile(!showEditProfile); setShowSetPassword(false); }}
        >
          <Icon name="user" size={17} />
          {showEditProfile ? t("settings.closeProfileEditBtn") : t("settings.editProfileBtn")}
        </button>
        <button
          type="button"
          className="settings-action-button"
          onClick={() => { setShowSetPassword(!showSetPassword); setShowEditProfile(false); }}
        >
          <Icon name="shield" size={17} />
          {showSetPassword ? t("auth.closePassword") : t("auth.setPassword")}
        </button>
      </div>
    )}

    {showEditProfile && (
      <section className="settings-edit-card">
        <h4>{t("settings.editProfileTitle")}</h4>
        <form onSubmit={(e) => void handleSaveProfile(e)}>
          <label>{t("settings.usernameUpper")}
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 30))}
              placeholder="e.g. warrior"
              required
            />
          </label>
          <label>{t("settings.emailUpper")}
            <input
              type="email"
              value={editEmail}
              maxLength={100}
              onChange={(e) => setEditEmail(e.target.value.trim().toLowerCase().slice(0, 100))}
              placeholder="e.g. warrior@gmail.com"
            />
          </label>
          <label>{t("settings.phoneUpper")}
            <input
              type="tel"
              value={editPhone}
              maxLength={20}
              onChange={(e) => setEditPhone(e.target.value.replace(/[^\d+ ()-]/g, "").slice(0, 20))}
              placeholder="+60 12 345 6789"
            />
          </label>
          <label>{t("settings.taglineUpper")}
            <input
              type="text"
              value={editTagline}
              maxLength={120}
              onChange={(e) => setEditTagline(e.target.value.slice(0, 120))}
              placeholder={t("settings.taglinePlaceholder")}
            />
          </label>
          {profileError && <p className="form-error" role="alert">{profileError}</p>}
          <button className="settings-save-button" disabled={savingProfile}>
            {savingProfile ? t("settings.saving") : t("settings.saveProfileBtn")}
          </button>
        </form>
      </section>
    )}

    {showSetPassword && (
      <section className="settings-edit-card">
        <h4>{t("auth.setAccountPasswordTitle")}</h4>
        <p>
          {isGoogleOAuth
            ? t("auth.setPasswordGoogleDesc")
            : t("auth.setPasswordDeviceDesc")}
        </p>
        <form onSubmit={(e) => void handleSavePassword(e)}>
          <label>{t("auth.newPasswordLabel")}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value.slice(0, 36))}
              minLength={8}
              maxLength={36}
              placeholder={t("criteria.length36")}
              required
            />
            <div className="password-criteria-list">
              <div className={"password-criterion " + (pwCheck.hasLength ? "met" : "")}>
                <span className="criterion-circle" aria-hidden="true">
                  {pwCheck.hasLength && (
                    <svg className="criterion-tick" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5l3 3 6-6" />
                    </svg>
                  )}
                </span>
                <span>{t("criteria.length36")}</span>
              </div>
              <div className={"password-criterion " + (pwCheck.hasLetterAndNumberAndSpecial ? "met" : "")}>
                <span className="criterion-circle" aria-hidden="true">
                  {pwCheck.hasLetterAndNumberAndSpecial && (
                    <svg className="criterion-tick" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5l3 3 6-6" />
                    </svg>
                  )}
                </span>
                <span>{t("criteria.complexity")}</span>
              </div>
            </div>
          </label>
          <label>{t("auth.confirmPasswordLabel")}
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value.slice(0, 36))}
              minLength={8}
              maxLength={36}
              placeholder={t("auth.repeatPasswordPlaceholder")}
              required
            />
          </label>
          {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
          <button className="settings-save-button" disabled={savingPassword || !pwCheck.valid}>
            {savingPassword ? t("auth.updating") : t("auth.setPassword")}
          </button>
        </form>
      </section>
    )}

    <section className="preferences"><h3>{t("settings.preferences")}</h3>
      <div className="setting-card setting-toggle"><span className="setting-icon"><Icon name="bell" /></span><strong>{t("settings.notifications")}</strong><button className={"switch " + (props.notifications ? "on" : "")} role="switch" aria-checked={props.notifications} aria-label={t("settings.notifications")} disabled={toggleBusy} onClick={async () => {
        const next = !props.notifications;
        if (next) {
          if (!("Notification" in window)) {
            props.notify(t("settings.notificationsNotSupported"));
            return;
          }
          let permission = Notification.permission;
          if (permission === "denied") {
            props.notify(t("settings.notificationsBlocked"));
            return;
          }
          if (permission === "default") {
            setToggleBusy(true);
            try {
              permission = await Notification.requestPermission();
            } catch (err) {
              console.error("Notification permission error:", err);
            } finally {
              setToggleBusy(false);
            }
          }
          if (permission !== "granted") {
            props.notify(t("settings.notificationsPermissionDenied"));
            return;
          }
          setToggleBusy(true);
          try {
            await props.onNotification(true);
            props.notify(t("settings.notificationsEnabled"));
          } finally {
            setToggleBusy(false);
          }
        } else {
          setToggleBusy(true);
          try {
            await props.onNotification(false);
            props.notify(t("settings.notificationsDisabled"));
          } finally {
            setToggleBusy(false);
          }
        }
      }}><span /></button></div>
      <div className="setting-card setting-select"><div className="setting-title"><span className="setting-icon"><Icon name="globe" /></span><strong>{t("settings.language")}</strong></div><div className="segmented language-options">
        {(["Bahasa Melayu", "English", "中文"] as const).map((value) => <button key={value} className={props.language === value ? "active" : ""} onClick={() => props.onLanguage(value)}>{value}</button>)}
      </div></div>
      <div className="setting-card setting-select"><div className="setting-title"><span className="setting-icon"><Icon name="sun" /></span><strong>{t("settings.theme")}</strong></div><div className="segmented theme-options">
        {([["light", "sun", t("theme.light")], ["dark", "moon", t("theme.dark")], ["system", "monitor", t("theme.system")]] as const).map(([value, icon, label]) =>
          <button key={value} className={props.theme === value ? "active" : ""} aria-label={t("theme.ariaLabel", { label })} aria-pressed={props.theme === value} onClick={() => props.onTheme(value)}><Icon name={icon} /><span>{label}</span></button>)}
      </div></div>
    </section>
    <button
      className="logout-button"
      onClick={() => {
        if (props.guest) {
          props.onAuth();
        } else {
          setShowLogoutConfirm(true);
        }
      }}
    >
      <Icon name={props.guest ? "mail" : "logout"} />
      {props.guest ? t("settings.login") : t("settings.logout")}
    </button>
    {props.guest && <p className="preview-note">{t("settings.guestNote")}</p>}

    {cropImageSrc && (
      <AvatarCropModal
        imageSrc={cropImageSrc}
        onCrop={async (croppedFile) => {
          setCropImageSrc(null);
          await props.onUploadAvatar(croppedFile);
        }}
        onCancel={() => setCropImageSrc(null)}
      />
    )}

    {showLogoutConfirm && (
      <LogoutConfirmDialog
        onConfirm={() => {
          setShowLogoutConfirm(false);
          props.onSignOut();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    )}
  </div>;
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return <div className="detail-row"><div><span>{label}</span><strong>{value}</strong></div><span className="detail-icon"><Icon name={icon} size={19} /></span></div>;
}

function AuthPage({ user, onAuthenticated }: { user?: User | null; onAuthenticated: () => void }) {
  const t = useCopy();
  useEffect(() => {
    if (user) onAuthenticated();
  }, [user, onAuthenticated]);
  const [mode, setMode] = useState<"signup" | "login">("login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [awaitingPhoneCode, setAwaitingPhoneCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [showOAuthHint, setShowOAuthHint] = useState(false);
  const getInitialLockout = () => {
    try {
      const until = Number(localStorage.getItem("unplastica_auth_lockout_until") || 0);
      const remaining = Math.ceil((until - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    } catch (_) {
      return 0;
    }
  };

  const getStoredAttempts = (): number[] => {
    try {
      const raw = localStorage.getItem("unplastica_auth_failed_attempts");
      if (!raw) return [];
      const now = Date.now();
      return (JSON.parse(raw) as number[]).filter((t) => now - t < 120000);
    } catch (_) {
      return [];
    }
  };

  const failedAttemptsRef = useRef<number[]>(getStoredAttempts());
  const [authLockoutSec, setAuthLockoutSec] = useState<number>(getInitialLockout);

  useEffect(() => {
    if (authLockoutSec <= 0) {
      try {
        localStorage.removeItem("unplastica_auth_lockout_until");
      } catch (_) {}
      return;
    }
    const timer = setInterval(() => {
      setAuthLockoutSec((s) => {
        if (s <= 1) {
          try {
            localStorage.removeItem("unplastica_auth_lockout_until");
          } catch (_) {}
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authLockoutSec]);

  const authPwCheck = validatePasswordComplexity(password);

  const resendConfirmation = async () => {
    if (!supabase || !identifier.includes("@")) return;
    setBusy(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({ type: "signup", email: identifier.trim() });
      if (resendErr) throw resendErr;
      setNotice(t("auth.confirmationResent"));
      setShowResend(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.resendFailed"));
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    const targetEmail = identifier.trim();
    if (!supabase || !targetEmail || !targetEmail.includes("@")) {
      setError(t("auth.enterEmailForReset"));
      return;
    }
    setBusy(true); setError("");
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/settings`
      });
      if (resetErr) throw resetErr;
      setNotice(t("auth.resetEmailSent", { email: targetEmail }));
      setShowOAuthHint(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.resetEmailFailed"));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (authLockoutSec > 0) {
      setError(t("auth.lockoutMessage", { sec: authLockoutSec }));
      return;
    }
    if (!supabase) { setError(t("auth.setupNeeded")); return; }
    setBusy(true); setError(""); setShowResend(false); setShowOAuthHint(false);
    try {
      if (awaitingPhoneCode) {
        const result = await supabase.auth.verifyOtp({ phone: identifier.trim().slice(0, 20), token: phoneCode.trim().slice(0, 6), type: "sms" });
        if (result.error) throw result.error;
        onAuthenticated();
      } else if (mode === "signup" && method === "email") {
        if (!authPwCheck.valid) {
          throw new Error("Password must be at least 8 characters long and include at least 1 alphabet letter, 1 number, and 1 special character (!@#$%^&* etc).");
        }
        const usernameCheck = validateCustomUsername(username);
        if (!usernameCheck.valid) {
          throw new Error(usernameCheck.error || "Please choose a valid username.");
        }
        const emailCheck = validateEmailAddress(identifier);
        if (!emailCheck.valid) {
          throw new Error(emailCheck.error || "Only Gmail and Outlook email addresses are supported.");
        }
        const cleanUsername = username.trim().toLowerCase().slice(0, 30);
        const result = await supabase.auth.signUp({
          email: identifier.trim().slice(0, 100),
          password: password.slice(0, 72),
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { display_name: name.trim().slice(0, 50), username: cleanUsername }
          }
        });
        if (result.error) throw result.error;
        if (result.data.session) {
          onAuthenticated();
          return;
        }
        setNotice(t("auth.checkEmailVerification") || "Account created! Please check your email inbox to verify your account before logging in.");
        setMode("login");
      } else if (mode === "signup") {
        const check = validatePasswordComplexity(password);
        if (!check.valid) {
          throw new Error("Password must be at least 8 characters long and include at least 1 alphabet letter, 1 number, and 1 special character (!@#$%^&* etc).");
        }
        const usernameCheck = validateCustomUsername(username);
        if (!usernameCheck.valid) {
          throw new Error(usernameCheck.error || "Please choose a valid username.");
        }
        const result = await supabase.auth.signUp({
          phone: normalizePhone(identifier).slice(0, 20),
          password: password.slice(0, 72),
          options: { data: { display_name: name.trim().slice(0, 50), username: username.trim().toLowerCase().slice(0, 30) } }
        });
        if (result.error) throw result.error;
        setIdentifier(normalizePhone(identifier));
        setAwaitingPhoneCode(true);
        setNotice(t("auth.phoneSent"));
      } else {
        let authError: Error | null = null;
        if (identifier.includes("@")) {
          const result = await supabase.auth.signInWithPassword({ email: identifier.trim().slice(0, 100), password: password.slice(0, 72) });
          if (result.error) authError = result.error;
        } else if (/^\+?[\d\s()-]+$/.test(identifier.trim())) {
          const result = await supabase.auth.signInWithPassword({ phone: normalizePhone(identifier).slice(0, 20), password: password.slice(0, 72) });
          if (result.error) authError = result.error;
        } else {
          const result = await supabase.functions.invoke("sign-in", { body: { identifier: identifier.trim().toLowerCase().slice(0, 30), password: password.slice(0, 72) } });
          if (result.error) {
            let detail = "";
            try {
              const body = await (result.error as any).context?.json?.();
              if (body?.error) detail = body.error;
            } catch {}
            authError = new Error(detail || result.error.message || t("auth.invalidUsernameOrPassword"));
          } else {
            const session = result.data as { access_token?: string; refresh_token?: string };
            if (!session?.access_token || !session.refresh_token) {
              authError = new Error(t("auth.invalidUsernameOrPassword"));
            } else {
              const saved = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
              if (saved.error) authError = saved.error;
            }
          }
        }

        if (authError) {
          const now = Date.now();
          failedAttemptsRef.current = failedAttemptsRef.current.filter((t) => now - t < 120000);
          failedAttemptsRef.current.push(now);
          try {
            localStorage.setItem("unplastica_auth_failed_attempts", JSON.stringify(failedAttemptsRef.current));
          } catch (_) {}
          if (failedAttemptsRef.current.length >= 5) {
            setAuthLockoutSec(60);
            try {
              localStorage.setItem("unplastica_auth_lockout_until", (now + 60000).toString());
            } catch (_) {}
          }

          const msg = authError.message || "";
          if (msg.includes("Invalid login credentials") || msg.includes("invalid_grant") || msg.includes("Google") || msg.includes("Microsoft") || msg.includes("Azure")) {
            setShowOAuthHint(true);
            const isMs = identifier.toLowerCase().includes("@outlook.") || identifier.toLowerCase().includes("@hotmail.") || identifier.toLowerCase().includes("@live.") || msg.includes("Microsoft") || msg.includes("Azure");
            throw new Error(
              isMs
                ? "Invalid login credentials. If your account was registered with Microsoft click 'Continue with Microsoft' or use the link below to set a password."
                : "Invalid login credentials. If your account was registered with Google click 'Continue with Google' or use the link below to set a password."
            );
          }
          if (msg.includes("Email not confirmed")) {
            setShowResend(true);
            throw new Error(
              "Email has not been confirmed yet. Please check your email inbox or click below to resend confirmation."
            );
          }
          throw authError;
        }
        onAuthenticated();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    if (!supabase) { setError(t("auth.setupNeeded")); return; }
    setBusy(true); setError("");
    const returnTo = sessionStorage.getItem("unplastica-return-to") || "settings";
    sessionStorage.setItem("unplastica-return-to", returnTo);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/settings`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (oauthError) { setError(t("auth.oauthError")); setBusy(false); }
  };
  const microsoft = async () => {
    if (!supabase) { setError(t("auth.setupNeeded")); return; }
    setBusy(true); setError("");
    const returnTo = sessionStorage.getItem("unplastica-return-to") || "settings";
    sessionStorage.setItem("unplastica-return-to", returnTo);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "email openid profile",
        redirectTo: `${window.location.origin}/settings`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (oauthError) {
      if (oauthError.message.includes("provider is not enabled") || oauthError.message.includes("azure")) {
        setError(t("auth.microsoftAzureNotice"));
      } else {
        setError(oauthError.message || t("auth.oauthError"));
      }
      setBusy(false);
    }
  };
  return <div className="content auth-page"><section className="dialog auth-dialog auth-page-card">
    <BrandLogo scrolled /><h2 id="auth-title">{mode === "signup" ? t("auth.signupTitle") : t("auth.loginTitle")}</h2>
    <p>{t("auth.subtitle")}</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "8px 0" }}>
      <button className="google-button" style={{ margin: 0 }} type="button" onClick={() => void google()} disabled={busy}><GoogleMark />{t("auth.google")}</button>
      <button className="microsoft-button" style={{ margin: 0 }} type="button" onClick={() => void microsoft()} disabled={busy}><MicrosoftMark />{t("auth.microsoft")}</button>
    </div>
    <div className="auth-divider"><span>{t("auth.or")}</span></div>
    {mode === "signup" && <div className="segmented auth-method"><button className={method === "email" ? "active" : ""} onClick={() => { setMethod("email"); setIdentifier(""); setNotice(""); setAwaitingPhoneCode(false); }}>{t("auth.emailMode")}</button><button className={method === "phone" ? "active" : ""} onClick={() => { setMethod("phone"); setIdentifier(""); setNotice(""); setAwaitingPhoneCode(false); }}>{t("auth.phoneMode")}</button></div>}
    <form onSubmit={(event) => void submit(event)}>
      {mode === "signup" && (
        <>
          <label>
            {t("auth.name")}
            <input
              autoComplete="name"
              placeholder=""
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 50))}
              required
            />
          </label>
          <label>
            {t("auth.username")}
            <input
              autoComplete="username"
              placeholder=""
              value={username}
              onChange={(event) => {
                const val = event.target.value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 30);
                setUsername(val);
                if (usernameTouched && val.length > 0) {
                  const check = validateCustomUsername(val);
                  if (!check.valid) {
                    setUsernameError(check.error || t("auth.usernameRuleError"));
                  } else if (val.length < 3) {
                    setUsernameError(t("auth.usernameRuleError"));
                  } else {
                    setUsernameError("");
                  }
                } else {
                  setUsernameError("");
                }
              }}
              onBlur={() => {
                setUsernameTouched(true);
                if (username.length > 0) {
                  const check = validateCustomUsername(username);
                  if (!check.valid) {
                    setUsernameError(check.error || t("auth.usernameRuleError"));
                  } else if (username.length < 3) {
                    setUsernameError(t("auth.usernameRuleError"));
                  } else {
                    setUsernameError("");
                  }
                } else {
                  setUsernameError("");
                }
              }}
              minLength={3}
              maxLength={30}
              required
            />
            {usernameError && <p className="form-error" role="alert" style={{ marginTop: 4 }}>{usernameError}</p>}
          </label>
        </>
      )}
      {awaitingPhoneCode ? (
        <label>
          {t("auth.code")}
          <input inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={6} value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.slice(0, 6))} required />
        </label>
      ) : (
        <label>
          {mode === "login" ? t("auth.identifier") : method === "phone" ? t("auth.phone") : t("auth.email")}
          <input
            type={mode === "signup" && method === "email" ? "email" : "text"}
            inputMode={mode === "signup" && method === "phone" ? "tel" : "text"}
            autoComplete={mode === "signup" ? (method === "email" ? "email" : "tel") : "username"}
            maxLength={100}
            placeholder={
              mode === "signup" && method === "phone"
                ? "+60 12 345 6789"
                : ""
            }
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value.slice(0, 100))}
            required
          />
        </label>
      )}
      {!awaitingPhoneCode && (
        <label>
          {t("auth.password")}
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder=""
            value={password}
            onChange={(event) => setPassword(event.target.value.slice(0, 72))}
            minLength={8}
            maxLength={72}
            required
          />
          {mode === "signup" && (
            <div className="password-criteria-list">
              <div className={"password-criterion " + (authPwCheck.hasLength ? "met" : "")}>
                <span className="criterion-circle" aria-hidden="true">
                  {authPwCheck.hasLength && (
                    <svg className="criterion-tick" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5l3 3 6-6" />
                    </svg>
                  )}
                </span>
                <span>{t("criteria.length72")}</span>
              </div>
              <div className={"password-criterion " + (authPwCheck.hasLetterAndNumberAndSpecial ? "met" : "")}>
                <span className="criterion-circle" aria-hidden="true">
                  {authPwCheck.hasLetterAndNumberAndSpecial && (
                    <svg className="criterion-tick" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5l3 3 6-6" />
                    </svg>
                  )}
                </span>
                <span>{t("criteria.complexity")}</span>
              </div>
            </div>
          )}
        </label>
      )}
      {mode === "login" && !awaitingPhoneCode && (
        <button
          type="button"
          className="text-button"
          style={{ textDecoration: "underline", fontSize: "12px", textAlign: "right", margin: "2px 0 8px", cursor: "pointer" }}
          onClick={() => void sendPasswordReset()}
        >
          {t("auth.forgotPasswordPrompt")}
        </button>
      )}
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {showOAuthHint && (
        <div className="auth-oauth-guidance">
          {identifier.toLowerCase().includes("@outlook.") || identifier.toLowerCase().includes("@hotmail.") || identifier.toLowerCase().includes("@live.") ? (
            <>
              <p><strong>{t("auth.oauthNoticePrefix")}</strong> {t("auth.oauthMicrosoftNotice")}</p>
              <button type="button" className="microsoft-button" style={{ margin: "2px 0" }} onClick={() => void microsoft()} disabled={busy}>
                <MicrosoftMark /> {t("auth.microsoft")}
              </button>
            </>
          ) : (
            <>
              <p><strong>{t("auth.oauthNoticePrefix")}</strong> {t("auth.oauthGoogleNotice")}</p>
              <button type="button" className="google-button" style={{ margin: "2px 0" }} onClick={() => void google()} disabled={busy}>
                <GoogleMark /> {t("auth.google")}
              </button>
            </>
          )}
          <button type="button" className="text-button" style={{ textDecoration: "underline", fontSize: "12px", textAlign: "left", cursor: "pointer" }} onClick={() => void sendPasswordReset()}>
            {t("auth.sendPasswordSetupLink")}
          </button>
        </div>
      )}
      {showResend && <button type="button" className="text-button" style={{ textDecoration: "underline", marginBottom: "10px", width: "100%", textAlign: "center" }} onClick={() => void resendConfirmation()}>{t("auth.resendConfirmation")}</button>}
      <button className="primary-button" disabled={busy}>{busy ? t("common.wait") : awaitingPhoneCode ? t("auth.verify") : mode === "signup" ? t("auth.signup") : t("auth.login")}</button>
    </form>
    {!awaitingPhoneCode && (
      <button
        type="button"
        className="text-button auth-mode-link"
        onClick={() => {
          setMode(mode === "signup" ? "login" : "signup");
          setError("");
          setNotice("");
        }}
      >
        {mode === "signup" ? (
          <>
            <span className="auth-mode-prefix">{t("auth.hasAccountPrefix")}</span>{" "}
            <strong className="auth-highlight auth-highlight-login">{t("auth.hasAccountAction")}</strong>
          </>
        ) : (
          <>
            <span className="auth-mode-prefix">{t("auth.newAccountPrefix")}</span>{" "}
            <strong className="auth-highlight auth-highlight-signup">{t("auth.newAccountAction")}</strong>
          </>
        )}
      </button>
    )}
  </section></div>;
}

function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z"/><path fill="#34A853" d="M24 44c5.4 0 10-1.8 13.4-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H6v5.2A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.7V15H6a20 20 0 0 0 0 18.1l6.8-5.2Z"/><path fill="#EA4335" d="M24 12c2.9 0 5.5 1 7.5 3l5.8-5.8C33.9 5.8 29.4 4 24 4A20 20 0 0 0 6 15l6.8 5.2C14.4 15.5 18.8 12 24 12Z"/></svg>;
}

function MicrosoftMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function LoginRequiredDialog({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const t = useCopy();
  return <Modal onClose={onClose} labelledBy="login-required-title"><div className="dialog login-required-dialog">
    <button className="dialog-close" onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button>
    <BrandLogo scrolled />
    <h2 id="login-required-title">{t("gate.title")}</h2><p>{t("gate.body")}</p>
    <button className="primary-button" onClick={onLogin}>{t("gate.login")}</button>
    <button className="text-button" onClick={onClose}>{t("gate.cancel")}</button>
  </div></Modal>;
}

type ModelDetection = {
  label: string;
  confidence: number;
  verified: boolean;
  message: string;
};

const CLASSES = [
  "beeswax_food_wraps",
  "box_cutlery",
  "bulk_pantry_refill",
  "greenery_furniture",
  "handicraft_projects",
  "other",
  "recycle_bags",
  "self_bottle_refill",
];

let sharedCanvas: HTMLCanvasElement | null = null;
function getSharedCanvas(): HTMLCanvasElement {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
    sharedCanvas.width = 224;
    sharedCanvas.height = 224;
  }
  return sharedCanvas;
}

let ortSessionPromise: Promise<any> | null = null;
function getOrtSession(ort: any): Promise<any> {
  if (!ortSessionPromise) {
    try {
      if (ort.env?.wasm) {
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.proxy = false;
      }
    } catch (_) {}
    ortSessionPromise = ort.InferenceSession.create(`/model/model.onnx?v=${APP_BUILD_VERSION}`, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }).catch((err: any) => {
      ortSessionPromise = null;
      throw err;
    });
  }
  return ortSessionPromise!;
}

export const ACTIVE_HABIT_SPECS: Record<string, { name: string; short: string }> = {
  self_bottle_refill: { name: "Refill Your Bottle", short: "Bottle" },
  box_cutlery: { name: "Bring Your Own Cutlery & Box", short: "Cutlery & Box" },
  recycle_bags: { name: "Reusable & Canvas Bags", short: "Reusable Bag" },
  greenery_furniture: { name: "Greenery & Upcycled Furniture", short: "Plant/Upcycle" },
  handicraft_projects: { name: "Plastic Upcycling & Handicrafts", short: "Handicrafts" },
};

let u2NetSessionPromise: Promise<any> | null = null;
function getU2NetSession(ort: any): Promise<any> | null {
  if (!u2NetSessionPromise) {
    u2NetSessionPromise = ort.InferenceSession.create(`/model/u2netp.onnx?v=${APP_BUILD_VERSION}`, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }).catch(() => null);
  }
  return u2NetSessionPromise;
}

export function warmUpAiModel() {
  try {
    const ort = (window as unknown as { ort?: any }).ort;
    if (ort) {
      if (!ortSessionPromise) {
        getOrtSession(ort).then(async (session) => {
          try {
            const dummy = new ort.Tensor("float32", new Float32Array(3 * 224 * 224), [1, 3, 224, 224]);
            await session.run({ input: dummy });
            console.log("AI Classifier Model active & preloaded in WASM memory.");
          } catch {}
        }).catch(() => {});
      }
      if (!u2NetSessionPromise) {
        getU2NetSession(ort)?.then(async (u2) => {
          if (u2) {
            try {
              const dummyU2 = new ort.Tensor("float32", new Float32Array(3 * 320 * 320), [1, 3, 320, 320]);
              await u2.run({ "input.1": dummyU2 });
              console.log("Background Extraction Engine (U2-NetP) active & preloaded in WASM memory.");
            } catch {}
          }
        }).catch(() => {});
      }
    }
  } catch {}
}

interface ImageQualityAnalysis {
  width: number;
  height: number;
  sharpness: number;
  isLowRes: boolean;
  isLowSharpness: boolean;
  needsEnhancement: boolean;
}

function detectImageQuality(img: HTMLImageElement): ImageQualityAnalysis {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const isLowRes = width < 480 || height < 480;

  const sampleW = Math.min(160, width);
  const sampleH = Math.min(160, height);
  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { width, height, sharpness: 100, isLowRes, isLowSharpness: false, needsEnhancement: isLowRes };
  }

  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
  const gray = new Float32Array(sampleW * sampleH);
  for (let i = 0; i < sampleW * sampleH; i++) {
    gray[i] = 0.299 * imgData[i * 4] + 0.587 * imgData[i * 4 + 1] + 0.114 * imgData[i * 4 + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < sampleH - 1; y++) {
    for (let x = 1; x < sampleW - 1; x++) {
      const idx = y * sampleW + x;
      const lap = 4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - sampleW] - gray[idx + sampleW];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  const mean = sum / Math.max(1, count);
  const variance = (sumSq / Math.max(1, count)) - (mean * mean);
  const isLowSharpness = variance < 55;

  return {
    width,
    height,
    sharpness: Math.round(variance),
    isLowRes,
    isLowSharpness,
    needsEnhancement: isLowRes || isLowSharpness,
  };
}

function enhanceImage(img: HTMLImageElement, quality: ImageQualityAnalysis): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scale = quality.isLowRes
    ? Math.max(1.5, Math.min(2.5, 720 / Math.max(quality.width, quality.height)))
    : 1;

  const targetW = Math.round(quality.width * scale);
  const targetH = Math.round(quality.height * scale);
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    canvas.width = quality.width;
    canvas.height = quality.height;
    canvas.getContext("2d")?.drawImage(img, 0, 0);
    return canvas;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  if (quality.isLowSharpness) {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);
    for (let y = 1; y < targetH - 1; y++) {
      for (let x = 1; x < targetW - 1; x++) {
        const i = (y * targetW + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = copy[i + c];
          const top = copy[((y - 1) * targetW + x) * 4 + c];
          const btm = copy[((y + 1) * targetW + x) * 4 + c];
          const lft = copy[(y * targetW + (x - 1)) * 4 + c];
          const rgt = copy[(y * targetW + (x + 1)) * 4 + c];
          const v = 3 * center - 0.5 * (top + btm + lft + rgt);
          data[i + c] = Math.max(0, Math.min(255, v));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return canvas;
}

async function extractMainCharacter(
  sourceCanvas: HTMLCanvasElement,
  ort: any
): Promise<HTMLCanvasElement> {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  try {
    const u2Session = await getU2NetSession(ort);
    if (u2Session) {
      const inputCanvas = document.createElement("canvas");
      inputCanvas.width = 320;
      inputCanvas.height = 320;
      const inCtx = inputCanvas.getContext("2d");
      if (inCtx) {
        inCtx.drawImage(sourceCanvas, 0, 0, 320, 320);
        const imgData = inCtx.getImageData(0, 0, 320, 320).data;
        const floatData = new Float32Array(3 * 320 * 320);
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];
        for (let i = 0; i < 320 * 320; i++) {
          floatData[i] = ((imgData[i * 4] / 255.0) - mean[0]) / std[0];
          floatData[320 * 320 + i] = ((imgData[i * 4 + 1] / 255.0) - mean[1]) / std[1];
          floatData[2 * 320 * 320 + i] = ((imgData[i * 4 + 2] / 255.0) - mean[2]) / std[2];
        }

        const tensor = new ort.Tensor("float32", floatData, [1, 3, 320, 320]);
        const results = await u2Session.run({ "input.1": tensor });
        const maskData = results[Object.keys(results)[0]].data as Float32Array;

        let minX = 320, minY = 320, maxX = 0, maxY = 0;
        let count = 0;
        for (let y = 0; y < 320; y++) {
          for (let x = 0; x < 320; x++) {
            const val = maskData[y * 320 + x];
            if (val > 0.35) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              count++;
            }
          }
        }

        if (count > 150 && maxX > minX && maxY > minY) {
          const cropX1 = Math.max(0, Math.round((minX / 320) * w));
          const cropY1 = Math.max(0, Math.round((minY / 320) * h));
          const cropW = Math.min(w - cropX1, Math.round(((maxX - minX) / 320) * w));
          const cropH = Math.min(h - cropY1, Math.round(((maxY - minY) / 320) * h));

          const cleanCanvas = document.createElement("canvas");
          cleanCanvas.width = 224;
          cleanCanvas.height = 224;
          const cleanCtx = cleanCanvas.getContext("2d");
          if (cleanCtx) {
            cleanCtx.fillStyle = "#ffffff";
            cleanCtx.fillRect(0, 0, 224, 224);
            const scale = Math.min(200 / cropW, 200 / cropH);
            const dw = Math.round(cropW * scale);
            const dh = Math.round(cropH * scale);
            const dx = Math.round((224 - dw) / 2);
            const dy = Math.round((224 - dh) / 2);
            cleanCtx.drawImage(sourceCanvas, cropX1, cropY1, cropW, cropH, dx, dy, dw, dh);
            return cleanCanvas;
          }
        }
      }
    }
  } catch (_) {}

  // Adaptive Center-Framing Fallback
  const outCanvas = document.createElement("canvas");
  outCanvas.width = 224;
  outCanvas.height = 224;
  const oCtx = outCanvas.getContext("2d");
  if (!oCtx) return sourceCanvas;
  const minDim = Math.min(w, h);
  const cx = Math.max(0, (w - minDim) / 2);
  const cy = Math.max(0, (h - minDim) / 2);
  oCtx.fillStyle = "#ffffff";
  oCtx.fillRect(0, 0, 224, 224);
  oCtx.drawImage(sourceCanvas, cx, cy, minDim, minDim, 0, 0, 224, 224);
  return outCanvas;
}

async function inferHabit(
  source: CanvasImageSource,
  targetHabit: string
): Promise<ModelDetection> {

  const ort = (window as unknown as { ort?: any }).ort;
  if (!ort) {
    return { label: "other", confidence: 0, verified: false, message: "Preparing AI engine…" };
  }

  const canvas = getSharedCanvas();
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { label: "other", confidence: 0, verified: false, message: "Canvas unavailable" };
  }

  ctx.drawImage(source, 0, 0, 224, 224);
  const imgData = ctx.getImageData(0, 0, 224, 224).data;
  const floatData = new Float32Array(3 * 224 * 224);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  for (let i = 0; i < 224 * 224; i++) {
    const r = imgData[i * 4] / 255.0;
    const g = imgData[i * 4 + 1] / 255.0;
    const b = imgData[i * 4 + 2] / 255.0;
    floatData[i] = (r - mean[0]) / std[0];
    floatData[224 * 224 + i] = (g - mean[1]) / std[1];
    floatData[2 * 224 * 224 + i] = (b - mean[2]) / std[2];
  }

  const session = await getOrtSession(ort);
  const tensor = new ort.Tensor("float32", floatData, [1, 3, 224, 224]);
  let output: Float32Array;
  try {
    const results = await session.run({ input: tensor });
    output = new Float32Array(results.output.data as Float32Array);
    try { results.output?.dispose?.(); } catch (_) {}
  } finally {
    try { tensor.dispose?.(); } catch (_) {}
  }

  let maxVal = -Infinity;
  for (let i = 0; i < output.length; i++) if (output[i] > maxVal) maxVal = output[i];
  let sumExp = 0;
  const exps = new Float32Array(output.length);
  for (let i = 0; i < output.length; i++) {
    exps[i] = Math.exp(output[i] - maxVal);
    sumExp += exps[i];
  }

  let bestIdx = 0;
  let bestProb = 0;
  for (let i = 0; i < output.length; i++) {
    const p = exps[i] / sumExp;
    if (p > bestProb) {
      bestProb = p;
      bestIdx = i;
    }
  }

  const detectedLabel = CLASSES[bestIdx] || "other";
  const targetIdx = CLASSES.indexOf(targetHabit);
  const targetProb = targetIdx >= 0 ? exps[targetIdx] / sumExp : 0;
  const otherIdx = CLASSES.indexOf("other");
  const otherProb = otherIdx >= 0 ? exps[otherIdx] / sumExp : 0;

  // Verification gate: strictly matches target habit and meets the unified 0.85 threshold
  const isHabitTarget = Boolean(targetHabit && targetHabit !== "other");
  const verified = Boolean(
    isHabitTarget && detectedLabel === targetHabit && targetProb >= ML_SCORE_THRESHOLD_DEFAULT
  );

  const confidence = detectedLabel === targetHabit ? targetProb : Math.max(targetProb, bestProb);

  const isAligned = Boolean(confidence >= 0.25 || otherProb < 0.85);
  let message = "Photo not recognized. Please align your item and retake.";
  if (isAligned) {
    message = verified ? "Verified" : "Not verified";
  }

  return {
    label: detectedLabel,
    confidence,
    verified,
    message,
  };
}

async function runModelDetection(blob: Blob, targetHabit: string): Promise<ModelDetection> {
  try {
    if (blob.size > 10 * 1024 * 1024) {
      return {
        label: "other",
        confidence: 0,
        verified: false,
        message: "Image file is too large (maximum 10MB).",
      };
    }
    const img = new Image();
    const url = URL.createObjectURL(blob);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    URL.revokeObjectURL(url);

    if (img.width * img.height > 25_000_000 || img.width > 6000 || img.height > 6000) {
      return {
        label: "other",
        confidence: 0,
        verified: false,
        message: "Image resolution is too high. Please take a standard photo.",
      };
    }

    // Step 1: Detect sharpness and resolution
    const quality = detectImageQuality(img);

    // Step 2: Increase resolution & enhance sharpness if lower than expected
    const enhancedCanvas = enhanceImage(img, quality);

    // Step 3: Remove background to extract main character
    const ort = (window as unknown as { ort?: any }).ort;
    const extractedCanvas = await extractMainCharacter(enhancedCanvas, ort);

    // Step 4: Send to AI engine for verification & result specification
    return await inferHabit(extractedCanvas, targetHabit);
  } catch (err) {
    console.warn("Client model detection:", err);
    return {
      label: "other",
      confidence: 0,
      verified: false,
      message: "Photo not recognized. Please align your item and retake.",
    };
  }
}

function CameraDialog({ habitCode, onClose, onComplete }: { habitCode: HabitCode | null; onClose: () => void; onComplete: (message: string) => void }) {
  const t = useCopy();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const photoUrlRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectionIdRef = useRef(0);
  const submissionTimesRef = useRef<number[]>([]);
  const [lockoutSec, setLockoutSec] = useState(0);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detection, setDetection] = useState<ModelDetection | null>(null);
  const [detecting, setDetecting] = useState(false);

  const habit = HABITS.find((item) => item.code === habitCode);

  useEffect(() => {
    warmUpAiModel();
  }, []);

  useEffect(() => {
    if (lockoutSec <= 0) return;
    const timer = setInterval(() => setLockoutSec((s) => (s > 1 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [lockoutSec]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error();
        const active = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!alive) { active.getTracks().forEach((track) => track.stop()); return; }
        stream.current = active;
        setCameraReady(true);
        if (video.current) {
          video.current.srcObject = active;
          video.current.play().catch(() => {});
        }
      } catch { if (alive) setError(t("camera.allow")); }
    })();
    return () => {
      alive = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  const setSelectedPhoto = (blob: Blob) => {
    const now = Date.now();
    submissionTimesRef.current = submissionTimesRef.current.filter((t) => now - t < 60000);
    if (submissionTimesRef.current.length >= 5) {
      setLockoutSec(45);
      return;
    }
    submissionTimesRef.current.push(now);

    const currentId = ++detectionIdRef.current;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    setPhoto(blob);
    const nextUrl = URL.createObjectURL(blob);
    photoUrlRef.current = nextUrl;
    setPhotoUrl(nextUrl);
    setDetecting(true);
    setDetection(null);
    void runModelDetection(blob, habitCode || "").then((res) => {
      if (detectionIdRef.current !== currentId) return;
      setDetection(res);
      setDetecting(false);
    });
  };

  const handleRetake = () => {
    detectionIdRef.current++;
    setPhoto(null);
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = "";
    setPhotoUrl("");
    setDetection(null);
    setDetecting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (video.current && stream.current) {
      if (video.current.srcObject !== stream.current) {
        video.current.srcObject = stream.current;
      }
      video.current.play().catch(() => {});
    }
  };

  const capture = async () => {
    if (!video.current || lockoutSec > 0) return;
    const element = video.current;
    const width = element.videoWidth || 640;
    const height = element.videoHeight || 480;
    const factor = Math.min(1, 1600 / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * factor);
    canvas.height = Math.round(height * factor);
    canvas.getContext("2d")?.drawImage(element, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (blob) setSelectedPhoto(blob);
  };

  const onFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (lockoutSec > 0) return;
    const file = event.target.files?.[0];
    if (file) setSelectedPhoto(file);
  };

  const submit = async () => {
    if (!photo || !habitCode || !consent || busy || detecting || !detection?.verified || lockoutSec > 0) return;
    if (!supabase) { onComplete(t("camera.noBackend")); return; }
    setBusy(true);
    try {
      const created = await supabase.functions.invoke("create-proof-upload", { body: { habit_code: habitCode, content_type: photo.type, size_bytes: photo.size } });
      if (created.error) {
        const context = (created.error as { context?: Response }).context;
        const details = context ? await context.clone().json().catch(() => null) : null;
        if (details?.code === "daily_limit_reached" || details?.error?.includes("Daily limit")) {
          onComplete(t("earn.dailyLimitReachedToast"));
          return;
        }
        throw created.error;
      }
      const storage = await supabase.storage.from("proof-media").uploadToSignedUrl(created.data.path, created.data.token, photo);
      if (storage.error) throw storage.error;
      const result = await supabase.functions.invoke("verify-scan", { body: { submission_id: created.data.submission_id } });
      if (result.error) {
        const context = (result.error as { context?: Response }).context;
        const details = context ? await context.clone().json().catch(() => null) : null;
        if (details?.code === "model_unavailable") {
          onComplete(t("camera.savedNoModel"));
          return;
        }
        if (details?.code === "daily_limit_reached" || details?.error?.includes("Daily limit")) {
          onComplete(t("earn.dailyLimitReachedToast"));
          return;
        }
        throw result.error;
      }
      if (result.data?.status === "rejected") {
        onComplete(result.data?.error || t("camera.failed"));
        return;
      }
      if (result.data?.status === "approved") {
        const pts = habit?.points ?? result.data?.points ?? 10;
        void sendVerificationSuccessNotification(habit ? t("habit." + habit.code) : "Habit", pts, created.data?.submission_id, getLanguage());
      }
      onComplete(result.data?.status === "approved" ? t("camera.success", { points: habit?.points ?? result.data.points }) : t("camera.failed"));
    } catch { onComplete(t("camera.failed")); }
    finally { setBusy(false); }
  };

  return <Modal onClose={onClose} labelledBy="camera-dialog"><div className="dialog camera-dialog">
    <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
    <div className={"camera-preview " + (photoUrl ? "has-photo" : "")}>
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        style={{ display: photoUrl ? "none" : "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
      {photoUrl && (
        <img
          src={photoUrl}
          alt={t("camera.alt")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {!photoUrl && error && <span>{error}</span>}

      {!photoUrl && cameraReady && (
        <div className="scanner-hud">
          <div className="scanner-reticle">
            <div className="scanner-bracket tl" />
            <div className="scanner-bracket tr" />
            <div className="scanner-bracket bl" />
            <div className="scanner-bracket br" />
          </div>
        </div>
      )}
    </div>

    {lockoutSec > 0 && (
      <div className="ai-detection-pill flagged" style={{ background: "rgba(220, 38, 38, 0.12)", color: "#dc2626", border: "1px solid rgba(220, 38, 38, 0.3)" }}>
        {t("camera.rateLimit", { lockoutSec })}
      </div>
    )}

    {detecting && <div className="ai-detection-pill detecting">{t("camera.checkingPhoto")}</div>}
    {detection && (
      <div className={"ai-detection-pill " + (detection.verified ? "verified" : "flagged")}>
        {detection.message === "Verified"
          ? t("camera.verified")
          : detection.message === "Not verified"
          ? t("camera.notVerified")
          : t("camera.notRecognized")}
      </div>
    )}

    <div className="camera-controls">
      {photoUrl ? (
        <button
          className="secondary-button"
          onClick={handleRetake}
        >
          {t("camera.retake")}
        </button>
      ) : (
        <>
          <button className="primary-button" disabled={!cameraReady || lockoutSec > 0} onClick={() => void capture()}>
            <Icon name="camera" /> {t("camera.capture")}
          </button>
          <button className="secondary-button" disabled={lockoutSec > 0} onClick={() => fileInputRef.current?.click()}>
            <Icon name="camera" /> {t("camera.uploadPhoto")}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style={{ display: "none" }} onChange={onFileSelect} />
        </>
      )}
    </div>
    <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t("camera.consent")}</span></label>
    <button
      className="primary-button submit-proof"
      disabled={!photo || !consent || busy || detecting || !detection?.verified || lockoutSec > 0}
      onClick={() => void submit()}
    >
      {busy ? t("camera.checking") : t("camera.submit")}
    </button>
  </div></Modal>;
}

function SampleDialog({ onClose }: { onClose: () => void }) {
  const t = useCopy();
  return <Modal onClose={onClose} labelledBy="sample-title"><div className="dialog sample-dialog">
    <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
    <span className="approved-chip"><Icon name="check" size={16} /> {t("sample.approved")}</span>
    <h2 id="sample-title">{t("sample.submission")}</h2><h3>{t("sample.title")}</h3>
    <p>{t("sample.description")}</p>
    <div className="score-card"><span>{t("sample.score")}</span><strong>94/100</strong><span>{t("sample.rating")}</span><b>A+</b></div>
  </div></Modal>;
}

function HabitInfoDialog({ code, onClose }: { code: HabitCode; onClose: () => void }) {
  const t = useCopy();
  const habit = HABITS.find((item) => item.code === code);
  if (!habit) return null;
  return <Modal onClose={onClose} labelledBy="habit-info-title"><div className="dialog habit-info-dialog">
    <button className="dialog-close" onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button><img src={habitImages[code]} alt="" />
    <h2 id="habit-info-title">{t("habit." + code)}</h2><p>{t("habitDescription." + code)}</p><strong>+{habit.points} Greenbits</strong>
  </div></Modal>;
}

function UsernamePromptDialog({
  initialUsername,
  onSave,
  onDismiss,
}: {
  initialUsername: string;
  initialName?: string;
  onSave: (username: string, name: string) => Promise<void>;
  onDismiss: () => void;
}) {
  const t = useCopy();
  const [username, setUsername] = useState(initialUsername.startsWith("user_") || /^user\d+/i.test(initialUsername) ? "" : initialUsername);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    const check = validateCustomUsername(clean);
    if (!check.valid) {
      setError(check.error || "Please enter a valid username.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(clean, clean);
      onDismiss();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save username";
      setError(msg.includes("unique") || msg.includes("profiles_username") ? "This username is already taken. Please choose another." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onDismiss} labelledBy="username-prompt-title">
      <div className="dialog auth-dialog" style={{ maxWidth: 440 }}>
        <button className="dialog-close" onClick={onDismiss} aria-label="Close"><Icon name="close" /></button>
        <BrandLogo scrolled />
        <h2 id="username-prompt-title">{t("auth.usernamePromptTitle")}</h2>
        <p>{t("auth.usernamePromptBody")}</p>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <label>{t("settings.usernameUpper")}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 30))}
              placeholder={initialUsername || "e.g. warrior"}
              minLength={2}
              maxLength={30}
              autoFocus
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            <button className="primary-button" disabled={busy}>
              {busy ? t("settings.saving") : t("auth.saveUsername")}
            </button>
            <button type="button" className="secondary-button" onClick={onDismiss} disabled={busy}>
              {t("auth.keepUsername", { username: `@${initialUsername}` })}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, labelledBy }: { children: ReactNode; onClose: () => void; labelledBy: string }) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    document.body.classList.add("modal-open");
    return () => { document.removeEventListener("keydown", handle); document.body.classList.remove("modal-open"); };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div>
  </div>;
}

function InstallPrompt({ prompt, environment, onInstall }: { prompt: InstallPromptEvent | null; environment: InstallEnvironment; onInstall: () => Promise<void> }) {
  const t = useCopy();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (environment.standalone) setVisible(false);
    else if (environment.insideApp || environment.iosSafari || prompt) setVisible(true);
  }, [environment, prompt]);
  if (!visible || environment.standalone) return null;
  return <aside className="install-prompt" aria-live="polite">
    {environment.insideApp ? <><strong>{t("install.openBrowser")}</strong><span>{t("install.browserHelp")}</span></> :
      environment.iosSafari ? <><strong>{t("install.title")}</strong><span>{t("install.iosHelp")}</span></> :
        <><strong>{t("install.keep")}</strong><span>{t("install.help")}</span>{prompt && <button onClick={async () => { await onInstall(); setVisible(false); }}>{t("install.button")}</button>}</>}
    <button className="install-close" aria-label={t("common.dismiss")} onClick={() => setVisible(false)}><Icon name="close" size={18} /></button>
  </aside>;
}

function UpdateNotice() {
  const t = useCopy();
  const [updating, setUpdating] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string | null>(() => {
    const pendingVer = localStorage.getItem("unplastica_update_available");
    if (!pendingVer) return null;
    const installed = localStorage.getItem("unplastica_app_version");
    if (installed && compareVersions(installed, pendingVer) >= 0) {
      localStorage.removeItem("unplastica_update_available");
      return null;
    }
    if (isNewerVersion(pendingVer, APP_BUILD_VERSION)) {
      return pendingVer;
    }
    localStorage.removeItem("unplastica_update_available");
    return null;
  });

  const performClearCacheAndUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    const targetVer = availableVersion || APP_BUILD_VERSION;
    localStorage.removeItem("unplastica_update_available");
    localStorage.setItem("unplastica_acknowledged_update_ver", targetVer);
    localStorage.setItem("unplastica_app_version", targetVer);
    setAvailableVersion(null);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
      }
    } catch (e) {
      console.error(e);
    }
    window.location.href = window.location.pathname + "?_ts=" + Date.now();
  };

  useEffect(() => {
    let pollTimer: number | undefined;
    let cleanupListeners: (() => void) | undefined;

    const sendSystemUpdateNotification = async (newVer: string) => {
      try {
        if (!isNotificationsEnabled()) return;
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        const updateKey = "unplastica_update_notified_" + newVer;
        if (localStorage.getItem(updateKey) === "true") return;
        localStorage.setItem(updateKey, "true");

        const title = "Unplastica Update Available";
        const options: any = {
          body: `Version ${newVer} is ready! Tap to update and clear cache.`,
          icon: `/icons/icon-192.png?v=${newVer}`,
          badge: `/icons/icon-192.png?v=${newVer}`,
          tag: `unplastica-update-${newVer}`,
          renotify: false,
          data: { url: "/settings" }
        };

        // Phone / Mobile PWA (Android / iOS) & PC ServiceWorker showNotification
        if ("serviceWorker" in navigator) {
          try {
            const regPromise = navigator.serviceWorker.ready;
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
            const reg = await Promise.race([regPromise, timeoutPromise]);
            if (reg && typeof reg.showNotification === "function") {
              await reg.showNotification(title, options);
              return;
            }
          } catch (_) {}
        }

        // Desktop/PC Window fallback
        try {
          const notification = new Notification(title, options);
          notification.onclick = () => {
            window.focus();
            window.location.href = "/settings";
          };
        } catch (_) {}
      } catch (_) {}
    };

    const notifyUpdate = (newVer: string) => {
      if (!isNewerVersion(newVer, APP_BUILD_VERSION)) {
        localStorage.removeItem("unplastica_update_available");
        setAvailableVersion(null);
        window.dispatchEvent(new CustomEvent("unplastica-update-detected", { detail: { version: APP_BUILD_VERSION, upToDate: true } }));
        return;
      }
      setAvailableVersion(newVer);
      localStorage.setItem("unplastica_update_available", newVer);
      window.dispatchEvent(new CustomEvent("unplastica-update-detected", { detail: { version: newVer } }));

      // Strictly notify ONCE per version!
      const updateKey = "unplastica_update_notified_" + newVer;
      if (localStorage.getItem(updateKey) === "true") {
        return;
      }

      if (isNotificationsEnabled()) {
        void sendSystemUpdateNotification(newVer);
      }
    };

    const checkRemoteVersion = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetch(`/version.json?_t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const remoteVer = data?.version;
          if (remoteVer && isNewerVersion(remoteVer, APP_BUILD_VERSION)) {
            notifyUpdate(remoteVer);
          } else {
            // Already up-to-date! Dismiss update banners and reset pending state
            localStorage.removeItem("unplastica_update_available");
            setAvailableVersion(null);
            window.dispatchEvent(new CustomEvent("unplastica-update-detected", { detail: { version: APP_BUILD_VERSION, upToDate: true } }));
          }
        }
      } catch (_) {}
    };

    if ("serviceWorker" in navigator) {
      let refreshing = false;
      const onControllerChange = () => {
        if (refreshing) return;
        refreshing = true;
        setUpdating(true);
        window.location.href = window.location.pathname + "?_ts=" + Date.now();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

      void import("virtual:pwa-register").then(({ registerSW }) => {
        registerSW({
          immediate: true,
          onNeedRefresh() {
            void checkRemoteVersion();
          },
          onRegisteredSW(_swUrl, registration) {
            if (!registration) return;

            if (registration.waiting) {
              void checkRemoteVersion();
              return;
            }

            let lastCheck = 0;
            const checkForUpdates = () => {
              const now = Date.now();
              if (now - lastCheck < 15_000 || !navigator.onLine) return;
              lastCheck = now;
              registration.update().catch(() => {});
              void checkRemoteVersion();
            };

            checkForUpdates();
            pollTimer = window.setInterval(checkForUpdates, 30_000);

            const onVisibleOrFocus = () => {
              if (document.visibilityState === "visible") checkForUpdates();
            };
            const onOnline = () => checkForUpdates();

            document.addEventListener("visibilitychange", onVisibleOrFocus);
            window.addEventListener("focus", onVisibleOrFocus);
            window.addEventListener("pageshow", checkForUpdates);
            window.addEventListener("online", onOnline);

            registration.addEventListener("updatefound", () => {
              const installing = registration.installing;
              if (!installing) return;
              installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                  void checkRemoteVersion();
                }
              });
            });

            cleanupListeners = () => {
              navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
              document.removeEventListener("visibilitychange", onVisibleOrFocus);
              window.removeEventListener("focus", onVisibleOrFocus);
              window.removeEventListener("pageshow", checkForUpdates);
              window.removeEventListener("online", onOnline);
            };
          },
        });
      });
    } else {
      void checkRemoteVersion();
      pollTimer = window.setInterval(checkRemoteVersion, 30_000);
      const onVisible = () => {
        if (document.visibilityState === "visible") void checkRemoteVersion();
      };
      document.addEventListener("visibilitychange", onVisible);
      cleanupListeners = () => {
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    return () => {
      if (pollTimer) window.clearInterval(pollTimer);
      if (cleanupListeners) cleanupListeners();
    };
  }, []);

  if (updating) {
    return (
      <div className="app-update-banner is-updating" role="status">
        <span className="update-banner-spinner" aria-hidden="true" />
        <span>{t("update.notice")}</span>
      </div>
    );
  }

  if (availableVersion) {
    return (
      <div className="app-update-banner" role="alert">
        <div className="update-banner-content">
          <span className="update-banner-badge">{t("settings.newBadge")}</span>
          <span className="update-banner-text">
            {t("update.available")} <strong>v{availableVersion}</strong>
          </span>
        </div>
        <button
          type="button"
          className="update-banner-action"
          onClick={() => void performClearCacheAndUpdate()}
        >
          {t("update.clearCache")}
        </button>
      </div>
    );
  }

  return null;
}
