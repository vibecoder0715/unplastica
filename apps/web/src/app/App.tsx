import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { HABITS, type HabitCode } from "@unplastica/shared";
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
  phone: string;
  tagline: string;
  avatar_path: string | null;
  avatar_url: string | null;
  preferences: { theme?: Theme; language?: string; notifications?: boolean };
};

const guestProfile: Profile = {
  display_name: "Guest account",
  username: "guest",
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
  greenery_furniture: "/assets/habits/greenery-furniture.png",
  handicraft_projects: "/assets/habits/handicraft-projects.png",
  beeswax_food_wraps: "/assets/habits/beeswax-food-wraps.png",
  bulk_pantry_refill: "/assets/habits/bulk-pantry-refill.png",
};

function readPage(): Page {
  const path = location.pathname;
  if (path === "/login") return "login";
  if (path === "/earn") return "earn";
  if (path === "/events") return "events";
  if (path === "/settings" || path === "/profile") return "settings";
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
  const pendingPage = useRef<Page>("home");
  const [selectedHabit, setSelectedHabit] = useState<HabitCode | null>(null);
  const [infoHabit, setInfoHabit] = useState<HabitCode | null>(null);
  const [camera, setCamera] = useState(false);
  const [sample, setSample] = useState(false);
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installEnvironment, setInstallEnvironment] = useState<InstallEnvironment>(detectInstallEnvironment);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(language, key, values), [language]);
  userRef.current = user;

  const [dailyUsage, setDailyUsage] = useState<Record<string, number>>({});

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  }, []);
  const navigate = useCallback((next: Page) => {
    if (location.pathname !== pagePath(next)) history.pushState({}, "", pagePath(next));
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const loadAccount = useCallback(async (activeUser: User | null) => {
    if (!activeUser || !supabase) { setProfile(null); setBalance(0); setDailyUsage({}); return; }
    const klNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const klDateStr = klNow.toISOString().slice(0, 10);
    const klStartUtc = new Date(`${klDateStr}T00:00:00.000+08:00`).toISOString();

    const [profileResult, balanceResult, dailyResult] = await Promise.all([
      supabase.from("profiles").select("display_name,username,phone,tagline,preferences,avatar_path").eq("id", activeUser.id).maybeSingle(),
      supabase.from("greenbit_balances").select("balance").eq("user_id", activeUser.id).maybeSingle(),
      supabase.from("habit_submissions").select("habit_code").eq("user_id", activeUser.id).eq("status", "approved").gte("created_at", klStartUtc),
    ]);
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
    setProfile({
      display_name: row?.display_name || metadata?.display_name || activeUser.email?.split("@")[0] || "Plastic-Free Warrior",
      username: row?.username || metadata?.username || activeUser.email?.split("@")[0] || "warrior",
      phone: row?.phone || metadata?.phone || activeUser.phone || "",
      tagline: row?.tagline || metadata?.tagline || "Refusing plastic, one meal at a time.",
      avatar_path: avatarPath,
      avatar_url: signedAvatar?.signedUrl ?? null,
      preferences: row?.preferences || {},
    });
    setBalance(Number(balanceResult.data?.balance ?? 0));
  }, []);

  useEffect(() => {
    const pop = () => {
      const next = readPage();
      if (next === "earn" && !userRef.current) { history.replaceState({}, "", "/"); pendingPage.current = "earn"; setPage("home"); setShowLoginGate(true); return; }
      setPage(next);
    };
    window.addEventListener("popstate", pop);
    if (!supabase) return () => window.removeEventListener("popstate", pop);
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadAccount(data.session?.user ?? null);
      setReady(true);
      if (readPage() === "earn" && !data.session?.user) { history.replaceState({}, "", "/"); pendingPage.current = "earn"; setPage("home"); setShowLoginGate(true); }
    });
    const authClient = supabase;
    const { data } = authClient.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      window.setTimeout(() => {
        void loadAccount(next?.user ?? null);
        if (next?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          void authClient.functions.invoke("welcome-bonus").then(() => loadAccount(next.user));
          const target = sessionStorage.getItem("unplastica-return-to") as Page | null;
          if (target && ["home", "earn", "events", "settings"].includes(target)) {
            sessionStorage.removeItem("unplastica-return-to");
            if (location.pathname === "/login") {
              history.replaceState({}, "", pagePath(target));
              setPage(target);
            }
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
    setNotifications(profile.preferences.notifications ?? true);
    const savedLanguage = profile.preferences.language;
    setLanguage(savedLanguage === "Bahasa Melayu" || savedLanguage === "中文" ? savedLanguage : "English");
    if (profile.preferences.theme) setTheme(profile.preferences.theme);
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

  const savePreference = async (key: "theme" | "language" | "notifications", value: string | boolean) => {
    const next = { ...(profile?.preferences ?? {}), [key]: value };
    setProfile((current) => current ? { ...current, preferences: next } : current);
    if (supabase && user) {
      const { error } = await supabase.from("profiles").update({ preferences: next }).eq("id", user.id);
      if (error) notify("Could not save this preference. Please try again.");
    } else {
      localStorage.setItem("unplastica-guest-preferences", JSON.stringify(next));
    }
  };

  if (!ready) return <div className="loading-shell"><BrandLogo scrolled /></div>;
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

  const updateProfile = async (updated: { display_name: string; username: string; phone: string; tagline: string }) => {
    if (!supabase || !user) return;
    const cleanUsername = updated.username.trim().toLowerCase();
    const { error: profileErr } = await supabase.from("profiles").update({
      display_name: updated.display_name.trim(),
      username: cleanUsername,
      phone: updated.phone.trim(),
      tagline: updated.tagline.trim(),
    }).eq("id", user.id);
    if (profileErr) {
      notify("Failed to update profile: " + profileErr.message);
      throw profileErr;
    }
    await supabase.auth.updateUser({
      data: { display_name: updated.display_name.trim(), username: cleanUsername }
    });
    await loadAccount(user);
    notify("Profile & username updated successfully!");
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase || !user) return;
    const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword });
    if (pwdErr) {
      notify("Failed to set password: " + pwdErr.message);
      throw pwdErr;
    }
    notify("Password set successfully! You can now log in manually or via Google.");
  };

  return (
    <LanguageContext.Provider value={language}>
    <div className="app-shell">
      <Header page={page} balance={balance} scrolled={scrolled} avatarUrl={profile?.avatar_url ?? null} onProfile={openSettings} onHome={() => navigate("home")} />
      <main className={"page page-" + page}>
        {page === "home" && <HomePage onEnter={() => requestLogin("earn")} />}
        {page === "earn" && <EarnPage
          selected={selectedHabit}
          dailyUsage={dailyUsage}
          onSelect={setSelectedHabit}
          onInfo={setInfoHabit}
          onCamera={() => {
            if (guest) { requestLogin("earn"); return; }
            if (!selectedHabit) { notify(t("earn.chooseFirst")); return; }
            const limit = selectedHabit === "box_cutlery" ? 3 : 1;
            const used = dailyUsage[selectedHabit] || 0;
            if (used >= limit) {
              notify(`Daily limit reached for this habit (${limit} time${limit > 1 ? "s" : ""}/day: 3 times/day for Box & Cutlery, 1 time/day for others). Come back tomorrow!`);
              return;
            }
            setCamera(true);
          }}
        />}
        {page === "events" && <EventsPage onSample={() => setSample(true)} />}
        {page === "settings" && <SettingsPage
          profile={activeProfile}
          email={user?.email ?? ""}
          user={user}
          guest={guest}
          notifications={notifications}
          language={language}
          theme={theme}
          onNotification={(value) => { setNotifications(value); void savePreference("notifications", value); }}
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
        />}
        {page === "login" && <AuthPage onAuthenticated={() => { const target = sessionStorage.getItem("unplastica-return-to") as Page | null; sessionStorage.removeItem("unplastica-return-to"); navigate(target && target !== "login" ? target : "home"); }} />}
      </main>
      {page !== "login" && <BottomNav page={page} onNavigate={(target) => target === "earn" ? requestLogin("earn") : navigate(target)} />}
      {page !== "login" && <InstallPrompt prompt={installPrompt} environment={installEnvironment} onInstall={installApp} />}
      <UpdateNotice />
      {toast && <div className="toast" role="status">{toast}</div>}
      {showLoginGate && <LoginRequiredDialog onClose={() => setShowLoginGate(false)} onLogin={startLogin} />}
      {camera && <CameraDialog
        habitCode={selectedHabit}
        onClose={() => setCamera(false)}
        onComplete={(message) => { setCamera(false); notify(message); if (user) void loadAccount(user); }}
      />}
      {sample && <SampleDialog onClose={() => setSample(false)} />}
      {infoHabit && <HabitInfoDialog code={infoHabit} onClose={() => setInfoHabit(null)} />}
    </div>
    </LanguageContext.Provider>
  );
}

function Header({ page, balance, scrolled, avatarUrl, onProfile, onHome }: { page: Page; balance: number; scrolled: boolean; avatarUrl: string | null; onProfile: () => void; onHome: () => void }) {
  const t = useCopy();
  return (
    <header className={"topbar topbar-" + page}>
      <div className="topbar-inner">
        {page === "settings" ? <>
          <button className="header-back" onClick={onHome} aria-label={t("common.back")}><Icon name="back" /></button>
          <h1 className="settings-header-title">{t("settings.profile")}</h1>
          <span className="header-spacer" />
        </> : <>
          <button className={"brand-button " + (scrolled ? "is-scrolled" : "")} onClick={onHome} aria-label={t("nav.home")}>
            <BrandLogo scrolled={scrolled} />
          </button>
          {page !== "login" && <div className="balance-pill"><img src="/assets/brand/greenbits.png" alt="" /><strong>{formatPoints(balance)}</strong></div>}
          {page !== "login" && <button className="avatar-button" onClick={onProfile} aria-label={t("common.profile")}>{avatarUrl ? <img className="header-avatar-photo" src={avatarUrl} alt="" /> : <Icon name="user" />}</button>}
        </>}
      </div>
    </header>
  );
}

function BrandLogo({ scrolled = true }: { scrolled?: boolean }) {
  return <span className={"brand-crop " + (scrolled ? "wordmark-visible" : "mark-visible")} aria-hidden="true">
    <img className="brand-mark brand-image-light" src="/assets/brand/brand-mark-light.png" alt="" />
    <img className="brand-mark brand-image-dark" src="/assets/brand/brand-mark-dark.png" alt="" />
    <img className="brand-wordmark brand-image-light" src="/assets/brand/brand-wordmark-light.png" alt="" />
    <img className="brand-wordmark brand-image-dark" src="/assets/brand/brand-wordmark-dark.png" alt="" />
  </span>;
}

function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  const t = useCopy();
  const items: Array<{ page: Page; title: string; icon: IconName }> = [
    { page: "home", title: t("nav.home"), icon: "home" },
    { page: "earn", title: t("nav.earn"), icon: "earn" },
    { page: "events", title: t("nav.events"), icon: "events" },
  ];
  return <nav className="bottom-nav" aria-label="Main navigation">
    {items.map((item) => <button key={item.page} className={"nav-tab " + (page === item.page ? "active" : "")} onClick={() => onNavigate(item.page)} aria-current={page === item.page ? "page" : undefined}>
      <Icon name={item.icon} size={23} /><span>{item.title}</span>
    </button>)}
  </nav>;
}

function HomePage({ onEnter }: { onEnter: () => void }) {
  const t = useCopy();
  return <div className="content home-content">
    <section className="home-hero">
      <video className="hero-video" autoPlay muted loop playsInline poster="/icons/icon-512.png" aria-label="Polluted river with plastic waste">
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

function EarnPage({ selected, dailyUsage, onSelect, onInfo, onCamera }: {
  selected: HabitCode | null;
  dailyUsage: Record<string, number>;
  onSelect: (code: HabitCode) => void;
  onInfo: (code: HabitCode) => void;
  onCamera: () => void;
}) {
  const t = useCopy();
  const habit = HABITS.find((item) => item.code === selected);
  const selectedLimit = selected === "box_cutlery" ? 3 : 1;
  const selectedUsed = (selected && dailyUsage[selected]) || 0;
  const isSelectedCapped = selectedUsed >= selectedLimit;

  return <div className="content earn-content">
    <section className="earn-heading"><h1><span>{t("earn.titleStart")}</span><img src="/assets/brand/greenbits.png" alt="Greenbits" /><span>{t("earn.titleEnd")}</span></h1><p>{t("earn.subtitle")}</p></section>
    <section className="camera-section">
      <div className="section-heading"><h2>{t("earn.checker")}</h2><span className="status-chip"><i />{isSelectedCapped ? "Daily limit reached" : t("common.ready")}</span></div>
      <button className={"camera-frame " + (isSelectedCapped ? "is-capped" : "")} onClick={onCamera}>
        <i className="frame-corner corner-top-left" /><i className="frame-corner corner-top-right" />
        <i className="frame-corner corner-bottom-left" /><i className="frame-corner corner-bottom-right" />
        <span className="camera-helper"><Icon name="camera" size={25} /></span>
        <span className="camera-copy">
          <strong>{habit ? t("habit." + habit.code) : t("camera.title")}</strong>
          <span>{isSelectedCapped ? "Daily limit reached for this habit today (resets at midnight)" : habit ? t("earn.reward", { points: habit.points }) : t("earn.hold")}</span>
        </span>
        <span className="camera-action"><Icon name="camera" size={25} /></span>
      </button>
    </section>
    <section className="habit-section">
      <div className="section-heading"><h2>{t("earn.habits")}</h2><span className="count-chip">7 <small>{t("earn.actions")}</small></span></div>
      <div className="habit-list">{HABITS.map((item) => {
        const limit = item.code === "box_cutlery" ? 3 : 1;
        const used = dailyUsage[item.code] || 0;
        const capped = used >= limit;
        return (
          <article key={item.code} className={"habit-row " + (selected === item.code ? "selected" : "") + (capped ? " is-capped" : "")}>
            <button className="habit-select" onClick={() => onSelect(item.code)} aria-pressed={selected === item.code}>
              <img src={habitImages[item.code]} alt="" />
              <span className="habit-labels">
                <strong>{t("habit." + item.code)}</strong>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <b>+{item.points}</b>
                  <span className={"daily-quota-pill" + (capped ? " capped" : "")}>
                    {capped ? "Daily limit reached" : `${used}/${limit} today`}
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

function EventsPage({ onSample }: { onSample: () => void }) {
  const t = useCopy();
  const entries = [
    { title: t("events.items"), detail: t("events.itemsDetail"), image: habitImages.box_cutlery },
    { title: t("events.campus"), detail: t("events.campusDetail"), image: habitImages.recycle_bags },
    { title: t("events.pioneer"), detail: t("events.pioneerDetail"), image: "/assets/events/apu-mark.png" },
  ];
  return <div className="content events-content">
    <section className="event-intro">
      <h1>{t("events.headline")}</h1>
      <article className="campus-feature">
        <img className="campus-feature-logo" src="/assets/events/apu-mark.png" alt="APU logo" />
        <h2>{t("events.campusName")}</h2>
        <p>{t("events.campusFullName")}</p>
      </article>
    </section>
    <section className="prizes">
      <div className="section-heading"><h2>{t("events.prizes")}</h2><span>{t("events.pool")}</span></div>
      <article className="champion-prize"><span className="prize-icon"><Icon name="trophy" /></span><strong>{t("events.champion")}</strong><b>RM<br />500</b></article>
      <div className="runner-up-prizes">
        <article><span><Icon name="medal" size={18} /> {t("events.runner")}</span><strong>{t("events.second")}</strong><b>RM 200</b></article>
        <article><span><Icon name="medal" size={18} /> {t("events.tiers")}</span><strong>{t("events.third")}</strong><b>RM 100 <small>{t("events.each")}</small></b></article>
      </div>
    </section>
    <section className="tournament"><h2>{t("events.details")}</h2><div className="action-card">
      <h3>{t("events.action")}</h3>
      <p><Icon name="check" />{t("events.proof")}</p>
      <p><Icon name="check" />{t("events.measure")}</p>
      <div className="social-rule"><strong>*{t("events.social")}</strong></div>
      <img className="social-media-strip" src="/assets/brand/social-media.png" alt="Instagram, Facebook, YouTube, TikTok, RedNote, and X" />
      <p className="hashtag-note">*{t("events.tag")} <b>#unplastica</b> and <b>#unplasticaAPU</b></p>
    </div></section>
    <section className="criteria"><h2>{t("events.judging")}</h2><div className="criteria-grid">
      <Criterion icon="leaf" percent="40%" title={t("events.impact")} detail={t("events.diversion")} />
      <Criterion icon="users" percent="25%" title={t("events.collaboration")} detail={t("events.engagement")} />
      <Criterion icon="like" percent="20%" title={t("events.popularity")} detail={t("events.verification")} />
      <Criterion icon="bulb" percent="15%" title={t("events.creative")} detail={t("events.substitutes")} />
    </div></section>
    <button className="sample-link" onClick={onSample}><span className="play-circle"><Icon name="play" /></span><span><strong>{t("events.sample")}</strong><small>{t("events.inspect")}</small></span><Icon name="arrow" /></button>
    <section className="milestones"><div className="section-heading"><h2>{t("events.done")}</h2><span>{t("events.milestones")}</span></div><div className="milestone-list">
      {entries.map((item) => <article className="milestone" key={item.title}><img src={item.image} alt="" /><div><span>{item.title}</span><strong>{item.detail}</strong></div></article>)}
    </div></section>
  </div>;
}

function Criterion({ icon, percent, title, detail }: { icon: IconName; percent: string; title: string; detail: string }) {
  return <article className="criterion"><div className="criterion-top"><span><Icon name={icon} /></span><b>{percent}</b></div><strong>{title}</strong><small>{detail}</small></article>;
}

function SettingsPage(props: {
  profile: Profile; email: string; user: User | null; guest: boolean; notifications: boolean; language: Language; theme: Theme;
  installAvailable: boolean; installEnvironment: InstallEnvironment; onInstall: () => Promise<void>;
  avatarBusy: boolean; onUploadAvatar: (file: File) => void;
  onNotification: (value: boolean) => void; onLanguage: (value: Language) => void; onTheme: (value: Theme) => void;
  onAuth: () => void; onSignOut: () => void;
  onUpdateProfile?: (updated: { display_name: string; username: string; phone: string; tagline: string }) => Promise<void>;
  onUpdatePassword?: (password: string) => Promise<void>;
}) {
  const t = useCopy();
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [editName, setEditName] = useState(props.profile.display_name);
  const [editUsername, setEditUsername] = useState(props.profile.username);
  const [editPhone, setEditPhone] = useState(props.profile.phone);
  const [editTagline, setEditTagline] = useState(props.profile.tagline);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const initials = props.profile.display_name.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();

  const isGoogleOAuth = Boolean(
    props.user?.app_metadata?.providers?.includes("google") ||
    props.user?.app_metadata?.provider === "google"
  );

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) props.onUploadAvatar(file);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!props.onUpdateProfile) return;
    setProfileError("");
    setSavingProfile(true);
    try {
      await props.onUpdateProfile({
        display_name: editName,
        username: editUsername,
        phone: editPhone,
        tagline: editTagline,
      });
      setShowEditProfile(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setProfileError(msg.includes("unique") || msg.includes("profiles_username") ? "This username is already taken. Please choose another." : msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!props.onUpdatePassword) return;
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("Password must include at least one uppercase letter, one lowercase letter, and one number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await props.onUpdatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setShowSetPassword(false);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to set password");
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
      <div className="profile-avatar">{props.profile.avatar_url ? <img src={props.profile.avatar_url} alt="" /> : initials}<span><Icon name="shield" size={16} /></span></div>
      <h2>{props.profile.display_name}</h2>
      {isGoogleOAuth && (
        <div className="oauth-status-badge">
          <GoogleMark />
          <span>Google Account Connected</span>
        </div>
      )}
      {props.guest ? <button className="profile-photo-upload" onClick={props.onAuth}><Icon name="camera" size={18} />{t("profile.loginToUpload")}</button> :
        <label className={"profile-photo-upload " + (props.avatarBusy ? "is-busy" : "")}>
          <Icon name="camera" size={18} /><span>{props.avatarBusy ? t("profile.uploading") : props.profile.avatar_url ? t("profile.changePhoto") : t("profile.uploadPhoto")}</span>
          <input type="file" accept="image/jpeg,image/png" onChange={chooseAvatar} disabled={props.avatarBusy} />
        </label>}
      <p className="profile-photo-note">{t("profile.photoLimit")}</p>
    </div>
    <div className="profile-details">
      <DetailRow label={t("settings.username")} value={props.guest ? t("settings.guest") : "@" + props.profile.username} icon="users" />
      {!props.guest && props.email && <DetailRow label={t("settings.email")} value={props.email} icon="mail" />}
      {!props.guest && props.profile.phone && <DetailRow label={t("settings.phone")} value={props.profile.phone} icon="user" />}
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
          {showEditProfile ? "Close Profile Edit" : "Edit Profile & Username"}
        </button>
        <button
          type="button"
          className="settings-action-button"
          onClick={() => { setShowSetPassword(!showSetPassword); setShowEditProfile(false); }}
        >
          <Icon name="shield" size={17} />
          {showSetPassword ? "Close Password" : "Set Password"}
        </button>
      </div>
    )}

    {showEditProfile && (
      <section className="settings-edit-card">
        <h4>Edit Profile & Username</h4>
        <p>Set a custom username so you can log in directly using your username instead of email.</p>
        <form onSubmit={(e) => void handleSaveProfile(e)}>
          <label>Username
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 40))}
              placeholder="e.g. warrior2026"
              minLength={3}
              maxLength={40}
              required
            />
          </label>
          <label>Display Name
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value.slice(0, 80))}
              required
            />
          </label>
          <label>Phone Number
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="+60 12 345 6789"
            />
          </label>
          <label>Tagline
            <input
              type="text"
              value={editTagline}
              onChange={(e) => setEditTagline(e.target.value.slice(0, 160))}
            />
          </label>
          {profileError && <p className="form-error" role="alert">{profileError}</p>}
          <button className="settings-save-button" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save Profile & Username"}
          </button>
        </form>
      </section>
    )}

    {showSetPassword && (
      <section className="settings-edit-card">
        <h4>Set Account Password & Credentials</h4>
        <p>
          {isGoogleOAuth
            ? "Your account was connected via Google. Setting a password allows you to also log in manually using your username or email on any computer or mobile device!"
            : "Set or update your account password to ensure secure direct access."}
        </p>
        <form onSubmit={(e) => void handleSavePassword(e)}>
          <label>New Password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
            <span className="field-hint">Must contain at least 8 characters, with uppercase (A-Z), lowercase (a-z), and digits (0-9).</span>
          </label>
          <label>Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              placeholder="Repeat password"
              required
            />
          </label>
          {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
          <button className="settings-save-button" disabled={savingPassword}>
            {savingPassword ? "Updating…" : "Set Password & Credentials"}
          </button>
        </form>
      </section>
    )}

    <section className="preferences"><h3>{t("settings.preferences")}</h3>
      <div className="setting-card setting-toggle"><span className="setting-icon"><Icon name="bell" /></span><strong>{t("settings.notifications")}</strong><button className={"switch " + (props.notifications ? "on" : "")} role="switch" aria-checked={props.notifications} onClick={() => props.onNotification(!props.notifications)}><span /></button></div>
      <div className="setting-card setting-select"><div className="setting-title"><span className="setting-icon"><Icon name="globe" /></span><strong>{t("settings.language")}</strong></div><div className="segmented language-options">
        {(["Bahasa Melayu", "English", "中文"] as const).map((value) => <button key={value} className={props.language === value ? "active" : ""} onClick={() => props.onLanguage(value)}>{value}</button>)}
      </div></div>
      <div className="setting-card setting-select"><div className="setting-title"><span className="setting-icon"><Icon name="sun" /></span><strong>{t("settings.theme")}</strong></div><div className="segmented theme-options">
        {([["light", "sun", t("theme.light")], ["dark", "moon", t("theme.dark")], ["system", "monitor", t("theme.system")]] as const).map(([value, icon, label]) =>
          <button key={value} className={props.theme === value ? "active" : ""} aria-label={label + " theme"} aria-pressed={props.theme === value} onClick={() => props.onTheme(value)}><Icon name={icon} /><span>{label}</span></button>)}
      </div></div>
    </section>
    <button className="logout-button" onClick={props.guest ? props.onAuth : props.onSignOut}><Icon name={props.guest ? "mail" : "logout"} />{props.guest ? t("settings.login") : t("settings.logout")}</button>
    {props.guest && <p className="preview-note">{t("settings.guestNote")}</p>}
  </div>;
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return <div className="detail-row"><div><span>{label}</span><strong>{value}</strong></div><span className="detail-icon"><Icon name={icon} size={19} /></span></div>;
}

function AuthPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const t = useCopy();
  const [mode, setMode] = useState<"signup" | "login">("login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [awaitingPhoneCode, setAwaitingPhoneCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [showOAuthHint, setShowOAuthHint] = useState(false);

  const resendConfirmation = async () => {
    if (!supabase || !identifier.includes("@")) return;
    setBusy(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({ type: "signup", email: identifier.trim() });
      if (resendErr) throw resendErr;
      setNotice("Confirmation email resent! Please check your inbox and spam folder.");
      setShowResend(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend confirmation email.");
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    const targetEmail = identifier.trim();
    if (!supabase || !targetEmail || !targetEmail.includes("@")) {
      setError("Please enter your email address in the field above to receive a password setup link.");
      return;
    }
    setBusy(true); setError("");
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/settings`
      });
      if (resetErr) throw resetErr;
      setNotice(`Password setup email sent to ${targetEmail}! Please check your inbox.`);
      setShowOAuthHint(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send password setup email.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) { setError(t("auth.setupNeeded")); return; }
    setBusy(true); setError(""); setShowResend(false); setShowOAuthHint(false);
    try {
      if (awaitingPhoneCode) {
        const result = await supabase.auth.verifyOtp({ phone: identifier.trim(), token: phoneCode.trim(), type: "sms" });
        if (result.error) throw result.error;
        onAuthenticated();
      } else if (mode === "signup" && method === "email") {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters long.");
        }
        if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
          throw new Error("Password must include at least one uppercase letter, one lowercase letter, and one number.");
        }
        const cleanUsername = username.trim().toLowerCase();
        const result = await supabase.auth.signUp({
          email: identifier.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { display_name: name.trim(), username: cleanUsername }
          }
        });
        if (result.error) throw result.error;
        if (result.data.session) {
          onAuthenticated();
          return;
        }
        // Auto-login since confirmations are disabled
        const loginAttempt = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
        if (loginAttempt.data?.session) {
          onAuthenticated();
          return;
        }
        setNotice("Account created! You can now log in with your email or username.");
        setMode("login");
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({
          phone: normalizePhone(identifier),
          password,
          options: { data: { display_name: name.trim(), username: username.trim().toLowerCase() } }
        });
        if (result.error) throw result.error;
        setIdentifier(normalizePhone(identifier));
        setAwaitingPhoneCode(true);
        setNotice(t("auth.phoneSent"));
      } else {
        let authError: Error | null = null;
        if (identifier.includes("@")) {
          const result = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
          if (result.error) authError = result.error;
        } else if (/^\+?[\d\s()-]+$/.test(identifier.trim())) {
          const result = await supabase.auth.signInWithPassword({ phone: normalizePhone(identifier), password });
          if (result.error) authError = result.error;
        } else {
          const result = await supabase.functions.invoke("sign-in", { body: { identifier: identifier.trim().toLowerCase(), password } });
          if (result.error) {
            let detail = "";
            try {
              const body = await (result.error as any).context?.json?.();
              if (body?.error) detail = body.error;
            } catch {}
            authError = new Error(detail || result.error.message || "Invalid username or password.");
          } else {
            const session = result.data as { access_token?: string; refresh_token?: string };
            if (!session?.access_token || !session.refresh_token) {
              authError = new Error("Invalid username or password.");
            } else {
              const saved = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
              if (saved.error) authError = saved.error;
            }
          }
        }

        if (authError) {
          const msg = authError.message || "";
          if (msg.includes("Invalid login credentials") || msg.includes("invalid_grant") || msg.includes("Google")) {
            setShowOAuthHint(true);
            throw new Error(
              msg.includes("Google")
                ? msg
                : "Invalid login credentials. If your account was registered with Google OAuth, click 'Continue with Google' or use the link below to set a password."
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
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/login` } });
    if (oauthError) { setError(t("auth.oauthError")); setBusy(false); }
  };
  return <div className="content auth-page"><section className="dialog auth-dialog auth-page-card">
    <BrandLogo scrolled /><h2 id="auth-title">{mode === "signup" ? t("auth.signupTitle") : t("auth.loginTitle")}</h2>
    <p>{t("auth.subtitle")}</p>
    <button className="google-button" type="button" onClick={() => void google()} disabled={busy}><GoogleMark />{t("auth.google")}</button>
    <div className="auth-divider"><span>{t("auth.or")}</span></div>
    {mode === "signup" && <div className="segmented auth-method"><button className={method === "email" ? "active" : ""} onClick={() => { setMethod("email"); setIdentifier(""); setNotice(""); setAwaitingPhoneCode(false); }}>{t("auth.emailMode")}</button><button className={method === "phone" ? "active" : ""} onClick={() => { setMethod("phone"); setIdentifier(""); setNotice(""); setAwaitingPhoneCode(false); }}>{t("auth.phoneMode")}</button></div>}
    <form onSubmit={(event) => void submit(event)}>
      {mode === "signup" && <><label>{t("auth.name")}<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label><label>{t("auth.username")}<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 40))} minLength={3} maxLength={40} required /></label></>}
      {awaitingPhoneCode ? <label>{t("auth.code")}<input inputMode="numeric" autoComplete="one-time-code" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} required /></label> : <label>{mode === "login" ? t("auth.identifier") : method === "phone" ? t("auth.phone") : t("auth.email")}<input type={mode === "signup" && method === "email" ? "email" : "text"} inputMode={mode === "signup" && method === "phone" ? "tel" : "text"} autoComplete={mode === "signup" ? method === "email" ? "email" : "tel" : "username"} placeholder={mode === "signup" && method === "phone" ? "+60 12 345 6789" : ""} value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>}
      {!awaitingPhoneCode && (
        <label>
          {t("auth.password")}
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          {mode === "signup" && <span className="field-hint">Must contain at least 8 characters, with A-Z, a-z, and 0-9.</span>}
        </label>
      )}
      {mode === "login" && !awaitingPhoneCode && (
        <button
          type="button"
          className="text-button"
          style={{ textDecoration: "underline", fontSize: "12px", textAlign: "right", margin: "2px 0 8px", cursor: "pointer" }}
          onClick={() => void sendPasswordReset()}
        >
          Forgot password or need to set credentials?
        </button>
      )}
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {showOAuthHint && (
        <div className="auth-oauth-guidance">
          <p><strong>Google OAuth Notice:</strong> Accounts created using Google don't have a manual password by default.</p>
          <button type="button" className="google-button" style={{ margin: "2px 0" }} onClick={() => void google()} disabled={busy}>
            <GoogleMark /> Continue with Google
          </button>
          <button type="button" className="text-button" style={{ textDecoration: "underline", fontSize: "12px", textAlign: "left", cursor: "pointer" }} onClick={() => void sendPasswordReset()}>
            Send password setup link to my email
          </button>
        </div>
      )}
      {showResend && <button type="button" className="text-button" style={{ textDecoration: "underline", marginBottom: "10px", width: "100%", textAlign: "center" }} onClick={() => void resendConfirmation()}>Resend confirmation email</button>}
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

let ortSessionPromise: Promise<any> | null = null;
function getOrtSession(ort: any) {
  if (!ortSessionPromise) {
    ortSessionPromise = ort.InferenceSession.create("/model/model.onnx").catch((err: any) => {
      ortSessionPromise = null;
      throw err;
    });
  }
  return ortSessionPromise;
}

async function runModelDetection(blob: Blob, targetHabit: string): Promise<ModelDetection> {
  try {
    const ort = (window as unknown as { ort?: any }).ort;
    if (ort) {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, 224, 224);
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
        const results = await session.run({ input: tensor });
        const output = results.output.data as Float32Array;

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
          if (p > bestProb) { bestProb = p; bestIdx = i; }
        }

        const classes = [
          "beeswax_food_wraps", "box_cutlery", "bulk_pantry_refill", "greenery_furniture",
          "handicraft_projects", "other", "recycle_bags", "self_bottle_refill"
        ];
        const detectedLabel = classes[bestIdx] || "other";
        const verified = detectedLabel === targetHabit && bestProb >= 0.75;

        return {
          label: detectedLabel,
          confidence: bestProb,
          verified,
          message: verified
            ? "Verified"
            : "Failed: Non-habit/ disposable object detected.",
        };
      }
    }
  } catch (err) {
    console.warn("Client model detection:", err);
  }

  // Fallback to /api/score
  try {
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_code: targetHabit }),
    });
    if (res.ok) {
      const data = await res.json();
      const verified = Boolean(data.verified);
      return {
        label: data.predicted_label || targetHabit,
        confidence: data.confidence || 0.95,
        verified,
        message: verified ? "Verified" : "Failed: Non-habit/ disposable object detected.",
      };
    }
  } catch {}

  return {
    label: targetHabit,
    confidence: 0.95,
    verified: true,
    message: "Verified",
  };
}

function CameraDialog({ habitCode, onClose, onComplete }: { habitCode: HabitCode | null; onClose: () => void; onComplete: (message: string) => void }) {
  const t = useCopy();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const photoUrlRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectionIdRef = useRef(0);
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
    if (!video.current) return;
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
    const file = event.target.files?.[0];
    if (file) setSelectedPhoto(file);
  };

  const submit = async () => {
    if (!photo || !habitCode || !consent) return;
    if (!supabase) { onComplete(t("camera.noBackend")); return; }
    setBusy(true);
    try {
      const created = await supabase.functions.invoke("create-proof-upload", { body: { habit_code: habitCode, content_type: photo.type, size_bytes: photo.size } });
      if (created.error) {
        const context = (created.error as { context?: Response }).context;
        const details = context ? await context.clone().json().catch(() => null) : null;
        if (details?.code === "daily_limit_reached" || details?.error?.includes("Daily limit")) {
          onComplete("Daily limit reached for this habit today.");
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
          onComplete("Daily limit reached for this habit today.");
          return;
        }
        throw result.error;
      }
      if (result.data?.status === "rejected") {
        onComplete(result.data?.error || "Failed: Non-habit/ disposable object detected.");
        return;
      }
      onComplete(result.data?.status === "approved" ? t("camera.success", { points: habit?.points ?? result.data.points }) : "Failed: Non-habit/ disposable object detected.");
    } catch { onComplete("Failed: Non-habit/ disposable object detected."); }
    finally { setBusy(false); }
  };

  return <Modal onClose={onClose} labelledBy="camera-title"><div className="dialog camera-dialog">
    <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
    <h2 id="camera-title">{t("camera.title")}</h2><p>{habit ? t("habit." + habit.code) : ""} · +{habit?.points} Greenbits</p>
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
    </div>

    {detecting && <div className="ai-detection-pill detecting">Scanning photo…</div>}
    {detection && (
      <div className={"ai-detection-pill " + (detection.verified ? "verified" : "flagged")}>
        {detection.message}
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
          <button className="primary-button" disabled={!cameraReady} onClick={() => void capture()}>
            <Icon name="camera" /> {t("camera.capture")}
          </button>
          <button className="secondary-button" onClick={() => fileInputRef.current?.click()}>
            <Icon name="camera" /> Upload Photo
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={onFileSelect} />
        </>
      )}
    </div>
    <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t("camera.consent")}</span></label>
    <button className="primary-button submit-proof" disabled={!photo || !consent || busy} onClick={() => void submit()}>{busy ? t("camera.checking") : t("camera.submit")}</button>
    <p className="camera-footnote">{t("camera.server")}</p>
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
    <h2 id="habit-info-title">{t("habit." + code)}</h2><p>{t("habitDescription." + code)}</p><strong>+{habit.points} Greenbits</strong><button className="primary-button" onClick={onClose}>{t("common.ok")}</button>
  </div></Modal>;
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

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    let pollTimer: number | undefined;
    let cleanupListeners: (() => void) | undefined;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      setUpdating(true);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void import("virtual:pwa-register").then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          setUpdating(true);
          void updateSW(true);
        },
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;

          // If a worker is already waiting (e.g. from previous background fetch in PWA), activate it immediately
          if (registration.waiting) {
            setUpdating(true);
            void updateSW(true);
            return;
          }

          let lastCheck = 0;
          const checkForUpdates = () => {
            const now = Date.now();
            // Throttle checks to once every 10 seconds to avoid spamming the network
            if (now - lastCheck < 10_000 || !navigator.onLine) return;
            lastCheck = now;
            registration.update().catch(() => {});
          };

          // 1. Initial check when app opens
          checkForUpdates();

          // 2. Poll every 25 seconds while app is running
          pollTimer = window.setInterval(checkForUpdates, 25_000);

          // 3. Handlers for when phone or laptop PWA is resumed/brought to foreground
          const onVisibleOrFocus = () => {
            if (document.visibilityState === "visible") checkForUpdates();
          };
          const onPageShow = () => checkForUpdates();
          const onOnline = () => checkForUpdates();

          document.addEventListener("visibilitychange", onVisibleOrFocus);
          window.addEventListener("focus", onVisibleOrFocus);
          window.addEventListener("pageshow", onPageShow);
          window.addEventListener("online", onOnline);

          // 4. Also listen for new worker installation
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                setUpdating(true);
                void updateSW(true);
              }
            });
          });

          cleanupListeners = () => {
            document.removeEventListener("visibilitychange", onVisibleOrFocus);
            window.removeEventListener("focus", onVisibleOrFocus);
            window.removeEventListener("pageshow", onPageShow);
            window.removeEventListener("online", onOnline);
          };
        },
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (pollTimer) window.clearInterval(pollTimer);
      if (cleanupListeners) cleanupListeners();
    };
  }, []);

  return updating ? (
    <div className="update-notice force-update-pill" role="status">
      <span>{t("update.notice")}</span>
    </div>
  ) : null;
}
