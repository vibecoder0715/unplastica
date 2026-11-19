import { type FormEvent, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { BrandLogo } from "../../shared/components/LayoutChrome";
import { useCopy } from "../../shared/context";
import {
  normalizePhone,
  validateCustomUsername,
  validateEmailAddress,
  validatePasswordComplexity,
} from "../../shared/validation";

export function AuthPage({ user, onAuthenticated }: { user?: User | null; onAuthenticated: () => void }) {
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

export function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z"/><path fill="#34A853" d="M24 44c5.4 0 10-1.8 13.4-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H6v5.2A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.7V15H6a20 20 0 0 0 0 18.1l6.8-5.2Z"/><path fill="#EA4335" d="M24 12c2.9 0 5.5 1 7.5 3l5.8-5.8C33.9 5.8 29.4 4 24 4A20 20 0 0 0 6 15l6.8 5.2C14.4 15.5 18.8 12 24 12Z"/></svg>;
}

export function MicrosoftMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default AuthPage;
