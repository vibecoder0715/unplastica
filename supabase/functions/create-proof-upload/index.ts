import { admin, isResponse, requireVerifiedUser } from "../_shared/clients.ts";
import { env, json, options } from "../_shared/http.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

Deno.serve(async (request: Request) => {
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

    // Enforce daily limit: 3 times/day for box_cutlery, 1 time/day for others (Asia/Kuala_Lumpur UTC+8)
    const maxPerDay = habit_code === "box_cutlery" ? 3 : 1;
    const klNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const klDateStr = klNow.toISOString().slice(0, 10);
    const klStartUtc = new Date(`${klDateStr}T00:00:00.000+08:00`).toISOString();

    const { count: todayApprovedCount } = await db.from("habit_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("habit_code", habit_code)
      .eq("status", "approved")
      .gte("created_at", klStartUtc);

    if ((todayApprovedCount ?? 0) >= maxPerDay) {
      return json({
        code: "daily_limit_reached",
        error: `Daily limit reached for this habit (${maxPerDay} time${maxPerDay > 1 ? "s" : ""}/day). Come back tomorrow!`
      }, 429);
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await db.from("habit_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "pending_upload")
      .gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= 10) return json({ error: "You have reached the hourly proof limit. Try again later." }, 429, request);

    const pendingSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: pendingCount, error: pendingError } = await db.from("habit_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending_upload")
      .gte("created_at", pendingSince);
    if (pendingError) throw pendingError;
    if ((pendingCount ?? 0) >= 5) return json({ error: "You have upload slots in progress. Please complete or cancel before creating more." }, 429, request);

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
