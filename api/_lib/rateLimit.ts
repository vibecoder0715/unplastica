import type { VercelRequest, VercelResponse } from "./types.js";

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests/minute per IP
export const LOCKOUT_DURATION_MS = 60 * 1000;

type RateLimitRecord = {
  timestamps: number[];
  lockedUntil: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfter?: number;
  resetEpochSec: number;
};

const ipRateLimits = new Map<string, RateLimitRecord>();

/**
 * Extracts the best-effort client IP from Vercel / reverse-proxy headers.
 */
export function getClientIp(request: VercelRequest): string {
  const vercelIp = request.headers["x-vercel-forwarded-for"];
  if (vercelIp) {
    const ip = Array.isArray(vercelIp) ? vercelIp[0] : vercelIp.split(",")[0];
    if (ip?.trim()) return ip.trim();
  }
  const realIp = request.headers["x-real-ip"];
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    if (ip?.trim()) return ip.trim();
  }
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded : forwarded.split(",");
    const ip = list[list.length - 1]?.trim();
    if (ip) return ip;
  }
  return "127.0.0.1";
}

/**
 * Checks sliding-window IP rate limit (30 req/min per IP by default).
 * Uses persistent Supabase RPC when service-role credentials exist, with in-memory fallback.
 */
export async function checkIpRateLimit(
  ip: string,
  namespace = "infer",
  maxRequests = MAX_REQUESTS_PER_WINDOW,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetEpochSec = Math.ceil((now + RATE_LIMIT_WINDOW_MS) / 1000);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/check_auth_rate_limit`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_key: `${namespace}:${ip}`,
          p_max_attempts: maxRequests,
          p_window_seconds: RATE_LIMIT_WINDOW_MS / 1000,
          p_lockout_seconds: LOCKOUT_DURATION_MS / 1000,
        }),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row && typeof row.allowed === "boolean") {
          return {
            allowed: row.allowed,
            retryAfter: row.retry_after || (row.allowed ? undefined : 60),
            remaining: Math.max(0, Number(row.remaining ?? 0)),
            limit: maxRequests,
            resetEpochSec,
          };
        }
      }
    } catch {
      // Fallback to local sliding-window memory limiter
    }
  }

  const key = `${namespace}:${ip}`;
  const record = ipRateLimits.get(key) || { timestamps: [], lockedUntil: 0 };
  record.timestamps = record.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0, limit: maxRequests, resetEpochSec };
  }

  if (record.timestamps.length >= maxRequests) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    ipRateLimits.set(key, record);
    return {
      allowed: false,
      retryAfter: LOCKOUT_DURATION_MS / 1000,
      remaining: 0,
      limit: maxRequests,
      resetEpochSec,
    };
  }

  record.timestamps.push(now);
  ipRateLimits.set(key, record);

  if (ipRateLimits.size > 2000) {
    for (const [k, val] of ipRateLimits.entries()) {
      if (val.lockedUntil < now && val.timestamps.length === 0) {
        ipRateLimits.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - record.timestamps.length),
    limit: maxRequests,
    resetEpochSec,
  };
}

/**
 * Applies standard rate-limit headers and returns true if request was rate-limited (HTTP 429 sent).
 * Returns false if the request is allowed to proceed.
 */
export async function isRateLimited(
  request: VercelRequest,
  response: VercelResponse,
  namespace = "infer",
  maxRequests = MAX_REQUESTS_PER_WINDOW,
): Promise<boolean> {
  const clientIp = getClientIp(request);
  const result = await checkIpRateLimit(clientIp, namespace, maxRequests);

  response.setHeader("X-RateLimit-Limit", String(result.limit));
  response.setHeader("X-RateLimit-Remaining", String(result.remaining));
  response.setHeader("X-RateLimit-Reset", String(result.resetEpochSec));

  if (!result.allowed) {
    const retryAfter = result.retryAfter || 60;
    response.setHeader("Retry-After", String(retryAfter));
    response.status(429).json({
      error: `Too many inference requests. Try again in ${retryAfter}s.`,
      retry_after: retryAfter,
      verified: false,
    });
    return true;
  }
  return false;
}

export const enforceIpRateLimit = isRateLimited;

/** Test-only helper to reset the in-memory rate limit map. */
export function resetInMemoryRateLimits(): void {
  ipRateLimits.clear();
}
