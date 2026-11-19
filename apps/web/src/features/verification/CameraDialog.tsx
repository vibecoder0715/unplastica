import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { HABITS, type HabitCode } from "@unplastica/shared";
import { Icon } from "../../components/Icon";
import { getLanguage } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { DottedSpinner } from "../../shared/components/DottedSpinner";
import { GreenbitLogo, Modal } from "../../shared/components/LayoutChrome";
import { useCopy } from "../../shared/context";
import { sendVerificationSuccessNotification } from "../../shared/notifications";
import {
  type ModelDetection,
  runModelDetection,
  warmUpAiModel,
} from "./serverInferenceClient";

export function CameraDialog({ habitCode, onClose, onComplete }: { habitCode: HabitCode | null; onClose: () => void; onComplete: (message: ReactNode, verifiedSuccess?: boolean) => void }) {
  const t = useCopy();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const photoUrlRef = useRef("");
  const RATE_LIMIT_KEY = "unplastica_scanner_timestamps";
  const LOCKOUT_UNTIL_KEY = "unplastica_scanner_lockout_until";

  const getStoredLockoutSec = (): number => {
    try {
      const storedUntil = Number(sessionStorage.getItem(LOCKOUT_UNTIL_KEY) || 0);
      const remainingMs = storedUntil - Date.now();
      return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
    } catch {
      return 0;
    }
  };

  const getStoredSubmissionTimes = (): number[] => {
    try {
      const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        return parsed.filter((t) => typeof t === "number" && now - t < 60000);
      }
      return [];
    } catch {
      return [];
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectionIdRef = useRef(0);
  const [lockoutSec, setLockoutSec] = useState<number>(getStoredLockoutSec);
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
    const recent = getStoredSubmissionTimes();
    if (recent.length >= 5) {
      const lockoutDuration = 45;
      const until = now + lockoutDuration * 1000;
      try {
        sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(until));
      } catch {}
      setLockoutSec(lockoutDuration);
      return;
    }
    recent.push(now);
    try {
      sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
    } catch {}

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
    if (!file) return;

    // Security Hardening: 15MB file size ceiling and strict image MIME validation
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds 15MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Invalid file format. Please upload JPEG, PNG, or WebP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError("");
    setSelectedPhoto(file);
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
        window.dispatchEvent(new CustomEvent("unplastica-mascot-event", { detail: { type: "verification-fail" } }));
        onComplete(result.data?.error || t("camera.failed"));
        return;
      }
      if (result.data?.status === "approved") {
        const pts = habit?.points ?? result.data?.points ?? 10;
        void sendVerificationSuccessNotification(habit ? t("habit." + habit.code) : "Habit", pts, created.data?.submission_id, getLanguage());
        window.dispatchEvent(new CustomEvent("unplastica-mascot-event", { detail: { type: "verification-success", points: pts } }));
        onComplete(
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {t("camera.success", { points: pts })}
            <GreenbitLogo size={16} />
          </span>,
          true,
        );
        return;
      }
      onComplete(t("camera.failed"), false);
    } catch {
      window.dispatchEvent(new CustomEvent("unplastica-mascot-event", { detail: { type: "verification-fail" } }));
      onComplete(t("camera.failed"));
    }
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

      {detecting && (
        <div className="verification-loading-overlay">
          <DottedSpinner size={54} />
          <span className="verification-loading-text">{t("camera.checkingPhoto")}</span>
        </div>
      )}
    </div>

    {lockoutSec > 0 && (
      <div className="ai-detection-pill flagged" style={{ background: "rgba(220, 38, 38, 0.12)", color: "#dc2626", border: "1px solid rgba(220, 38, 38, 0.3)" }}>
        {t("camera.rateLimit", { lockoutSec })}
      </div>
    )}

    {detection && !detecting && (
      <div className={"ai-detection-pill " + (detection.verified ? "verified" : "flagged")}>
        {detection.message === "Verified"
          ? t("camera.verified")
          : detection.message === "Not verified"
          ? t("camera.notVerified")
          : t("camera.notRecognized")}
      </div>
    )}

    {!detection?.verified && !detecting && (
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
    )}
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

export default CameraDialog;
