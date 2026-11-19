import crypto from "node:crypto";
import type { VercelRequest } from "./types.js";

function timingSafeBearerMatch(authorization: string, expectedKey: string): boolean {
  const expectedAuth = `Bearer ${expectedKey}`;
  const authBuf = Buffer.from(authorization);
  const expBuf = Buffer.from(expectedAuth);
  if (authBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(authBuf, expBuf);
}

/**
 * Authorizes an inference request via either:
 * 1. Service-to-service Bearer token matching ML_SCORER_API_KEY (when configured), or
 * 2. A valid Supabase user JWT verified against Supabase Auth /auth/v1/user.
 */
export async function authorizeInferenceRequest(
  request: VercelRequest,
): Promise<{ authorized: true; mode: "service" | "user" | "anonymous"; userId?: string } | { authorized: false; status: number; error: string }> {
  const header = request.headers.authorization;
  const authorization = Array.isArray(header) ? header[0] : header;
  const expectedKey = process.env.ML_SCORER_API_KEY;

  if (expectedKey && authorization && timingSafeBearerMatch(authorization, expectedKey)) {
    return { authorized: true, mode: "service" };
  }

  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && anonKey && token.length > 20) {
      try {
        const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: anonKey,
          },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const user = (await res.json().catch(() => null)) as { id?: string } | null;
          if (user?.id) {
            return { authorized: true, mode: "user", userId: user.id };
          }
        }
      } catch {
        // Fall through to fail-closed error
      }
    }

    return { authorized: false, status: 401, error: "Invalid authorization token." };
  }

  if (!expectedKey) {
    return { authorized: true, mode: "anonymous" };
  }

  return { authorized: false, status: 401, error: "Unauthorized inference request." };
}
