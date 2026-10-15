import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  envDir: "../../",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["offline.html", "robots.txt", "icons/*.png", "apple-touch-icon.png"],
      manifest: {
        name: "Unplastica",
        short_name: "Unplastica",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#fafaed",
        background_color: "#fafaed",
        description: "Small plastic-free habits. A cleaner Malaysia, one choice at a time.",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/offline.html",
        globPatterns: ["**/*.{html,js,css,webmanifest}"],
        globIgnores: ["**/assets/habits/**", "**/*.mp4", "**/*.map"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
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
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

