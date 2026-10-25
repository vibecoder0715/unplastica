import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const versionData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "public/version.json"), "utf-8"));
const appVersion = versionData.version || "0.2.4";

export default defineConfig({
  envDir: "../../",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    {
      name: "block-sensitive-files",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = (req as { url?: string }).url || "";
          const url = rawUrl.split("?")[0];
          if (/^\/(\.env.*|\.git.*|config\.json.*|\.aws.*)/i.test(url)) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "DENY");
            res.setHeader("Content-Security-Policy", "default-src 'none'");
            return res.end("Not Found");
          }
          next();
        });
      },
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["offline.html", "robots.txt", "icons/*.png", "apple-touch-icon.png"],
      manifest: {
        id: `/?v=${appVersion}`,
        name: "Unplastica",
        short_name: "Unplastica",
        start_url: `/?v=${appVersion}`,
        scope: "/",
        display: "standalone",
        theme_color: "#fafaed",
        background_color: "#fafaed",
        description: "Small plastic-free habits. A cleaner Malaysia, one choice at a time.",
        icons: [
          { src: `/icons/icon-192.png?v=${appVersion}`, sizes: "192x192", type: "image/png" },
          { src: `/icons/icon-512.png?v=${appVersion}`, sizes: "512x512", type: "image/png" },
          {
            src: `/icons/icon-maskable-512.png?v=${appVersion}`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{html,js,css,webmanifest}"],
        globIgnores: ["**/assets/habits/**", "**/*.mp4", "**/*.map"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin !== self.location.origin ||
              url.pathname.startsWith("/api/") ||
              url.pathname.startsWith("/auth/v1/") ||
              url.pathname.startsWith("/rest/v1/") ||
              url.pathname.startsWith("/storage/v1/") ||
              url.pathname.startsWith("/functions/v1/"),
            handler: "NetworkOnly",
            options: { cacheName: "never-cache-private-or-api" },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    headers: {
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; media-src 'self' blob:; object-src 'none'; base-uri 'self';",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: { supabase: ["@supabase/supabase-js"] },
      },
    },
  },
});

