import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Icon, type IconName } from "../../components/Icon";
import { type Language } from "../../lib/i18n";
import { BrandWordmark, GreenbitLogo, Modal } from "../../shared/components/LayoutChrome";
import { useCopy } from "../../shared/context";
import type { InstallEnvironment, Profile, Theme } from "../../shared/types";
import {
  APP_BUILD_VERSION,
  compareVersions,
  isNewerVersion,
  validateCustomUsername,
  validateEmailAddress,
  validatePasswordComplexity,
} from "../../shared/validation";

export function AvatarCropModal({
  imageSrc,
  onCrop,
  onCancel,
}: {
  imageSrc: string;
  onCrop: (file: File) => Promise<void> | void;
  onCancel: () => void;
}) {
  const t = useCopy();
  const VIEWPORT_SIZE = 260;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 260, h: 260 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const fitScale = Math.max(
    VIEWPORT_SIZE / Math.max(1, naturalSize.w),
    VIEWPORT_SIZE / Math.max(1, naturalSize.h),
  );
  const displayW = naturalSize.w * fitScale;
  const displayH = naturalSize.h * fitScale;

  const clampPan = useCallback(
    (rawX: number, rawY: number, currentZoom: number) => {
      const maxX = Math.max(0, (displayW * currentZoom - VIEWPORT_SIZE) / 2);
      const maxY = Math.max(0, (displayH * currentZoom - VIEWPORT_SIZE) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, rawX)),
        y: Math.max(-maxY, Math.min(maxY, rawY)),
      };
    },
    [displayW, displayH],
  );

  const applyZoom = (nextZoomRaw: number) => {
    const nextZoom = Math.max(1, Math.min(3, Math.round(nextZoomRaw * 100) / 100));
    setZoom(nextZoom);
    setPan((prev) => clampPan(prev.x, prev.y, nextZoom));
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || img.width || 260;
    const h = img.naturalHeight || img.height || 260;
    setNaturalSize({ w, h });
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan(clampPan(e.clientX - dragStart.x, e.clientY - dragStart.y, zoom));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    applyZoom(zoom + delta);
  };

  const handleSave = async () => {
    const img = imgRef.current;
    if (!img) return;
    setSaving(true);
    try {
      const naturalW = img.naturalWidth || img.width || 260;
      const naturalH = img.naturalHeight || img.height || 260;
      const baseFitScale = Math.max(VIEWPORT_SIZE / naturalW, VIEWPORT_SIZE / naturalH);
      const renderW = naturalW * baseFitScale;
      const renderH = naturalH * baseFitScale;

      let blob: Blob | null = null;
      for (const outputSize of [256, 224, 192]) {
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outputSize, outputSize);

        const ratio = outputSize / VIEWPORT_SIZE;
        ctx.save();
        ctx.translate(outputSize / 2, outputSize / 2);
        ctx.translate(pan.x * ratio, pan.y * ratio);
        ctx.scale(zoom * ratio, zoom * ratio);
        ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
        ctx.restore();

        for (const quality of [0.86, 0.76, 0.66, 0.56, 0.45]) {
          blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", quality),
          );
          if (blob && blob.size <= 48 * 1024) break;
        }
        if (blob && blob.size <= 48 * 1024) break;
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
    <Modal onClose={onCancel} labelledBy="avatar-crop-title">
      <div className="dialog avatar-crop-dialog">
        <div className="dialog-header" style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 id="avatar-crop-title" style={{ margin: 0, color: "var(--forest)", fontSize: "1.2rem" }}>{t("profile.cropTitle")}</h2>
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
          onWheel={handleWheel}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            className="avatar-crop-image"
            onLoad={handleImageLoad}
            style={{
              width: `${displayW}px`,
              height: `${displayH}px`,
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
            <button
              type="button"
              className="avatar-zoom-step-btn"
              aria-label="Zoom out"
              onClick={() => applyZoom(zoom - 0.15)}
              disabled={zoom <= 1}
            >
              −
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
            />
            <button
              type="button"
              className="avatar-zoom-step-btn"
              aria-label="Zoom in"
              onClick={() => applyZoom(zoom + 0.15)}
              disabled={zoom >= 3}
            >
              +
            </button>
          </label>
        </div>
        <div className="dialog-actions" style={{ width: "100%", display: "flex", gap: "10px", marginTop: "12px" }}>
          <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={saving} style={{ flex: 1 }}>
            {saving ? t("profile.uploading") : t("profile.cropSave")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function LogoutConfirmDialog({
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
        <BrandWordmark width="154px" />
        <h2 id="logout-confirm-title">{t("auth.logoutConfirmTitle")}</h2>
        <p><GreenbitLogo size={16} />{t("auth.logoutConfirmDesc")}</p>
        <button type="button" className="primary-button logout-confirm-btn" onClick={onConfirm}>
          {t("settings.logoutAction")}
        </button>
      </div>
    </Modal>
  );
}

export function SettingsPage(props: {
  profile: Profile; email: string; user: User | null; guest: boolean; notifications: boolean; language: Language; theme: Theme;
  installAvailable: boolean; installEnvironment: InstallEnvironment; onInstall: () => Promise<void>;
  avatarBusy: boolean; onUploadAvatar: (file: File) => void;
  onNotification: (value: boolean) => Promise<void> | void; onLanguage: (value: Language) => void; onTheme: (value: Theme) => void;
  onAuth: () => void; onSignOut: () => void;
  onUpdateProfile?: (updated: { display_name: string; username: string; email?: string; phone: string; tagline: string }) => Promise<void>;
  onUpdatePassword?: (password: string) => Promise<void>;
  onShowManual?: () => void;
  notify: (message: string) => void;
}) {
  const t = useCopy();
  const [toggleBusy, setToggleBusy] = useState(false);
  const [showLangInfo, setShowLangInfo] = useState(false);
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
    <div className="profile-identity" id="profile-details">
      <div className="profile-avatar">{props.profile.avatar_url ? <img src={props.profile.avatar_url} alt="" /> : initials}</div>
      <h2>{props.profile.display_name}</h2>
      {props.guest ? <button className="profile-photo-upload" onClick={props.onAuth}><Icon name="camera" size={18} />{t("profile.loginToUpload")}</button> :
        <label className={"profile-photo-upload " + (props.avatarBusy ? "is-busy" : "")}>
          <Icon name="camera" size={18} /><span>{props.avatarBusy ? t("profile.uploading") : props.profile.avatar_url ? t("profile.changePhoto") : t("profile.uploadPhoto")}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} disabled={props.avatarBusy} />
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
        label={t("settings.email")}
        value={displayEmail ? displayEmail : props.guest ? t("settings.guestConnectHint") : t("settings.notLinkedHint")}
        icon="mail"
      />
      <DetailRow
        label={t("settings.phone")}
        value={props.profile.phone ? props.profile.phone : props.guest ? t("settings.guestPhoneHint") : t("settings.notLinkedHint")}
        icon="phone"
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
        <p>{t("auth.setPasswordDeviceDesc")}</p>
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

    <section className="preferences" id="preferences-section"><h3>{t("settings.preferences")}</h3>
      {!props.guest && (
        <>
          <div className="setting-card manual-trigger-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="setting-icon"><Icon name="play" /></span>
              <strong>{t("settings.showManual")}</strong>
            </div>
            <button
              type="button"
              className="primary-button show-manual-btn"
              style={{ minHeight: 36, padding: "0 18px", fontSize: 14 }}
              onClick={() => {
                props.onShowManual?.();
              }}
            >
              {t("settings.showManualAction")}
            </button>
          </div>
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
        </>
      )}
      <div className="setting-card setting-select" style={{ position: "relative" }}>
        <div className="setting-title" style={{ display: "flex", alignItems: "center" }}>
          <span className="setting-icon"><Icon name="globe" /></span>
          <strong>{t("settings.language")}</strong>
          <button
            type="button"
            className="lang-info-btn"
            aria-label="Translation disclaimer info"
            onClick={(e) => {
              e.stopPropagation();
              setShowLangInfo((prev) => !prev);
            }}
            style={{
              background: "none",
              border: "1.5px solid currentColor",
              color: "inherit",
              borderRadius: "50%",
              width: 19,
              height: 19,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              cursor: "pointer",
              marginLeft: 8,
              padding: 0,
              opacity: 0.82,
              lineHeight: 1,
            }}
          >
            i
          </button>
        </div>

        {showLangInfo && (
          <div
            className="lang-info-bubble"
            style={{
              position: "absolute",
              top: 50,
              left: 12,
              right: 12,
              background: "#ffffff",
              color: "#111827",
              border: "2px solid #111827",
              borderRadius: 16,
              padding: "10px 14px",
              fontSize: 12,
              lineHeight: 1.45,
              fontWeight: 600,
              boxShadow: "0 10px 28px rgba(0, 0, 0, 0.32)",
              zIndex: 20,
              animation: "mascotSlideUp 0.18s ease-out",
            }}
          >
            {/* Pointer tail pointing up to (i) button */}
            <div
              style={{
                position: "absolute",
                top: -7,
                left: 132,
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderBottom: "7px solid #111827",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -4.5,
                left: 132,
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "6px solid #ffffff",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <span>
                {props.language === "Bahasa Melayu"
                  ? "Terjemahan mungkin tidak 100% tepat, sila rujuk Bahasa Inggeris jika perlu."
                  : props.language === "中文"
                  ? "翻译可能无法做到100%完全准确，必要时请以英文为准。"
                  : props.language === "தமிழ்"
                  ? "மொழிபெயர்ப்பு 100% துல்லியமாக இல்லாமல் இருக்கலாம், தேவைப்படும் இடங்களில் ஆங்கிலத்தைப் பார்க்கவும்."
                  : "Translations might not be 100% accurate, refer to English where necessary."}
              </span>
              <button
                type="button"
                onClick={() => setShowLangInfo(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="segmented language-options">
          {(["Bahasa Melayu", "English", "中文", "தமிழ்"] as const).map((value) => (
            <button key={value} className={props.language === value ? "active" : ""} onClick={() => props.onLanguage(value)}>
              {value}
            </button>
          ))}
        </div>
      </div>
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

export function DetailRow({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return <div className="detail-row"><div><span>{label}</span><strong>{value}</strong></div><span className="detail-icon"><Icon name={icon} size={19} /></span></div>;
}

export default SettingsPage;
