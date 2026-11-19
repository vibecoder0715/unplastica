import { translate, type Language } from "../lib/i18n";

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
  icon = "/icons/notification-logo-white.png",
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
      badge: "/icons/notification-logo-white.png",
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
    icon: "/icons/notification-logo-white.png",
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
    icon: "/icons/notification-logo-white.png",
  });
}
