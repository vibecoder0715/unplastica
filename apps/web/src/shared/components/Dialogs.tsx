import { type FormEvent, useState } from "react";
import { HABITS, type HabitCode } from "@unplastica/shared";
import { Icon } from "../../components/Icon";
import { useCopy } from "../context";
import { habitImages } from "../types";
import { validateCustomUsername } from "../validation";
import { BrandLogo, GreenbitLogo, Modal } from "./LayoutChrome";

export function LoginRequiredDialog({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: () => void;
}) {
  const t = useCopy();
  return (
    <Modal onClose={onClose} labelledBy="login-required-title">
      <div className="dialog login-required-dialog">
        <button className="dialog-close" onClick={onClose} aria-label={t("common.close")}>
          <Icon name="close" />
        </button>
        <BrandLogo scrolled />
        <h2 id="login-required-title">{t("gate.title")}</h2>
        <p>{t("gate.body")}</p>
        <button className="primary-button" onClick={onLogin}>
          {t("gate.login")}
        </button>
      </div>
    </Modal>
  );
}

export function SampleDialog({ onClose }: { onClose: () => void }) {
  const t = useCopy();
  return (
    <Modal onClose={onClose} labelledBy="sample-title">
      <div className="dialog sample-dialog">
        <button className="dialog-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        <span className="approved-chip">
          <Icon name="check" size={16} /> {t("sample.approved")}
        </span>
        <h2 id="sample-title">{t("sample.submission")}</h2>
        <h3>{t("sample.title")}</h3>
        <p dangerouslySetInnerHTML={{ __html: t("sample.description") }} />
        <div className="score-card">
          <span>{t("sample.score")}</span>
          <strong>94/100</strong>
          <span>{t("sample.rating")}</span>
          <b>A+</b>
        </div>
      </div>
    </Modal>
  );
}

export function HabitInfoDialog({ code, onClose }: { code: HabitCode; onClose: () => void }) {
  const t = useCopy();
  const habit = HABITS.find((item) => item.code === code);
  if (!habit) return null;
  return (
    <Modal onClose={onClose} labelledBy="habit-info-title">
      <div className="dialog habit-info-dialog">
        <button className="dialog-close" onClick={onClose} aria-label={t("common.close")}>
          <Icon name="close" />
        </button>
        <img src={habitImages[code]} alt="" />
        <h2 id="habit-info-title">{t("habit." + code)}</h2>
        <p dangerouslySetInnerHTML={{ __html: t("habitDescription." + code) }} />
        <strong style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          +{habit.points}
          <GreenbitLogo size={18} />
        </strong>
      </div>
    </Modal>
  );
}

export function UsernamePromptDialog({
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
  const [username, setUsername] = useState(
    initialUsername.startsWith("user_") || /^user\d+/i.test(initialUsername) ? "" : initialUsername,
  );
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
      setError(
        msg.includes("unique") || msg.includes("profiles_username")
          ? "This username is already taken. Please choose another."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onDismiss} labelledBy="username-prompt-title">
      <div className="dialog auth-dialog" style={{ maxWidth: 440 }}>
        <button className="dialog-close" onClick={onDismiss} aria-label="Close">
          <Icon name="close" />
        </button>
        <BrandLogo scrolled />
        <h2 id="username-prompt-title">{t("auth.usernamePromptTitle")}</h2>
        <p>{t("auth.usernamePromptBody")}</p>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <label>
            {t("settings.usernameUpper")}
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 30))
              }
              placeholder={initialUsername || "e.g. warrior"}
              minLength={2}
              maxLength={30}
              autoFocus
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
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
