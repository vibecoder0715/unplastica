import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(projectRoot, "apps/web/dist");
const baseUrl = process.env.VITE_APP_URL?.trim().replace(/\/$/, "");
const indexPath = resolve(output, "index.html");
let html = await readFile(indexPath, "utf8");

if (baseUrl && /^https:\/\//i.test(baseUrl)) {
  const canonical = `\n    <link rel="canonical" href="${baseUrl}/" />\n    <meta property="og:url" content="${baseUrl}/" />`;
  html = html.replace("</head>", `${canonical}\n  </head>`);
  await writeFile(indexPath, html);
  await writeFile(resolve(output, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${baseUrl}/</loc></url>\n  <url><loc>${baseUrl}/earn</loc></url>\n  <url><loc>${baseUrl}/events</loc></url>\n</urlset>\n`);
  await writeFile(resolve(output, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
} else {
  await rm(resolve(output, "sitemap.xml"), { force: true });
  await writeFile(resolve(output, "robots.txt"), "User-agent: *\nAllow: /\n");
}

await mkdir(output, { recursive: true });
