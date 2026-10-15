import { admin, isResponse, requireVerifiedUser } from "../_shared/clients.ts";
import { json, options } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const user = await requireVerifiedUser(request);
  if (isResponse(user)) return user;
  const body = await request.json().catch(() => null);
  if (typeof body?.spend_code !== "string" || typeof body?.idempotency_key !== "string") return json({ error: "Invalid spend request." }, 400);
  const { data, error } = await admin().rpc("spend_greenbits", {
    p_user_id: user.id, p_spend_code: body.spend_code, p_idempotency_key: body.idempotency_key,
  });
  if (error) return json({ error: "The game spend could not be completed.", code: error.message }, 409);
  return json(Array.isArray(data) ? data[0] : data);
});
