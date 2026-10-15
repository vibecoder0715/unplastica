import { admin, isResponse, requireVerifiedUser } from "../_shared/clients.ts";
import { env, json, options } from "../_shared/http.ts";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const user = await requireVerifiedUser(request);
    if (isResponse(user)) return user;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request." }, 400);
    const { habit_code, content_type, size_bytes } = body as Record<string, unknown>;
    if (typeof habit_code !== "string" || typeof content_type !== "string" || !allowedTypes.has(content_type)) {
      return json({ error: "Choose a supported image and habit." }, 400);
    }
    if (!Number.isInteger(size_bytes) || Number(size_bytes) < 1 || Number(size_bytes) > maxBytes) {
      return json({ error: "Images must be smaller than 10 MB." }, 400);
    }

    const db = admin();
    const { data: habit } = await db.from("habit_definitions").select("code").eq("code", habit_code).eq("enabled", true).maybeSingle();
    if (!habit) return json({ error: "That habit is not available." }, 400);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await db.from("habit_submissions")
      .select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= 10) return json({ error: "You have reached the hourly proof limit. Try again later." }, 429);

    const submissionId = crypto.randomUUID();
    const extension = content_type === "image/jpeg" ? "jpg" : content_type === "image/png" ? "png" : "webp";
    const path = `${user.id}/${submissionId}.${extension}`;
    const { error: insertError } = await db.from("habit_submissions").insert({
      id: submissionId, user_id: user.id, habit_code, storage_path: path, content_type,
    });
    if (insertError) throw insertError;
    const { data: signed, error: signedError } = await db.storage.from("proof-media").createSignedUploadUrl(path, { upsert: false });
    if (signedError) {
      await db.from("habit_submissions").delete().eq("id", submissionId);
      throw signedError;
    }
    return json({ submission_id: submissionId, path, token: signed.token, expires_in: 120 });
  } catch (error) {
    console.error("create-proof-upload", error);
    return json({ error: "Could not start a secure proof upload." }, 500);
  }
});
