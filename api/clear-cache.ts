import type { VercelRequest, VercelResponse } from "./_lib/types.js";

/**
 * Forces browser HTTP cache invalidation during major/forced app updates
 * without wiping Supabase auth localStorage or session cookies.
 */
export default function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  response.setHeader("Clear-Site-Data", '"cache"');
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");

  if (request.method !== "GET" && request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed." });
  }

  return response.status(200).json({ cleared: true, timestamp: Date.now() });
}
