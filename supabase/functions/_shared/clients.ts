import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { env, json } from "./http.ts";

export const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export async function requireVerifiedUser(request: Request): Promise<{ id: string; email: string } | Response> {
  const match = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: "Sign in with a verified email first." }, 401);
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(match[1]);
  const user: User | null = data.user;
  if (error || !user || !user.email || !user.email_confirmed_at) {
    return json({ error: "A verified email address is required." }, 401);
  }
  return { id: user.id, email: user.email };
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
