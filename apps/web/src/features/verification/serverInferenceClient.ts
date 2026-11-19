import { supabase } from "../../lib/supabase";

export type ModelDetection = {
  verified: boolean;
  label: string;
  confidence: number;
  message: "Verified" | "Not verified" | "Not recognized";
  className: string;
  probability: number;
  allProbabilities: { className: string; probability: number }[];
  modelTier?: "lightweight" | "heavy";
  modelVersion?: string;
  rateLimited?: boolean;
};

export const ACTIVE_HABIT_SPECS: Record<string, { name: string; short: string }> = {
  self_bottle_refill: { name: "Self Bottle Refill", short: "a Reusable Water Bottle or Tumbler" },
  recycle_bags: { name: "Reusable Recycle Bag", short: "a Reusable Shopping or Tote Bag" },
  box_cutlery: { name: "Reusable Box & Cutlery", short: "a Reusable Lunch Box, Container, or Cutlery" },
  greenery_furniture: { name: "Greenery Plants", short: "a Potted Plant or Indoor Greenery" },
  handicraft_projects: { name: "DIY Handicraft", short: "an Upcycled or Handmade Craft Item" },
};

/**
 * Lightweight no-op warm-up hook kept for call-site compatibility.
 * All AI inference now executes server-side via POST /api/infer.
 */
export function warmUpAiModel(): void {
  // Server-side inference requires no client ONNX download or browser warm-up.
}

/**
 * Resizes and compresses a camera/upload Blob on a canvas before sending to /api/infer
 * so uploads stay well within the 5MB serverless payload limit.
 */
async function compressImageBlobToBase64(blob: Blob, maxDimension = 512): Promise<string> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
  }

  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image for verification"));
    };
    img.src = url;
  });
}

/**
 * Sends the captured image and habitCode to the server-side inference router (POST /api/infer),
 * which routes simple tasks (bottles, recycle bags) to the lightweight model and complex tasks
 * to the heavier model with 30 req/min/IP rate limiting.
 */
export async function runModelDetection(blob: Blob, targetHabit: string): Promise<ModelDetection> {
  const base64Image = await compressImageBlobToBase64(blob, 512);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
      }
    }
  } catch {
    // Proceed without token if session lookup fails
  }

  const response = await fetch("/api/infer", {
    method: "POST",
    headers,
    body: JSON.stringify({
      image: base64Image,
      habit_code: targetHabit,
    }),
  });

  if (response.status === 429) {
    return {
      verified: false,
      label: "other",
      confidence: 0,
      message: "Not recognized",
      className: "other",
      probability: 0,
      allProbabilities: [{ className: "other", probability: 1 }],
      rateLimited: true,
    };
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      typeof payload.error === "string" ? payload.error : `Server inference failed (${response.status})`,
    );
  }

  const data = (await response.json()) as {
    score?: number;
    approved?: boolean;
    predictedClass?: string;
    confidence?: number;
    habitScore?: number;
    modelTier?: "lightweight" | "heavy";
    modelVersion?: string;
    probabilities?: Record<string, number>;
  };

  const probsMap = data.probabilities || {};
  const allProbabilities = Object.entries(probsMap)
    .map(([className, probability]) => ({ className, probability: Number(probability) }))
    .sort((a, b) => b.probability - a.probability);

  const predictedClass = data.predictedClass || allProbabilities[0]?.className || "other";
  const probability =
    targetHabit && predictedClass === targetHabit && typeof data.habitScore === "number"
      ? data.habitScore
      : typeof data.confidence === "number"
        ? data.confidence
        : allProbabilities[0]?.probability ?? 0;

  const verified = Boolean(
    data.approved ?? (predictedClass === targetHabit && probability >= 0.85),
  );
  const message: ModelDetection["message"] = verified
    ? "Verified"
    : predictedClass !== "other" && predictedClass !== targetHabit && probability >= 0.65
      ? "Not verified"
      : "Not recognized";

  return {
    verified,
    label: predictedClass,
    confidence: probability,
    message,
    className: predictedClass,
    probability,
    allProbabilities:
      allProbabilities.length > 0 ? allProbabilities : [{ className: predictedClass, probability }],
    modelTier: data.modelTier,
    modelVersion: data.modelVersion,
  };
}
