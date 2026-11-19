import { authorizeInferenceRequest } from "./_lib/auth.js";
import { runServerInference } from "./_lib/modelRouter.js";
import { parseImageRequest } from "./_lib/parseImage.js";
import { enforceIpRateLimit } from "./_lib/rateLimit.js";
import type { VercelRequest, VercelResponse } from "./_lib/types.js";

/**
 * POST /api/score
 *
 * Server-side habit verification scorer consumed by the verify-scan Edge Function
 * and backend verification pipelines.
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
  console.log("[/api/score] Handler started. Method:", request.method, "Content-Type:", request.headers["content-type"]);
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  const allowed = await enforceIpRateLimit(request, response, "infer", 30);
  if (!allowed) {
    return;
  }

  const auth = await authorizeInferenceRequest(request);
  if (!auth.authorized) {
    return response.status(auth.status).json({ error: auth.error });
  }

  const parsed = parseImageRequest(request);
  if (!parsed.ok) {
    return response.status(parsed.status).json({ error: parsed.error });
  }

  try {
    const result = await runServerInference(parsed.data.fileBuffer, parsed.data.habitCode);
    response.setHeader("X-Model-Tier", result.modelTier);
    response.setHeader("X-Model-Version", result.modelVersion);
    return response.status(200).json(result);
  } catch (error) {
    console.error("[/api/score] Server scorer error:", error);
    return response.status(500).json({ error: "Scoring failed due to an internal server error." });
  }
}
