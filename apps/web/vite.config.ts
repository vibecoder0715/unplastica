import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  envDir: "../../",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["offline.html", "robots.txt", "icons/*.png", "apple-touch-icon.png"],
      manifest: {
        id: "/?v=0.1.6",
        name: "Unplastica",
        short_name: "Unplastica",
        start_url: "/?v=0.1.6",
        scope: "/",
        display: "standalone",
        theme_color: "#fafaed",
        background_color: "#fafaed",
        description: "Small plastic-free habits. A cleaner Malaysia, one choice at a time.",
        icons: [
          { src: "/icons/icon-192.png?v=0.1.6", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png?v=0.1.6", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png?v=0.1.6",
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

