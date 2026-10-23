import { admin } from "../_shared/clients.ts";
import { env, json, options } from "../_shared/http.ts";

function authorized(request: Request): boolean {
  const secret = env("CRON_SECRET") || env("RETENTION_CRON_SECRET") || "";
  if (!secret) return false;
  const received = new TextEncoder().encode(request.headers.get("x-retention-secret") ?? "");
  const expected = new TextEncoder().encode(secret);
  if (received.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < received.length; i++) mismatch |= received[i] ^ expected[i];
  return mismatch === 0;
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!authorized(request)) return json({ error: "Unauthorized." }, 401);
  const db = admin();
  const now = new Date().toISOString();
  const { data: rows, error } = await db.from("habit_submissions")
    .select("id,storage_path").lt("expires_at", now).is("media_deleted_at", null).limit(500);
  if (error) return json({ error: "Could not find expired proof media." }, 500);
  if (!rows?.length) return json({ deleted: 0 });
  let deleted = 0;
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const { error: removeError } = await db.storage.from("proof-media").remove(batch.map((row) => row.storage_path));
    if (removeError) {
      console.error("expired media removal failed", removeError);
      continue;
    }
    const ids = batch.map((row) => row.id);
    const { error: updateError } = await db.from("habit_submissions").update({ media_deleted_at: now }).in("id", ids);
    if (updateError) console.error("expired media marker update failed", updateError);
    else deleted += batch.length;
  }
  return json({ deleted });
});
