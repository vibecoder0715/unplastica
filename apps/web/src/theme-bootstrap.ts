// Theme and version bootstrap script (extracted to eliminate 'unsafe-inline' CSP)
(() => {
  const APP_VER = "0.2.4";
  try {
    const stored = localStorage.getItem("unplastica_app_version");
    if (stored !== APP_VER) {
      localStorage.setItem("unplastica_app_version", APP_VER);
      if (stored && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (let i = 0; i < regs.length; i++) regs[i].unregister();
        });
        if ("caches" in window) {
          caches.keys().then((keys) => {
            for (let j = 0; j < keys.length; j++) caches.delete(keys[j]);
          });
        }
      }
    }
    const storedTheme = localStorage.getItem("theme");
    const isDark =
      storedTheme === "dark" ||
      (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  } catch (_) {}
})();
