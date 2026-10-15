import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { admin } from "../_shared/clients.ts";
import { env, json, options } from "../_shared/http.ts";

const fail = () => json({ error: "Invalid username or password." }, 401);

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const body = await request.json().catch(() => null);
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!/^[a-z0-9_.-]{3,40}$/.test(identifier) || password.length < 8 || password.length > 128) return fail();

    const service = admin();
    const { data: profile, error: profileError } = await service.from("profiles")
      .select("id").eq("username", identifier).maybeSingle();
    if (profileError || !profile) return fail();

    const { data: account, error: accountError } = await service.auth.admin.getUserById(profile.id);
    const user = account.user;
    if (accountError || !user || (!user.email_confirmed_at && !user.phone_confirmed_at)) return fail();
    const loginId = user.email || user.phone;
    if (!loginId) return fail();

    const publicClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const credentials = user.email
      ? { email: user.email, password }
      : { phone: user.phone!, password };
    const { data, error } = await publicClient.auth.signInWithPassword(credentials);
    if (error || !data.session) return fail();
    return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (error) {
    console.error("username sign-in failed", error);
    return fail();
  }
});
