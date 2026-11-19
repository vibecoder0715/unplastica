import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { useCopy } from "../context";
import { isNotificationsEnabled } from "../notifications";
import type { InstallEnvironment, InstallPromptEvent } from "../types";
import { APP_BUILD_VERSION, compareVersions, isNewerVersion } from "../validation";

export function InstallPrompt({ prompt, environment, onInstall }: { prompt: InstallPromptEvent | null; environment: InstallEnvironment; onInstall: () => Promise<void> }) {
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

export function UpdateNotice() {
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

  const performClearCacheAndUpdate = async (newVersion?: string) => {
    if (updating) return;
    setUpdating(true);
    const targetVer = newVersion || availableVersion || APP_BUILD_VERSION;
    localStorage.removeItem("unplastica_update_available");
    localStorage.setItem("unplastica_acknowledged_update_ver", targetVer);
    localStorage.setItem("unplastica_app_version", targetVer);
    setAvailableVersion(null);
    try {
      try {
      await fetch("/api/clear-cache", { method: "POST", cache: "no-store" });
    } catch {
      // Ignore offline errors during cache invalidation
    }
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
          icon: `/icons/notification-logo-white.png?v=${newVer}`,
          badge: `/icons/notification-logo-white.png?v=${newVer}`,
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
            if (data?.forceUpdate) {
              void performClearCacheAndUpdate(remoteVer);
              return;
            }
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
      const hadController = Boolean(navigator.serviceWorker.controller);
      const onControllerChange = () => {
        if (!hadController || refreshing) return;
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


