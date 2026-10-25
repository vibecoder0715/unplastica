import { admin, isResponse, requireVerifiedUser } from "../_shared/clients.ts";
import { env, json, options } from "../_shared/http.ts";

const maxBytes = 10 * 1024 * 1024;
function sha256(bytes: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
}
function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function isImage(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (request: Request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const user = await requireVerifiedUser(request);
    if (isResponse(user)) return user;
    const body = await request.json().catch(() => null);
    const submissionId = body && typeof body.submission_id === "string" ? body.submission_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return json({ error: "Invalid submission." }, 400);

    const db = admin();
    const { data: submission, error: lookupError } = await db.from("habit_submissions")
      .select("id,user_id,habit_code,storage_path,content_type,status,expires_at,score,points_awarded")
      .eq("id", submissionId).eq("user_id", user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!submission) return json({ error: "Submission not found." }, 404);
    if (new Date(submission.expires_at).getTime() < Date.now()) return json({ error: "This proof has expired." }, 410);
    if (submission.status === "approved") return json({ status: "approved", points: submission.points_awarded, score: submission.score });
    if (submission.status === "rejected" || submission.status === "expired") return json({ status: submission.status, points: 0 });
    if (submission.status !== "pending_upload" && submission.status !== "uploaded") return json({ error: "This proof is not ready." }, 409);

    const { data: file, error: downloadError } = await db.storage.from("proof-media").download(submission.storage_path);
    if (downloadError || !file) return json({ error: "Upload the proof photo before checking it." }, 409);
    if (file.size > maxBytes) return json({ error: "The proof is larger than allowed." }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isImage(bytes, submission.content_type)) {
      await db.from("habit_submissions").update({ status: "rejected", scored_at: new Date().toISOString() }).eq("id", submission.id).eq("user_id", user.id);
      return json({ status: "rejected", reason: "unsupported_image" }, 422);
    }
    const proofHash = hex(await sha256(bytes));
    if (submission.status === "pending_upload") {
      const { error } = await db.from("habit_submissions").update({ status: "uploaded" })
        .eq("id", submission.id).eq("user_id", user.id).eq("status", "pending_upload");
      if (error) throw error;
    }

    function toBase64(buffer: Uint8Array): string {
      let binary = "";
      const len = buffer.byteLength;
      for (let i = 0; i < len; i += 8192) {
        binary += String.fromCharCode(...buffer.subarray(i, Math.min(i + 8192, len)));
      }
      return btoa(binary);
    }

    const form = new FormData();
    form.set("file", new Blob([bytes], { type: submission.content_type }), "proof-image");
    form.set("habit_code", submission.habit_code);

    let confidence = 0.0;
    let label = "";
    let modelVersion = "mobilenet_v3_small-v0.1.8-clutter-invariant";
    let scorerSucceeded = false;

    const scorerUrl = Deno.env.get("ML_SCORER_URL") || "https://unplastica.vercel.app/api";
    const scorerKey = Deno.env.get("ML_SCORER_API_KEY") || "";
    const isVercelProxy = scorerUrl.includes("unplastica.vercel.app") || scorerUrl.endsWith("/api");

    const endpoint = scorerUrl.replace(/\/$/, "") + (scorerUrl.endsWith("/score") ? "" : "/score");
    const headers: Record<string, string> = scorerKey ? { Authorization: `Bearer ${scorerKey}` } : {};

    try {
      let requestBody: BodyInit;
      if (isVercelProxy) {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify({
          image: toBase64(bytes),
          habit_code: submission.habit_code,
        });
      } else {
        requestBody = form;
      }

      const modelResponse = await fetch(endpoint, {
        method: "POST",
        headers,
        body: requestBody,
        signal: AbortSignal.timeout(10000),
      });
      if (!modelResponse.ok) {
        return json({ error: "ML scoring service unavailable or returned error." }, 503);
      }
      const output = await modelResponse.json().catch(() => null) as {
        predicted_label?: unknown; confidence?: unknown; model_version?: unknown;
      } | null;
      if (typeof output?.confidence === "number" && typeof output?.predicted_label === "string") {
        confidence = output.confidence;
        label = output.predicted_label;
        if (typeof output?.model_version === "string") modelVersion = output.model_version.slice(0, 80);
        scorerSucceeded = true;
      } else {
        return json({ error: "Invalid response from scoring service." }, 503);
      }
    } catch (error) {
      console.warn("ML scorer fetch failed:", error);
      return json({ error: "ML scoring service unreachable or timed out." }, 503);
    }

    if (!scorerSucceeded) {
      return json({ error: "ML scoring service evaluation failed." }, 503);
    }

    const threshold = Number(Deno.env.get("ML_SCORE_THRESHOLD") ?? "0.85");
    if (!Number.isFinite(threshold) || threshold < 0.5 || threshold > 1) throw new Error("ML_SCORE_THRESHOLD must be between 0.50 and 1.00");
    if (confidence < threshold || label !== submission.habit_code) {
      const { error } = await db.from("habit_submissions").update({
        status: "rejected", score: confidence, predicted_label: label, model_version: modelVersion,
        proof_sha256: proofHash, scored_at: new Date().toISOString(),
      }).eq("id", submission.id).eq("user_id", user.id).eq("status", "uploaded");
      if (error) throw error;
      return json({ status: "rejected", error: "Failed: Non-habit/ disposable object detected." });
    }
    const { data: awarded, error: awardError } = await db.rpc("award_greenbits", {
      p_submission_id: submission.id,
      p_user_id: user.id,
      p_score: confidence,
      p_threshold: threshold,
      p_predicted_label: label,
      p_model_version: modelVersion,
      p_proof_sha256: proofHash,
    });
    if (awardError) {
      if (awardError.message.includes("proof_already_used")) return json({ status: "rejected", error: "Error: Proof already used." }, 409);
      if (awardError.message.includes("cooldown_active_5_hours")) {
        return json({ status: "rejected", code: "box_cutlery_cooldown", error: "Box & Cutlery limit: 5-hour cooldown between submissions." }, 429);
      }
      if (awardError.message.includes("daily_limit_reached")) {
        return json({ status: "rejected", code: "daily_limit_reached", error: "Daily limit reached for this habit today." }, 429);
      }
      throw awardError;
    }
    const result = Array.isArray(awarded) ? awarded[0] : awarded;
    return json({ status: result?.status ?? "approved", points: result?.points ?? 0 });
  } catch (error) {
    console.error("verify-scan", error);
    return json({ error: "Could not verify this proof." }, 500);
  }
});
