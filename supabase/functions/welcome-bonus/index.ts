import { admin, isResponse, requireVerifiedUser } from "../_shared/clients.ts";
import { json, options } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const user = await requireVerifiedUser(request);
    if (isResponse(user)) return user;
    const { data, error } = await admin().rpc("award_welcome_bonus", { p_user_id: user.id });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    return json({ awarded: Boolean(result?.awarded), points: Number(result?.points ?? 0) });
  } catch (error) {
    console.error("welcome-bonus", error);
    return json({ error: "Could not grant the welcome bonus." }, 500);
  }
});
