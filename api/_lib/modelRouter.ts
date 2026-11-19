import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ACTIVE_HABITS, SIMPLE_HABITS } from "./types.js";

export type ModelTier = "lightweight" | "heavy";

export const MODEL_CLASSES = [
  "beeswax_food_wraps",
  "box_cutlery",
  "bulk_pantry_refill",
  "greenery_furniture",
  "handicraft_projects",
  "other",
  "recycle_bags",
  "self_bottle_refill",
] as const;

export const APPROVAL_THRESHOLD = 0.85;

const IMAGENET_MEAN = [0.485, 0.456, 0.406] as const;
const IMAGENET_STD = [0.229, 0.224, 0.225] as const;

const DEFAULT_HEAVY_MODEL_URL =
  "https://github.com/vibecoder0715/unplastica/releases/download/models-v0.7.0/heavy.onnx";

export interface InferenceResult {
  score: number;
  approved: boolean;
  predictedClass: string;
  confidence: number;
  habitScore: number;
  modelTier: ModelTier;
  modelVersion: string;
  probabilities: Record<string, number>;
  latencyMs: number;
}

/**
 * Route simple habits (self_bottle_refill, recycle_bags) to the lightweight model
 * and complex habits (box_cutlery, greenery_furniture, handicraft_projects) to the heavier model.
 */
export function selectModelTier(habitCode?: string | null): ModelTier {
  const normalized = (habitCode || "").trim();
  if (normalized && SIMPLE_HABITS.has(normalized)) {
    return "lightweight";
  }
  return "heavy";
}

export function getModelVersionTag(tier: ModelTier): string {
  return tier === "lightweight"
    ? "mobilenet_v3_small-v0.7.0-lightweight"
    : "mobilenet_v3_large-v0.7.0-heavy";
}

// Singleton in-memory ONNX sessions per tier across warm serverless invocations
const sessionCache = new Map<ModelTier, Promise<any>>();
let ortModulePromise: Promise<any> | null = null;

async function getOrtModule(): Promise<any> {
  if (!ortModulePromise) {
    ortModulePromise = (async () => {
      const rawOrt = (await import("onnxruntime-web/wasm")) as any;
      const ort = rawOrt.default || rawOrt;
      ort.env.wasm.numThreads = 1;
      ort.env.logLevel = "error";
      try {
        const req = createRequire(import.meta.url);
        const ortPkgPath = req.resolve("onnxruntime-web/package.json");
        const distDir = path.join(path.dirname(ortPkgPath), "dist");
        if (fs.existsSync(distDir)) {
          // Ensure trailing separator for onnxruntime-web wasmPaths directory resolution
          ort.env.wasm.wasmPaths = distDir.endsWith(path.sep) ? distDir : `${distDir}${path.sep}`;
        }
      } catch {
        // Fallback to default resolution
      }
      return ort;
    })();
  }
  return ortModulePromise;
}

function resolveLightweightModelPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../_models/lightweight.onnx"),
    path.resolve(process.cwd(), "api/_models/lightweight.onnx"),
    path.resolve(process.cwd(), "ml/model/lightweight.onnx"),
    path.resolve(process.cwd(), "ml/model/model.onnx"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("Lightweight ONNX model file not found in api/_models/lightweight.onnx");
}

async function resolveHeavyModelBuffer(): Promise<Buffer> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const localCandidates = [
    path.resolve(process.cwd(), "ml/model/heavy.onnx"),
    path.resolve(here, "../_models/heavy.onnx"),
    path.join(os.tmpdir(), "unplastica_heavy_v0.7.0.onnx"),
  ];

  const expectedSha256 = (process.env.HEAVY_MODEL_SHA256 || "").trim().toLowerCase();

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) {
      const buf = fs.readFileSync(candidate);
      if (!expectedSha256 || crypto.createHash("sha256").update(buf).digest("hex") === expectedSha256) {
        return buf;
      }
    }
  }

  // Download heavy model weights from external release storage and cache in /tmp
  const remoteUrl = (process.env.HEAVY_MODEL_URL || DEFAULT_HEAVY_MODEL_URL).trim();
  const tmpCachePath = path.join(os.tmpdir(), "unplastica_heavy_v0.7.0.onnx");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(remoteUrl, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "Unplastica-Server-Inference/0.7.0" },
    });
    clearTimeout(timer);

    if (resp.ok) {
      const arr = await resp.arrayBuffer();
      const buf = Buffer.from(arr);
      if (expectedSha256) {
        const actualSha = crypto.createHash("sha256").update(buf).digest("hex");
        if (actualSha !== expectedSha256) {
          throw new Error(`Heavy model SHA-256 mismatch (expected ${expectedSha256}, got ${actualSha})`);
        }
      }
      try {
        fs.writeFileSync(tmpCachePath, buf);
      } catch {
        // Ignore read-only tmp filesystem warnings if any
      }
      return buf;
    }
  } catch {
    // Fallback to lightweight model weights only if external network fetch fails in an offline sandbox
  }

  return fs.readFileSync(resolveLightweightModelPath());
}

async function getSessionForTier(tier: ModelTier): Promise<any> {
  const existing = sessionCache.get(tier);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const ort = await getOrtModule();
    const modelBuffer =
      tier === "lightweight"
        ? fs.readFileSync(resolveLightweightModelPath())
        : await resolveHeavyModelBuffer();

    const uint8 = new Uint8Array(modelBuffer.buffer, modelBuffer.byteOffset, modelBuffer.byteLength);
    return ort.InferenceSession.create(uint8, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
  })();

  sessionCache.set(tier, promise);
  try {
    return await promise;
  } catch (err) {
    sessionCache.delete(tier);
    throw err;
  }
}

/**
 * Preprocess an image buffer into an ImageNet-normalized NCHW Float32Array(1 * 3 * 224 * 224) using sharp.
 */
export async function preprocessImageBuffer(imageBuffer: Buffer): Promise<Float32Array> {
  const { data } = await sharp(imageBuffer)
    .rotate() // Auto-orient via EXIF
    .resize(224, 224, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const area = 224 * 224;
  const floatData = new Float32Array(3 * area);

  for (let i = 0; i < area; i++) {
    const r = data[i * 3] / 255.0;
    const g = data[i * 3 + 1] / 255.0;
    const b = data[i * 3 + 2] / 255.0;

    floatData[i] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    floatData[area + i] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    floatData[2 * area + i] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }

  return floatData;
}

export function softmaxLogits(logits: Float32Array | number[]): number[] {
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > maxLogit) maxLogit = logits[i];
  }
  const exps = new Array<number>(logits.length);
  let sumExp = 0;
  for (let i = 0; i < logits.length; i++) {
    const e = Math.exp(logits[i] - maxLogit);
    exps[i] = e;
    sumExp += e;
  }
  return exps.map((e) => e / Math.max(sumExp, 1e-12));
}

export async function runServerInference(
  imageBuffer: Buffer,
  habitCode?: string | null,
): Promise<InferenceResult> {
  const t0 = performance.now();
  const normalizedHabit = (habitCode || "").trim();
  const modelTier = selectModelTier(normalizedHabit);
  const modelVersion = getModelVersionTag(modelTier);

  // Optional external ML service override if configured and not pointing back to this Vercel app
  const externalScorerUrl = (process.env.ML_SCORER_URL || "").trim().replace(/\/+$/, "");
  if (
    externalScorerUrl &&
    !externalScorerUrl.includes("unplastica.vercel.app") &&
    !externalScorerUrl.includes("localhost")
  ) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Model-Tier": modelTier,
      };
      if (process.env.ML_SCORER_API_KEY) {
        headers["Authorization"] = `Bearer ${process.env.ML_SCORER_API_KEY}`;
      }
      const resp = await fetch(`${externalScorerUrl}/score`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          image: imageBuffer.toString("base64"),
          habit_code: normalizedHabit,
          model_tier: modelTier,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const payload = (await resp.json()) as Record<string, unknown>;
        if (typeof payload.score === "number" && Number.isFinite(payload.score)) {
          const score = Math.max(0, Math.min(1, payload.score));
          const predictedClass =
            typeof payload.predictedClass === "string"
              ? payload.predictedClass
              : score >= APPROVAL_THRESHOLD && normalizedHabit
                ? normalizedHabit
                : "other";
          return {
            score,
            approved: score >= APPROVAL_THRESHOLD,
            predictedClass,
            confidence: typeof payload.confidence === "number" ? payload.confidence : score,
            habitScore: score,
            modelTier,
            modelVersion: typeof payload.modelVersion === "string" ? payload.modelVersion : modelVersion,
            probabilities:
              payload.probabilities && typeof payload.probabilities === "object"
                ? (payload.probabilities as Record<string, number>)
                : { [predictedClass]: score },
            latencyMs: Math.round(performance.now() - t0),
          };
        }
      }
    } catch {
      // Fall back to local server ONNX runtime
    }
  }

  const [ort, session, chwTensorData] = await Promise.all([
    getOrtModule(),
    getSessionForTier(modelTier),
    preprocessImageBuffer(imageBuffer),
  ]);

  const inputTensor = new ort.Tensor("float32", chwTensorData, [1, 3, 224, 224]);
  const inputName = session.inputNames?.[0] || "input";
  const outputMap = await session.run({ [inputName]: inputTensor });
  const outputName = session.outputNames?.[0] || Object.keys(outputMap)[0];
  const rawLogits = outputMap[outputName].data as Float32Array;
  const probs = softmaxLogits(rawLogits);

  const probabilities: Record<string, number> = {};
  let topIdx = 0;
  let topProb = -1;
  for (let i = 0; i < MODEL_CLASSES.length; i++) {
    const cls = MODEL_CLASSES[i];
    const p = Number((probs[i] ?? 0).toFixed(6));
    probabilities[cls] = p;
    if (p > topProb) {
      topProb = p;
      topIdx = i;
    }
  }

  const predictedClass = MODEL_CLASSES[topIdx];
  let habitScore = topProb;
  let approved = false;

  if (normalizedHabit && ACTIVE_HABITS.has(normalizedHabit)) {
    const targetProb = probabilities[normalizedHabit] ?? 0;
    if (predictedClass === normalizedHabit) {
      habitScore = targetProb;
      approved = habitScore >= APPROVAL_THRESHOLD;
    } else {
      // Mismatched top class cannot be approved for the requested habit
      habitScore = Number(Math.min(targetProb, 0.49).toFixed(6));
      approved = false;
    }
  } else {
    approved = predictedClass !== "other" && topProb >= APPROVAL_THRESHOLD;
    habitScore = predictedClass !== "other" ? topProb : Number((1 - topProb).toFixed(6));
  }

  return {
    score: habitScore,
    approved,
    predictedClass,
    confidence: topProb,
    habitScore,
    modelTier,
    modelVersion,
    probabilities,
    latencyMs: Math.round(performance.now() - t0),
  };
}
