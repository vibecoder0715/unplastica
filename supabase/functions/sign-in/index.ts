// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { admin } from "../_shared/clients.ts";
import { env, json, options } from "../_shared/http.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const fail = (request?: Request) => json({ error: "Invalid username or password." }, 401, request);

Deno.serve(async (request: Request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, request);

  const startTime = Date.now();
  const ensureMinDuration = async (minMs = 350) => {
    const elapsed = Date.now() - startTime;
    if (elapsed < minMs) {
      await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
    }
  };

  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const service = admin();

    // Distributed server-side rate limit per IP
    const { data: limitData } = await service.rpc("check_auth_rate_limit", {
      p_key: `signin:${clientIp}`,
      p_max_attempts: 5,
      p_window_seconds: 60,
      p_lockout_seconds: 60,
    });
    const limit = Array.isArray(limitData) ? limitData[0] : limitData;
    if (limit && !limit.allowed) {
      return json({
        error: `Too many sign-in attempts. Locked for ${limit.retry_after || 60} seconds.`,
        retry_after: limit.retry_after || 60,
      }, 429, request);
    }

    const body = await request.json().catch(() => null);
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!/^[a-z0-9_.-]{3,40}$/.test(identifier) || password.length < 8 || password.length > 72) {
      await ensureMinDuration();
      return fail(request);
    }

    const publicClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: profile, error: profileError } = await service.from("profiles")
      .select("id").eq("username", identifier).maybeSingle();

    if (profileError || !profile) {
      // Dummy auth round-trip to prevent timing enumeration
      await publicClient.auth.signInWithPassword({
        email: "dummy_unregistered_user@unplastica.internal",
        password,
      }).catch(() => null);
      await ensureMinDuration();
      return fail(request);
    }

    const { data: account, error: accountError } = await service.auth.admin.getUserById(profile.id);
    const user = account?.user;
    if (accountError || !user) {
      await publicClient.auth.signInWithPassword({
        email: "dummy_unregistered_user@unplastica.internal",
        password,
      }).catch(() => null);
      await ensureMinDuration();
      return fail(request);
    }

    const loginId = user.email || user.phone;
    if (!loginId) {
      await ensureMinDuration();
      return fail(request);
    }

    const credentials = user.email
      ? { email: user.email, password }
      : { phone: user.phone!, password };

    const { data, error } = await publicClient.auth.signInWithPassword(credentials);
    await ensureMinDuration();
    if (error || !data?.session) {
      return fail(request);
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }, 200, request);
  } catch (error) {
    console.error("username sign-in failed", error);
    await ensureMinDuration();
    return fail(request);
  }
});
