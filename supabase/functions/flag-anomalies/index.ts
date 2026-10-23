import { admin } from "../_shared/clients.ts";
import { env, json, options } from "../_shared/http.ts";

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let value = 0;
  for (let i = 0; i < a.length; i++) value |= a[i] ^ b[i];
  return value === 0;
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const expectedSecret = env("CRON_SECRET") || env("RETENTION_CRON_SECRET") || "";
  if (!expectedSecret || !constantTimeEqual(request.headers.get("x-retention-secret") ?? "", expectedSecret)) return json({ error: "Unauthorized." }, 401);
  const { data, error } = await admin().rpc("flag_submission_anomalies");
  if (error) return json({ error: "Could not flag proof anomalies." }, 500);
  return json({ flagged: data ?? 0 });
});
