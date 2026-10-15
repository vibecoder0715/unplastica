import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { HABITS, type HabitCode } from "@unplastica/shared";
import { Icon, type IconName } from "../components/Icon";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { formatPoints } from "../lib/format";

type Page = "home" | "earn" | "events" | "settings";
type Theme = "light" | "dark" | "system";
type Profile = {
  display_name: string;
  username: string;
  phone: string;
  tagline: string;
  preferences: { theme?: Theme; language?: string; notifications?: boolean };
};

const demoProfile: Profile = {
  display_name: "Alex Tan",
  username: "ecowarrior",
  phone: "+60 12-345 6789",
  tagline: "Refusing plastic, one meal at a time.",
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

export default function App() {
  const [page, setPage] = useState<Page>(readPage);
  const [theme, setTheme] = useState<Theme>(getTheme);
  const [, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState(isSupabaseConfigured ? 0 : 1450);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [showAuth, setShowAuth] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitCode | null>(null);
  const [infoHabit, setInfoHabit] = useState<HabitCode | null>(null);
  const [camera, setCamera] = useState(false);
  const [sample, setSample] = useState(false);
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("English");

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
    if (!activeUser || !supabase) { setProfile(null); setBalance(isSupabaseConfigured ? 0 : 1450); return; }
    const [profileResult, balanceResult] = await Promise.all([
      supabase.from("profiles").select("display_name,username,phone,tagline,preferences").eq("id", activeUser.id).maybeSingle(),
      supabase.from("greenbit_balances").select("balance").eq("user_id", activeUser.id).maybeSingle(),
    ]);
    const row = profileResult.data;
    const metadata = activeUser.user_metadata;
    setProfile({
      display_name: row?.display_name || metadata?.display_name || activeUser.email?.split("@")[0] || "Plastic-Free Warrior",
      username: row?.username || metadata?.username || activeUser.email?.split("@")[0] || "warrior",
      phone: row?.phone || metadata?.phone || "",
      tagline: row?.tagline || metadata?.tagline || "Refusing plastic, one meal at a time.",
      preferences: row?.preferences || {},
    });
    setBalance(Number(balanceResult.data?.balance ?? 0));
  }, []);

  useEffect(() => {
    const pop = () => setPage(readPage());
    window.addEventListener("popstate", pop);
    if (!supabase) return () => window.removeEventListener("popstate", pop);
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadAccount(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      window.setTimeout(() => void loadAccount(next?.user ?? null), 0);
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
    setLanguage(profile.preferences.language ?? "English");
    if (profile.preferences.theme) setTheme(profile.preferences.theme);
  }, [profile]);

  const savePreference = async (key: "theme" | "language" | "notifications", value: string | boolean) => {
    const next = { ...(profile?.preferences ?? {}), [key]: value };
    setProfile((current) => current ? { ...current, preferences: next } : current);
    if (supabase && user) {
      const { error } = await supabase.from("profiles").update({ preferences: next }).eq("id", user.id);
      if (error) notify("Could not save this preference. Please try again.");
    } else {
      localStorage.setItem("unplastica-preview-preferences", JSON.stringify(next));
    }
  };

  if (!ready) return <div className="loading-shell"><img src="/assets/brand/unplastica-light.png" alt="Unplastica" /></div>;
  const activeProfile = profile ?? demoProfile;
  const preview = !isSupabaseConfigured || !user;
  const openSettings = () => navigate("settings");

  return (
    <div className="app-shell">
      <Header page={page} balance={balance} onProfile={openSettings} onHome={() => navigate("home")} />
      <main className={"page page-" + page}>
        {page === "home" && <HomePage onEnter={() => navigate("earn")} />}
        {page === "earn" && <EarnPage
          selected={selectedHabit}
          onSelect={setSelectedHabit}
          onInfo={setInfoHabit}
          onCamera={() => selectedHabit ? setCamera(true) : notify("Choose a habit below first.")}
        />}
        {page === "events" && <EventsPage onSample={() => setSample(true)} />}
        {page === "settings" && <SettingsPage
          profile={activeProfile}
          email={user?.email ?? "alex.tan@apu.edu.my"}
          preview={preview}
          notifications={notifications}
          language={language}
          theme={theme}
          onNotification={(value) => { setNotifications(value); void savePreference("notifications", value); }}
          onLanguage={(value) => { setLanguage(value); void savePreference("language", value); }}
          onTheme={(value) => { setTheme(value); void savePreference("theme", value); }}
          onAuth={() => setShowAuth(true)}
          onSignOut={async () => { await supabase?.auth.signOut(); navigate("home"); notify("You have been logged out."); }}
        />}
      </main>
      <BottomNav page={page} onNavigate={navigate} />
      <InstallPrompt />
      <UpdateNotice />
      {toast && <div className="toast" role="status">{toast}</div>}
      {showAuth && <AuthDialog onClose={() => setShowAuth(false)} onCreated={() => { setShowAuth(false); notify("Check your email to verify your account."); }} />}
      {camera && <CameraDialog
        habitCode={selectedHabit}
        preview={preview}
        onClose={() => setCamera(false)}
        onComplete={(message) => { setCamera(false); notify(message); if (user) void loadAccount(user); }}
      />}
      {sample && <SampleDialog onClose={() => setSample(false)} />}
      {infoHabit && <HabitInfoDialog code={infoHabit} onClose={() => setInfoHabit(null)} />}
    </div>
  );
}

function Header({ page, balance, onProfile, onHome }: { page: Page; balance: number; onProfile: () => void; onHome: () => void }) {
  return (
    <header className={"topbar topbar-" + page}>
      <div className="topbar-inner">
        {page === "settings" ? <>
          <button className="header-back" onClick={onHome} aria-label="Go back"><Icon name="back" /></button>
          <h1 className="settings-header-title">Profile</h1>
          <span className="header-spacer" />
        </> : <>
          <button className="brand-button" onClick={onHome} aria-label="Unplastica Home">
            <img className="brand-logo" src="/assets/brand/unplastica-light.png" alt="Unplastica" />
            <img className="brand-logo brand-logo-dark" src="/assets/brand/unplastica-dark.png" alt="" />
          </button>
          <div className="balance-pill"><img src="/assets/brand/greenbits.png" alt="" /><strong>{formatPoints(balance)}</strong></div>
          <button className="avatar-button" onClick={onProfile} aria-label="Profile and settings"><Icon name="user" /></button>
        </>}
      </div>
    </header>
  );
}

function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  const items: Array<{ page: Page; title: string; icon: IconName }> = [
    { page: "home", title: "Home", icon: "home" },
    { page: "earn", title: "Earn", icon: "earn" },
    { page: "events", title: "Events", icon: "events" },
  ];
  return <nav className="bottom-nav" aria-label="Main navigation">
    {items.map((item) => <button key={item.page} className={"nav-tab " + (page === item.page ? "active" : "")} onClick={() => onNavigate(item.page)} aria-current={page === item.page ? "page" : undefined}>
      <Icon name={item.icon} size={23} /><span>{item.title}</span>
    </button>)}
  </nav>;
}

function HomePage({ onEnter }: { onEnter: () => void }) {
  return <div className="content home-content">
    <section className="home-hero">
      <video className="hero-video" autoPlay muted loop playsInline poster="/assets/brand/unplastica-light.png" aria-label="Polluted river with plastic waste">
        <source src="/assets/home/polluted-river.mp4" type="video/mp4" />
      </video>
      <div className="hero-tint" />
      <h1>Plastic Sucks.<br /><span>So we avoid.</span></h1>
    </section>
    <section className="sanctuary">
      <h2>Your Sanctuary</h2>
      <button className="primary-button" onClick={onEnter}>Enter <Icon name="arrow" size={20} /></button>
      <p className="speech-card">Pet your animals, beautify your ecosystem,<br className="desktop-break" /> let’s play while saving the world!</p>
    </section>
  </div>;
}

function EarnPage({ selected, onSelect, onInfo, onCamera }: {
  selected: HabitCode | null;
  onSelect: (code: HabitCode) => void;
  onInfo: (code: HabitCode) => void;
  onCamera: () => void;
}) {
  const habit = HABITS.find((item) => item.code === selected);
  return <div className="content earn-content">
    <section className="earn-heading"><h1>Earn Greenbits <span>here.</span></h1><p>Referring to the verified actions below to earn Greenbits.</p></section>
    <section className="camera-section">
      <div className="section-heading"><h2>Habit checker</h2><span className="status-chip"><i />Ready</span></div>
      <button className="camera-frame" onClick={onCamera}>
        <i className="frame-corner corner-top-left" /><i className="frame-corner corner-top-right" />
        <i className="frame-corner corner-bottom-left" /><i className="frame-corner corner-bottom-right" />
        <span className="camera-helper"><Icon name="camera" size={25} /></span>
        <span className="camera-copy"><strong>{habit?.name ?? "Frame your habit proof"}</strong><span>{habit ? "Potential reward +" + habit.points + " Greenbits" : "Hold steady within guidelines"}</span></span>
        <span className="camera-action"><Icon name="camera" size={25} /></span>
      </button>
    </section>
    <section className="habit-section">
      <div className="section-heading"><h2>Core Habits</h2><span className="count-chip">7 <small>Actions</small></span></div>
      <div className="habit-list">{HABITS.map((item) => <article key={item.code} className={"habit-row " + (selected === item.code ? "selected" : "")}>
        <button className="habit-select" onClick={() => onSelect(item.code)} aria-pressed={selected === item.code}>
          <img src={habitImages[item.code]} alt="" /><span className="habit-labels"><strong>{item.name}</strong><b>+{item.points}</b></span>
        </button>
        <button className="info-button" aria-label={"About " + item.name} onClick={() => onInfo(item.code)}><Icon name="info" /></button>
      </article>)}</div>
    </section>
  </div>;
}

function EventsPage({ onSample }: { onSample: () => void }) {
  const entries = [
    { title: "500+ Items", detail: "Supplied over 500+ reusable cutlery in canteens", image: habitImages.box_cutlery },
    { title: "Campus Wide", detail: "Supplied non-plastic cutlery as well", image: habitImages.recycle_bags },
    { title: "Pioneering Event", detail: "First-ever green-campus event in APU", image: "/assets/events/apu-mark.png" },
  ];
  return <div className="content events-content">
    <section className="event-intro"><h1>First-ever Plastic-Free-Warrior is happening in APU</h1><div className="event-points"><img src="/assets/brand/greenbits.png" alt="" /><strong>1,450</strong></div></section>
    <section className="prizes">
      <div className="section-heading"><h2>Prize Breakdown</h2><span>RM 1,000 Pool</span></div>
      <article className="champion-prize"><span className="prize-icon"><Icon name="trophy" /></span><strong>Champion</strong><b>RM<br />500</b></article>
      <div className="runner-up-prizes">
        <article><span><Icon name="medal" size={18} /> Runner-up</span><strong>2nd Place</strong><b>RM 200</b></article>
        <article><span><Icon name="medal" size={18} /> Tiers</span><strong>3rd – 5th</strong><b>RM 100 <small>ea.</small></b></article>
      </div>
    </section>
    <section className="tournament"><h2>Tournament Details</h2><div className="action-card">
      <h3>Action Step</h3>
      <p><Icon name="check" />Submit photo or video proof in social media*</p>
      <p><Icon name="check" />Include measurable reduction data (e.g., tally of bottles, bags, or cutlery avoided).</p>
      <div className="social-rule"><strong>*Supported social media: Instagram, Facebook, YouTube, TikTok, RedNote, X</strong></div>
      <img className="social-media-strip" src="/assets/brand/social-media.png" alt="Instagram, Facebook, YouTube, TikTok, RedNote, and X" />
      <p className="hashtag-note">*Include tag <b>#UnplasticaAPU</b> when submitting</p>
    </div></section>
    <section className="criteria"><h2>Judging Criteria</h2><div className="criteria-grid">
      <Criterion icon="leaf" percent="40%" title="Impact" detail="Direct waste diversion" />
      <Criterion icon="users" percent="25%" title="Collaboration" detail="Peer engagement" />
      <Criterion icon="like" percent="20%" title="Popularity" detail="Student verification" />
      <Criterion icon="bulb" percent="15%" title="Creativeness" detail="Original substitutes" />
    </div></section>
    <button className="sample-link" onClick={onSample}><span className="play-circle"><Icon name="play" /></span><span><strong>Sample Demo</strong><small>Inspect an approved standard submission</small></span><Icon name="arrow" /></button>
    <section className="milestones"><div className="section-heading"><h2>What We’ve Done in APU</h2><span>Milestones</span></div><div className="milestone-list">
      {entries.map((item) => <article className="milestone" key={item.title}><img src={item.image} alt="" /><div><span>{item.title}</span><strong>{item.detail}</strong></div></article>)}
    </div></section>
  </div>;
}

function Criterion({ icon, percent, title, detail }: { icon: IconName; percent: string; title: string; detail: string }) {
  return <article className="criterion"><div className="criterion-top"><span><Icon name={icon} /></span><b>{percent}</b></div><strong>{title}</strong><small>{detail}</small></article>;
}

function SettingsPage(props: {
  profile: Profile; email: string; preview: boolean; notifications: boolean; language: string; theme: Theme;
  onNotification: (value: boolean) => void; onLanguage: (value: string) => void; onTheme: (value: Theme) => void;
  onAuth: () => void; onSignOut: () => void;
}) {
  const initials = props.profile.display_name.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  return <div className="content settings-content">
    <div className="profile-identity"><div className="profile-avatar">{initials}<span><Icon name="shield" size={16} /></span></div><h2>{props.profile.display_name}</h2></div>
    <div className="profile-details">
      <DetailRow label="Your Username" value={"@" + props.profile.username} icon="users" />
      <DetailRow label="Your Email" value={props.email} icon="mail" />
      <DetailRow label="Your Phone" value={props.profile.phone || "Add a phone number"} icon="user" />
      <DetailRow label="Your Tagline" value={props.profile.tagline} icon="bulb" />
    </div>
    <section className="preferences"><h3>Preferences &amp; Controls</h3>
      <div className="setting-card setting-toggle"><span className="setting-icon"><Icon name="bell" /></span><strong>Allow Notifications</strong><button className={"switch " + (props.notifications ? "on" : "")} role="switch" aria-checked={props.notifications} onClick={() => props.onNotification(!props.notifications)}><span /></button></div>
      <div className="setting-card setting-select"><div className="setting-title"><span className="setting-icon"><Icon name="globe" /></span><strong>Language</strong></div><div className="segmented language-options">
        {["Bahasa Melayu", "English", "中文"].map((value) => <button key={value} className={props.language === value ? "active" : ""} onClick={() => props.onLanguage(value)}>{value}</button>)}
      </div></div>
      <div className="setting-card setting-select"><div className="setting-title"><span className="setting-icon"><Icon name="sun" /></span><strong>Theme Preference</strong></div><div className="segmented theme-options">
        {([["light", "sun", "Light"], ["dark", "moon", "Dark"], ["system", "monitor", "System"]] as const).map(([value, icon, label]) =>
          <button key={value} className={props.theme === value ? "active" : ""} aria-label={label + " theme"} aria-pressed={props.theme === value} onClick={() => props.onTheme(value)}><Icon name={icon} /><span>{label}</span></button>)}
      </div></div>
    </section>
    <button className="logout-button" onClick={props.preview ? props.onAuth : props.onSignOut}><Icon name={props.preview ? "mail" : "logout"} />{props.preview ? "Sign in or create account" : "Log Out"}</button>
    {props.preview && <p className="preview-note">Preview account · Sign in to save your own preferences and Greenbits.</p>}
  </div>;
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return <div className="detail-row"><div><span>{label}</span><strong>{value}</strong></div><span className="detail-icon"><Icon name={icon} size={19} /></span></div>;
}

function AuthDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) { setError("Connect Supabase to enable accounts."); return; }
    setBusy(true); setError("");
    try {
      if (mode === "signup") {
        const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name, username: email.split("@")[0] } } });
        if (result.error) throw result.error;
        onCreated();
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        onClose();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete sign in."); }
    finally { setBusy(false); }
  };
  return <Modal onClose={onClose} labelledBy="auth-title"><div className="dialog auth-dialog">
    <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
    <img src="/assets/brand/unplastica-light.png" alt="Unplastica" /><h2 id="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
    <p>Use any email address. Greenbits are available after your email is verified.</p>
    <form onSubmit={(event) => void submit(event)}>
      {mode === "signup" && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>}
      <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
    <button className="text-button" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Already have an account? Sign in" : "New to Unplastica? Create an account"}</button>
  </div></Modal>;
}

function CameraDialog({ habitCode, preview, onClose, onComplete }: { habitCode: HabitCode | null; preview: boolean; onClose: () => void; onComplete: (message: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const habit = HABITS.find((item) => item.code === habitCode);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error();
        const active = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!alive) { active.getTracks().forEach((track) => track.stop()); return; }
        stream.current = active;
        if (video.current) video.current.srcObject = active;
      } catch { if (alive) setError("Allow camera access, or choose a photo from your device."); }
    })();
    return () => {
      alive = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);
  const setSelectedPhoto = (blob: Blob) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    setPhoto(blob);
    const nextUrl = URL.createObjectURL(blob);
    photoUrlRef.current = nextUrl;
    setPhotoUrl(nextUrl);
  };
  const capture = async () => {
    if (!video.current?.videoWidth) return;
    const element = video.current;
    const factor = Math.min(1, 1600 / element.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(element.videoWidth * factor);
    canvas.height = Math.round(element.videoHeight * factor);
    canvas.getContext("2d")?.drawImage(element, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (blob) setSelectedPhoto(blob);
  };
  const chooseFile = (file?: File) => {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPEG, PNG, or WebP image."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose a photo smaller than 10 MB."); return; }
    setSelectedPhoto(file);
  };
  const submit = async () => {
    if (!photo || !habitCode || !consent) return;
    if (!supabase || preview) { onComplete("Connect Supabase and sign in before submitting proof."); return; }
    setBusy(true);
    try {
      const created = await supabase.functions.invoke("create-proof-upload", { body: { habit_code: habitCode, content_type: photo.type, size_bytes: photo.size } });
      if (created.error) throw created.error;
      const storage = await supabase.storage.from("proof-media").uploadToSignedUrl(created.data.path, created.data.token, photo);
      if (storage.error) throw storage.error;
      const result = await supabase.functions.invoke("verify-scan", { body: { submission_id: created.data.submission_id } });
      if (result.error) {
        const context = (result.error as { context?: Response }).context;
        const details = context ? await context.clone().json().catch(() => null) : null;
        if (details?.code === "model_unavailable") {
          onComplete("Your proof is saved, but scoring is not live yet. No Greenbits were awarded.");
          return;
        }
        throw result.error;
      }
      onComplete(result.data?.status === "approved" ? "Verified! +" + (habit?.points ?? result.data.points) + " Greenbits" : "Your proof did not meet the 85% verification threshold.");
    } catch (cause) { onComplete(cause instanceof Error ? cause.message : "Could not submit this proof."); }
    finally { setBusy(false); }
  };

  return <Modal onClose={onClose} labelledBy="camera-title"><div className="dialog camera-dialog">
    <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
    <h2 id="camera-title">Frame your habit proof</h2><p>{habit?.name} · +{habit?.points} Greenbits after verified approval</p>
    <div className={"camera-preview " + (photoUrl ? "has-photo" : "")}>{photoUrl ? <img src={photoUrl} alt="Selected proof preview" /> : <video ref={video} autoPlay muted playsInline />}{!photoUrl && error && <span>{error}</span>}</div>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
    <div className="camera-controls">{photoUrl ? <button className="secondary-button" onClick={() => { setPhoto(null); if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current); photoUrlRef.current = ""; setPhotoUrl(""); }}>Retake</button> : <>
      <button className="secondary-button" onClick={() => fileInput.current?.click()}>Choose photo</button>
      <button className="primary-button" onClick={() => stream.current ? void capture() : fileInput.current?.click()}><Icon name="camera" /> Capture</button>
    </>}</div>
    <label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I agree that this proof photo may be stored privately for up to 30 days for verification and model improvement.</span></label>
    <button className="primary-button submit-proof" disabled={!photo || !consent || busy} onClick={() => void submit()}>{busy ? "Checking proof…" : "Submit for verification"}</button>
    <p className="camera-footnote">Only the server can approve a score and add Greenbits. The verification threshold is 85%.</p>
  </div></Modal>;
}

function SampleDialog({ onClose }: { onClose: () => void }) {
  return <Modal onClose={onClose} labelledBy="sample-title"><div className="dialog sample-dialog">
    <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
    <span className="approved-chip"><Icon name="check" size={16} /> Approved baseline</span>
    <h2 id="sample-title">Submission #0042</h2><h3>Campus Refill Journey: Zero-PET Week</h3>
    <p>Logs 14 consecutive single-use beverage containers eliminated via personal canteen flask + refillery station logs.</p>
    <div className="score-card"><span>Score</span><strong>94/100</strong><span>Impact Rating</span><b>A+</b></div>
  </div></Modal>;
}

function HabitInfoDialog({ code, onClose }: { code: HabitCode; onClose: () => void }) {
  const habit = HABITS.find((item) => item.code === code);
  if (!habit) return null;
  return <Modal onClose={onClose} labelledBy="habit-info-title"><div className="dialog habit-info-dialog">
    <button className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button><img src={habitImages[code]} alt="" />
    <h2 id="habit-info-title">{habit.name}</h2><p>{habit.description}</p><strong>+{habit.points} Greenbits</strong><button className="primary-button" onClick={onClose}>Got it</button>
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

function InstallPrompt() {
  const [prompt, setPrompt] = useState<{ prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } | null>(null);
  const [visible, setVisible] = useState(false);
  const [insideApp, setInsideApp] = useState(false);
  const [apple, setApple] = useState(false);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const agent = navigator.userAgent;
    const isStandalone = matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const inApp = /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\//i.test(agent);
    const isApple = /iPhone|iPad|iPod/i.test(agent);
    setStandalone(isStandalone);
    setInsideApp(inApp);
    setApple(isApple && /Safari/i.test(agent) && !inApp);
    setVisible(!isStandalone && (inApp || isApple));
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as Event & { prompt: () => Promise<void> });
      setVisible(true);
    };
    const installed = () => { setStandalone(true); setVisible(false); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", installed); };
  }, []);
  if (!visible || standalone) return null;
  return <aside className="install-prompt" aria-live="polite">
    {insideApp ? <><strong>Open in your browser</strong><span>Camera access and installation work best in Safari or Chrome.</span></> :
      apple ? <><strong>Add Unplastica to your Home Screen</strong><span>Tap Share, then Add to Home Screen.</span></> :
        <><strong>Keep Unplastica close</strong><span>Install the app for a faster launch.</span>{prompt && <button onClick={async () => { await prompt.prompt(); setPrompt(null); setVisible(false); }}>Install app</button>}</>}
    <button className="install-close" aria-label="Dismiss install prompt" onClick={() => setVisible(false)}><Icon name="close" size={18} /></button>
  </aside>;
}

function UpdateNotice() {
  const [update, setUpdate] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let alive = true;
    void import("virtual:pwa-register").then(({ registerSW }) => {
      const refresh = registerSW({ immediate: true, onNeedRefresh: () => setAvailable(true) });
      if (alive) setUpdate(() => refresh);
    });
    return () => { alive = false; };
  }, []);
  return available ? <div className="update-notice" role="status"><span>New version available, refresh</span><button onClick={() => void update?.(true)}>Refresh</button></div> : null;
}
