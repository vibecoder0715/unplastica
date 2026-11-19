import { authorizeInferenceRequest } from "./_lib/auth.js";
import { runServerInference } from "./_lib/modelRouter.js";
import { parseImageRequest } from "./_lib/parseImage.js";
import { enforceIpRateLimit } from "./_lib/rateLimit.js";
import type { VercelRequest, VercelResponse } from "./_lib/types.js";

/**
 * POST /api/infer
 *
 * Server-side AI inference & task-based model routing endpoint.
 * - Routes simple tasks (self_bottle_refill, recycle_bags) to the lightweight ONNX model.
 * - Routes complex tasks (box_cutlery, greenery_furniture, handicraft_projects) to the heavier ONNX model.
 * - Enforces IP-based rate limiting (30 requests/minute per IP).
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  console.log("[/api/infer] Handler started. Method:", request.method, "Content-Type:", request.headers["content-type"]);
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  console.log("[/api/infer] Enforcing rate limit...");
  const allowed = await enforceIpRateLimit(request, response, "infer", 30);
  if (!allowed) {
    console.log("[/api/infer] Rate limit blocked.");
    return;
  }

  console.log("[/api/infer] Authorizing request...");
  const auth = await authorizeInferenceRequest(request);
  if (!auth.authorized) {
    console.log("[/api/infer] Authorization failed:", auth.error);
    return response.status(auth.status).json({ error: auth.error });
  }

  console.log("[/api/infer] Parsing image request...");
  const parsed = parseImageRequest(request);
  if (!parsed.ok) {
    console.log("[/api/infer] Parse failed:", parsed.error);
    return response.status(parsed.status).json({ error: parsed.error });
  }

  try {
    console.log("[/api/infer] Running inference...");
    const result = await runServerInference(parsed.data.fileBuffer, parsed.data.habitCode);
    console.log("[/api/infer] Inference complete. Result:", result.predictedClass);
    response.setHeader("X-Model-Tier", result.modelTier);
    response.setHeader("X-Model-Version", result.modelVersion);
    return response.status(200).json(result);
  } catch (error) {
    console.error("[/api/infer] Server inference error:", error);
    return response.status(500).json({ error: "Inference failed due to an internal server error." });
  }
}
