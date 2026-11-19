import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const versionData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "public/version.json"), "utf-8"));
const appVersion = versionData.version || "0.7.0";

function createApiMiddleware() {
  return async (req: any, res: any, next: () => void) => {
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

    if (url === "/api/clear-cache" || url === "/api/infer" || url === "/api/score") {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const rawBody = Buffer.concat(chunks);
        const ct = String(req.headers["content-type"] || "").toLowerCase();
        if (ct.includes("application/json") && rawBody.length > 0) {
          try {
            req.body = JSON.parse(rawBody.toString("utf-8"));
          } catch {
            req.body = rawBody;
          }
        } else {
          req.body = rawBody;
        }

        const vercelRes = {
          status(code: number) {
            res.statusCode = code;
            return vercelRes;
          },
          setHeader(name: string, value: string) {
            res.setHeader(name, value);
            return vercelRes;
          },
          json(payload: unknown) {
            if (!res.getHeader("Content-Type")) {
              res.setHeader("Content-Type", "application/json; charset=utf-8");
            }
            res.end(JSON.stringify(payload));
            return vercelRes;
          },
          send(payload: unknown) {
            res.end(typeof payload === "string" ? payload : JSON.stringify(payload));
            return vercelRes;
          },
        };

        const modPath =
          url === "/api/clear-cache"
            ? "../../api/clear-cache.ts"
            : url === "/api/infer"
              ? "../../api/infer.ts"
              : "../../api/score.ts";
        const mod = await import(modPath);
        await mod.default(req, vercelRes);
        return;
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: String(err) }));
      }
    }
    next();
  };
}

export default defineConfig({
  envDir: "../../",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@game": path.resolve(__dirname, "../../game/src"),
    },
  },
  plugins: [
    {
      name: "unplastica-security-and-api",
      configureServer(server) {
        server.middlewares.use(createApiMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createApiMiddleware());
      },
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "offline.html",
        "robots.txt",
        "icons/*.png",
        "apple-touch-icon.png",
        "assets/brand/*.png",
      ],
      manifest: {
        id: `/?v=${appVersion}`,
        name: "Unplastica",
        short_name: "Unplastica",
        start_url: `/?v=${appVersion}`,
        scope: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        description: "Small plastic-free habits. A cleaner Malaysia, one choice at a time.",
        icons: [
          { src: `/icons/icon-192-v2.png?v=${appVersion}`, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: `/icons/icon-512-v2.png?v=${appVersion}`, sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: `/icons/icon-maskable-512-v2.png?v=${appVersion}`,
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
        importScripts: ["/sw-notifications.js"],
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
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; media-src 'self' blob:; object-src 'none'; base-uri 'self';",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@supabase")) {
            return "supabase";
          }
          if (id.includes("/game/src/roster/animalRenderer") || id.includes("\\game\\src\\roster\\animalRenderer")) {
            return "game-fauna";
          }
          if (id.includes("/game/src/roster/plantRenderer") || id.includes("\\game\\src\\roster\\plantRenderer")) {
            return "game-flora";
          }
          if (id.includes("/game/src/game/renderers/") || id.includes("\\game\\src\\game\\renderers\\")) {
            return "game-scenery";
          }
          return undefined;
        },
      },
    },
  },
});
