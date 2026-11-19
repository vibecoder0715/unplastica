import { type ReactNode, Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { HabitCode } from "@unplastica/shared";
import { getLanguage, translate, type Language } from "../lib/i18n";
import { isSupabaseConfigured, supabase, uploadProfileAvatar } from "../lib/supabase";
import { DottedSpinner } from "../shared/components/DottedSpinner";
import { BottomNav, Header } from "../shared/components/LayoutChrome";
import { InstallPrompt, UpdateNotice } from "../shared/components/UpdateNotice";
import { LanguageContext } from "../shared/context";
import {
  getStoredNotificationPreference,
  isNotificationsEnabled,
  sendCompetitionNotification,
  sendSystemNotification,
  sendVerificationSuccessNotification,
} from "../shared/notifications";
import {
  guestProfile,
  type InstallEnvironment,
  type InstallPromptEvent,
  type Page,
  type Profile,
  type Theme,
} from "../shared/types";
import {
  APP_BUILD_VERSION,
  compareVersions,
  detectInstallEnvironment,
  generateDefaultUsername,
  getTheme,
  isNewerVersion,
  pagePath,
  parseSemVer,
  readPage,
  validateCustomUsername,
  validateEmailAddress,
  validatePasswordComplexity,
  type PasswordCheck,
} from "../shared/validation";
import {
  HabitInfoDialog,
  LoginRequiredDialog,
  SampleDialog,
  UsernamePromptDialog,
} from "../shared/components/Dialogs";
import { ACTIVE_HABIT_SPECS, warmUpAiModel } from "../features/verification/serverInferenceClient";

// Route-based lazy loading & code splitting for pages and heavy interactive bundles
const HomePage = lazy(() => import("../features/home/HomePage"));
const EarnPage = lazy(() => import("../features/earn/EarnPage"));
const EventsPage = lazy(() => import("../features/events/EventsPage"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const AuthPage = lazy(() => import("../features/auth/AuthPage"));
const CameraDialog = lazy(() => import("../features/verification/CameraDialog"));
const GamePage = lazy(() =>
  import("../components/GamePage").then((m) => ({ default: m.GamePage })),
);
const GameLoadingOverlay = lazy(() =>
  import("../components/GameLoadingOverlay").then((m) => ({ default: m.GameLoadingOverlay })),
);
const MascotWidget = lazy(() =>
  import("../components/MascotWidget").then((m) => ({ default: m.MascotWidget })),
);
const MascotManualTour = lazy(() =>
  import("../components/MascotManualTour").then((m) => ({ default: m.MascotManualTour })),
);

export {
  ACTIVE_HABIT_SPECS,
  APP_BUILD_VERSION,
  compareVersions,
  generateDefaultUsername,
  getStoredNotificationPreference,
  isNewerVersion,
  isNotificationsEnabled,
  parseSemVer,
  sendCompetitionNotification,
  sendSystemNotification,
  sendVerificationSuccessNotification,
  validateCustomUsername,
  validateEmailAddress,
  validatePasswordComplexity,
  warmUpAiModel,
  type PasswordCheck,
};

export default function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 12);
  const [theme, setTheme] = useState<Theme>(getTheme);
  const [language, setLanguage] = useState<Language>(getLanguage);
  const [, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("unplastica-dev-user") === "true") {
      return { id: "dev-user-001", email: "dev@unplastica.com" } as User;
    }
    return null;
  });
  const userRef = useRef<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState(0);
  const balanceRef = useRef(0);
  const profileRef = useRef<Profile | null>(null);
  const saveGameTimerRef = useRef<number>(0);
  balanceRef.current = balance;
  profileRef.current = profile;
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const pendingPage = useRef<Page>("home");
  const [selectedHabit, setSelectedHabit] = useState<HabitCode | null>(null);
  const [infoHabit, setInfoHabit] = useState<HabitCode | null>(null);
  const [camera, setCamera] = useState(false);
  const [sample, setSample] = useState(false);
  const [eventSubpage, setEventSubpage] = useState<"challenge" | "done" | null>(null);
  const [toast, setToast] = useState<ReactNode>("");
  const [notifications, setNotifications] = useState<boolean>(getStoredNotificationPreference);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installEnvironment, setInstallEnvironment] = useState<InstallEnvironment>(detectInstallEnvironment);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [enteringGame, setEnteringGame] = useState(false);
  const [showManualTour, setShowManualTour] = useState(false);
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(language, key, values), [language]);
  userRef.current = user;

  useEffect(() => {
    const langCode = language === "中文" ? "zh-CN" : language === "Bahasa Melayu" ? "ms" : language === "தமிழ்" ? "ta" : "en";
    document.documentElement.lang = langCode;
    document.title = t("app.title");
  }, [language, t]);

  const [dailyUsage, setDailyUsage] = useState<Record<string, number>>({});
  const [boxCutleryLastVerified, setBoxCutleryLastVerified] = useState<number>(() => {
    const local = localStorage.getItem("unplastica_box_cutlery_last_verified");
    return local ? Number(local) : 0;
  });
  const boxCutleryCooldownMs = Math.max(0, 5 * 3600 * 1000 - (Date.now() - boxCutleryLastVerified));

  const notify = useCallback((message: ReactNode) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  }, []);
  const navigate = useCallback((next: Page) => {
    if ((next === "game" || next === "earn") && !userRef.current) {
      pendingPage.current = next;
      setShowLoginGate(true);
      return;
    }
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
    const localCustomAvatar = localStorage.getItem("unplastica_avatar_" + activeUser.id);

    setProfile({
      display_name: displayName,
      username: username,
      email: userEmail,
      phone: row?.phone || metadata?.phone || activeUser.phone || "",
      tagline: row?.tagline || metadata?.tagline || "Refusing plastic, one meal at a time.",
      avatar_path: avatarPath,
      avatar_url:
        signedAvatar?.signedUrl ??
        metadata?.custom_avatar_url ??
        localCustomAvatar ??
        metadata?.avatar_url ??
        metadata?.picture ??
        null,
      preferences: row?.preferences || {},
    });
    const ledgerBalance = Number(balanceResult.data?.balance ?? 0);
    const prefOffset = Number((row?.preferences as Record<string, unknown> | undefined)?.sanctuary_balance_offset ?? 0);
    const effectiveBalance = Math.max(0, ledgerBalance + (Number.isFinite(prefOffset) ? prefOffset : 0));
    balanceRef.current = effectiveBalance;
    setBalance(effectiveBalance);

    if (activeUser) {
      const isDefault = (/^user\d+/i.test(username) || isSystemDefault) && !localStorage.getItem("unplastica_username_prompted_" + activeUser.id);
      if (isDefault) {
        setShowUsernamePrompt(true);
      }
      const hasSeen = Boolean(row?.preferences?.has_seen_manual || localStorage.getItem("unplastica_manual_seen_" + activeUser.id));
      if (!hasSeen) {
        setShowManualTour(true);
      }
    }
  }, []);

  useEffect(() => {
    const pop = () => {
      const next = readPage();
      if ((next === "earn" || next === "game") && !userRef.current) {
        history.replaceState({}, "", "/");
        pendingPage.current = next;
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
          const isDev = typeof localStorage !== "undefined" && localStorage.getItem("unplastica-dev-user") === "true";
          if (!isDev) {
            setUser(null);
            await loadAccount(null);
            if (readPage() === "earn") {
              history.replaceState({}, "", "/");
              pendingPage.current = "earn";
              setPage("home");
              setShowLoginGate(true);
            }
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
    localStorage.setItem("theme", theme);
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
    if (savedLanguage === "Bahasa Melayu" || savedLanguage === "中文" || savedLanguage === "English" || savedLanguage === "தமிழ்") {
      setLanguage(savedLanguage);
    }
    if (profile.preferences?.theme) setTheme(profile.preferences.theme);
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("unplastica-language", language);
  }, [language]);
  useEffect(() => {
    let rafId = 0;
    const update = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const isScrolled = window.scrollY > 12;
        setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      cancelAnimationFrame(rafId);
    };
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
    if (ready && (page === "earn" || page === "game") && !user) {
      history.replaceState({}, "", "/");
      setPage("home");
      pendingPage.current = page;
      setShowLoginGate(true);
    }
  }, [ready, page, user]);

  const savePreference = useCallback(async (key: "theme" | "language" | "notifications" | "has_seen_manual", value: string | boolean) => {
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
            icon: "/icons/notification-logo-white.png",
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

  useEffect(() => {
    const handleStartManual = () => {
      setShowManualTour(true);
    };
    window.addEventListener("unplastica-start-manual", handleStartManual);
    return () => window.removeEventListener("unplastica-start-manual", handleStartManual);
  }, []);

  const handleCompleteManualTour = useCallback(async () => {
    setShowManualTour(false);
    localStorage.setItem("unplastica_manual_seen_v1", "true");
    if (user) {
      localStorage.setItem("unplastica_manual_seen_" + user.id, "true");
      void savePreference("has_seen_manual", true);
    }
  }, [user, savePreference]);

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
    if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp") { notify(t("profile.photoType")); return; }
    if (!user) { navigate("login"); return; }
    setAvatarBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Read failed")));
        reader.onerror = () => reject(new Error("Read failed"));
        reader.readAsDataURL(file);
      });

      // Immediately update local & optimistic avatar state so the user sees the cropped picture right away
      localStorage.setItem("unplastica_avatar_" + user.id, dataUrl);
      setProfile((curr) => (curr ? { ...curr, avatar_url: dataUrl } : curr));

      try {
        await uploadProfileAvatar(file);
        await loadAccount(user);
      } catch (edgeErr) {
        // Fallback: persist compressed avatar data URL to user_metadata if Edge Function / storage is unreachable
        console.warn("Edge avatar upload fallback to auth metadata:", edgeErr);
        await supabase?.auth.updateUser({
          data: {
            custom_avatar_url: dataUrl,
            avatar_url: dataUrl,
          },
        });
      }
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

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;
    const channel = client
      .channel(`greenbits-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "greenbit_ledger",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          const { data } = await client
            .from("greenbit_balances")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle();
          if (data && typeof data.balance === "number") {
            const prefOffset = Number(
              (profileRef.current?.preferences as Record<string, unknown> | undefined)?.sanctuary_balance_offset ?? 0,
            );
            const nextBal = Math.max(0, Number(data.balance) + (Number.isFinite(prefOffset) ? prefOffset : 0));
            balanceRef.current = nextBal;
            setBalance(nextBal);
          }
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [user]);

  const handleGameBalanceChange = useCallback(async (newBal: number) => {
    const cleanNew = Math.max(0, Math.round(newBal));
    const delta = cleanNew - balanceRef.current;
    balanceRef.current = cleanNew;
    setBalance(cleanNew);

    if (user && supabase && delta !== 0) {
      try {
        const idempotencyKey = `game_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const { data: serverBal, error } = await supabase.rpc("sync_sanctuary_balance", {
          p_delta: delta,
          p_reason: delta < 0 ? "Sanctuary store purchase" : "Sanctuary eco harvest",
          p_idempotency_key: idempotencyKey,
        });
        if (!error && typeof serverBal === "number") {
          const confirmed = Math.max(0, Number(serverBal));
          balanceRef.current = confirmed;
          setBalance(confirmed);
          const currentPrefs = (profileRef.current?.preferences ?? {}) as Record<string, unknown>;
          if (currentPrefs.sanctuary_balance_offset) {
            const nextPrefs = { ...currentPrefs, sanctuary_balance_offset: 0 };
            setProfile((curr) => (curr ? { ...curr, preferences: nextPrefs as Profile["preferences"] } : curr));
            await supabase.from("profiles").update({ preferences: nextPrefs }).eq("id", user.id);
          }
        } else if (error) {
          // Fallback: persist balance delta into profiles.preferences so user's earned/spent Greenbits persist in DB even before RPC migration is applied
          const currentPrefs = (profileRef.current?.preferences ?? {}) as Record<string, unknown>;
          const prevOffset = Number(currentPrefs.sanctuary_balance_offset ?? 0);
          const nextOffset = (Number.isFinite(prevOffset) ? prevOffset : 0) + delta;
          const nextPrefs = { ...currentPrefs, sanctuary_balance_offset: nextOffset };
          setProfile((curr) => (curr ? { ...curr, preferences: nextPrefs as Profile["preferences"] } : curr));
          await supabase.from("profiles").update({ preferences: nextPrefs }).eq("id", user.id);
        }
      } catch (err) {
        console.warn("Sanctuary real-time database sync:", err);
      }
    }
  }, [user]);

  const handleGameSaveStateChange = useCallback(
    (state: import("@game/game/types").SaveState) => {
      if (!user || !supabase) return;
      window.clearTimeout(saveGameTimerRef.current);
      saveGameTimerRef.current = window.setTimeout(async () => {
        try {
          const currentPrefs = (profileRef.current?.preferences ?? {}) as Record<string, unknown>;
          const compactSave = {
            version: state.version,
            harmonyXp: state.harmonyXp,
            ownedAssets: state.ownedAssets,
            foodInventory: state.foodInventory,
            placedAnimals: state.placedAnimals,
            placedPlants: state.placedPlants.filter((p) => !p.isDefaultScenery),
            discoveredEcoDex: state.discoveredEcoDex,
            discoveredFavoriteFoods: state.discoveredFavoriteFoods,
            lastSavedTimestampMs: state.lastSavedTimestampMs,
          };
          const nextPrefs = { ...currentPrefs, sanctuary_save: compactSave };
          setProfile((curr) => (curr ? { ...curr, preferences: nextPrefs as Profile["preferences"] } : curr));
          await supabase?.from("profiles").update({ preferences: nextPrefs }).eq("id", user.id);
        } catch (e) {
          console.warn("Sanctuary state cloud sync notice:", e);
        }
      }, 1500);
    },
    [user],
  );

  if (!ready) {
    return (
      <div className="loading-shell" role="status" aria-live="polite" aria-label="Loading Unplastica">
        <DottedSpinner size={52} />
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={language}>
    <div className="app-shell">
      {page !== "game" && (
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
      )}
      <Suspense
        fallback={
          <div className="loading-shell" role="status" aria-live="polite" aria-label="Loading section">
            <DottedSpinner size={52} />
          </div>
        }
      >
      <main className={"page page-" + page}>
        {page === "home" && (
          <HomePage
            onEnter={() => {
              if (guest) {
                requestLogin("game");
                return;
              }
              setEnteringGame(true);
            }}
          />
        )}
        {page === "game" && (
          <GamePage
            balance={balance}
            user={user}
            language={language}
            cloudSaveState={
              ((profile?.preferences as Record<string, unknown> | undefined)?.sanctuary_save as
                | Partial<import("@game/game/types").SaveState>
                | undefined) ?? null
            }
            onExit={() => navigate("home")}
            onBalanceChange={handleGameBalanceChange}
            onSaveStateChange={handleGameSaveStateChange}
          />
        )}
        {page === "earn" && <EarnPage
          selected={selectedHabit}
          dailyUsage={dailyUsage}
          boxCutleryCooldownMs={boxCutleryCooldownMs}
          onSelect={(code) => {
            if (guest) {
              requestLogin("earn");
              return;
            }
            setSelectedHabit(code);
          }}
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
          onShowManual={() => {
            setShowManualTour(true);
          }}
          notify={notify}
        />}
        {page === "login" && <AuthPage user={user} onAuthenticated={() => { const target = sessionStorage.getItem("unplastica-return-to") as Page | null; sessionStorage.removeItem("unplastica-return-to"); navigate(target && target !== "login" ? target : "settings"); }} />}
      </main>
      </Suspense>
      {page !== "login" && page !== "game" && <BottomNav page={page} onNavigate={(target) => target === "earn" ? requestLogin("earn") : navigate(target)} />}
      <Suspense fallback={null}>
      {enteringGame && (
        <GameLoadingOverlay
          language={language}
          onComplete={() => {
            setEnteringGame(false);
            navigate("game");
          }}
        />
      )}
      {/* Penyu Mascot: Shown on home, earn, and main events page, but hidden when modals or detail cards (infoHabit, eventSubpage, camera, sample) are active */}
      {(page === "home" || page === "earn" || (page === "events" && !eventSubpage)) &&
        !enteringGame &&
        !showManualTour &&
        !infoHabit &&
        !camera &&
        !sample &&
        !showLoginGate &&
        !showUsernamePrompt && (
          <MascotWidget language={language} />
        )}
      {showManualTour && !showUsernamePrompt && page !== "login" && (
        <MascotManualTour
          language={language}
          onNavigatePage={(p) => {
            if (p === "events") setEventSubpage(null);
            navigate(p === "profile" ? "settings" : p);
          }}
          onComplete={handleCompleteManualTour}
        />
      )}
      {page !== "login" && <InstallPrompt prompt={installPrompt} environment={installEnvironment} onInstall={installApp} />}
      <UpdateNotice />
      {toast && <div className="toast" role="status">{toast}</div>}
      {showLoginGate && <LoginRequiredDialog onClose={() => setShowLoginGate(false)} onLogin={startLogin} />}
      {camera && <CameraDialog
        habitCode={selectedHabit}
        onClose={() => setCamera(false)}
        onComplete={(message, verifiedSuccess) => {
          setCamera(false);
          notify(message);
          if (selectedHabit === "box_cutlery" && verifiedSuccess) {
            const now = Date.now();
            setBoxCutleryLastVerified(now);
            localStorage.setItem("unplastica_box_cutlery_last_verified", String(now));
          }
          if (user) void loadAccount(user);
        }}
      />}
      </Suspense>
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

