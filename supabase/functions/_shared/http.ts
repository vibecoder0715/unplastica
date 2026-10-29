const PRODUCTION_ORIGIN = "https://unplastica.vercel.app";
const ALLOWED_ORIGINS = new Set([
  PRODUCTION_ORIGIN,
  ...(Deno.env.get("ALLOWED_ORIGIN") ? [Deno.env.get("ALLOWED_ORIGIN")!] : []),
]);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    if (url.protocol === "https:" && url.hostname.endsWith(".vercel.app")) return true;
  } catch {
    return false;
  }
  return false;
}

export function getCorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get("origin") ?? "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : PRODUCTION_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retention-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": PRODUCTION_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retention-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function json(body: unknown, status = 200, request?: Request): Response {
  const headers = request ? getCorsHeaders(request) : corsHeaders;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function options(request: Request): Response | null {
  return request.method === "OPTIONS" ? new Response("ok", { headers: getCorsHeaders(request) }) : null;
}

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server setting: ${name}`);
  return value;
}
