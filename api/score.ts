type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  query?: Record<string, string | string[]>;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  end(chunk?: any): VercelResponse;
  json(body: unknown): VercelResponse;
  setHeader(name: string, value: string | number | readonly string[]): VercelResponse;
};

import crypto from "crypto";

declare const process: { env: Record<string, string | undefined> };
declare const Buffer: any;

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute lockout

type RateLimitRecord = {
  timestamps: number[];
  lockedUntil: number;
};

const ipRateLimits = new Map<string, RateLimitRecord>();

function getClientIp(request: VercelRequest): string {
  const vercelIp = request.headers["x-vercel-forwarded-for"];
  if (vercelIp) {
    const ip = Array.isArray(vercelIp) ? vercelIp[0] : vercelIp.split(",")[0];
    return ip.trim();
  }
  const realIp = request.headers["x-real-ip"];
  if (realIp) {
    return (Array.isArray(realIp) ? realIp[0] : realIp).trim();
  }
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded : forwarded.split(",");
    return list[list.length - 1].trim();
  }
  return "127.0.0.1";
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number; remaining: number }> {
  // 1. Try persistent Supabase DB rate limiting if configured
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/check_auth_rate_limit`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_key: `score:${ip}`,
          p_max_attempts: MAX_REQUESTS_PER_WINDOW,
          p_window_seconds: RATE_LIMIT_WINDOW_MS / 1000,
          p_lockout_seconds: LOCKOUT_DURATION_MS / 1000,
        }),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (row && typeof row.allowed === "boolean") {
          return {
            allowed: row.allowed,
            retryAfter: row.retry_after || (row.allowed ? undefined : 60),
            remaining: row.remaining ?? 0,
          };
        }
      }
    } catch (_) {
      // Fallback to memory rate limiter on network error or timeout
    }
  }

  // 2. In-memory fallback
  const now = Date.now();
  const record = ipRateLimits.get(ip) || { timestamps: [], lockedUntil: 0 };

  record.timestamps = record.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    ipRateLimits.set(ip, record);
    return { allowed: false, retryAfter: LOCKOUT_DURATION_MS / 1000, remaining: 0 };
  }

  record.timestamps.push(now);
  ipRateLimits.set(ip, record);

  if (ipRateLimits.size > 1000) {
    for (const [key, val] of ipRateLimits.entries()) {
      if (val.lockedUntil < now && val.timestamps.length === 0) {
        ipRateLimits.delete(key);
      }
    }
  }

  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.timestamps.length };
}

// 5 Active Habit Codes (beeswax_food_wraps & bulk_pantry_refill are disabled)
const VALID_HABITS = new Set([
  "box_cutlery",
  "greenery_furniture",
  "handicraft_projects",
  "recycle_bags",
  "self_bottle_refill",
]);

function parseMultipartBuffer(
  bodyBuffer: any,
  boundary: string
): { file?: any; habit_code?: string; contentType?: string } {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let file: any;
  let habit_code: string | undefined;
  let contentType = "image/jpeg";

  let start = 0;
  while (true) {
    const idx = bodyBuffer.indexOf(boundaryBuffer, start);
    if (idx === -1) break;
    const nextIdx = bodyBuffer.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
    if (nextIdx === -1) break;

    const part = bodyBuffer.subarray(idx + boundaryBuffer.length, nextIdx);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString("latin1");
      const content = part.subarray(headerEnd + 4, part.length - 2);

      if (headers.includes('name="file"')) {
        file = Buffer.from(content);
        const match = headers.match(/Content-Type:\s*([^\r\n;]+)/i);
        if (match) contentType = match[1].trim();
      } else if (headers.includes('name="habit_code"')) {
        habit_code = content.toString("utf8").trim();
      }
    }
    start = nextIdx;
  }
  return { file, habit_code, contentType };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // CORS & Security headers
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");

  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimit(clientIp);

  response.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW.toString());
  response.setHeader("X-RateLimit-Remaining", rateLimit.remaining.toString());

  if (!rateLimit.allowed) {
    response.setHeader("Retry-After", (rateLimit.retryAfter || 60).toString());
    return response.status(429).json({
      error: `Too many checks. Locked for ${rateLimit.retryAfter || 60} s.`,
      retry_after: rateLimit.retryAfter || 60,
    });
  }

  const expectedKey = process.env.ML_SCORER_API_KEY;

  if (request.method === "GET") {
    // Unauthenticated GET returns safe health check without leaking white-box model parameters
    const authHeader = request.headers.authorization;
    const authorization = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const isAuthorized =
      expectedKey &&
      authorization &&
      authorization.startsWith("Bearer ") &&
      authorization.slice(7) === expectedKey;

    if (!isAuthorized) {
      return response.status(200).json({ status: "ready" });
    }

    return response.status(200).json({
      status: "ready",
      model: "mobilenet_v3_small",
      model_version: "mobilenet_v3_small-v0.2.0-edge-refined",
      classes: Array.from(VALID_HABITS).concat(["other"]).sort(),
      threshold: 0.85,
      rate_limit: {
        max_requests_per_min: MAX_REQUESTS_PER_WINDOW,
        lockout_duration_sec: LOCKOUT_DURATION_MS / 1000,
      },
    });
  }

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed." });
  }

  // Authorization check for backend scoring invocations (fail-closed)
  if (!expectedKey) {
    return response.status(503).json({ error: "Scoring service API key is not configured." });
  }

  const header = request.headers.authorization;
  const authorization = Array.isArray(header) ? header[0] : header;
  if (!authorization) {
    return response.status(401).json({ error: "Unauthorized scoring request." });
  }

  const expectedAuth = `Bearer ${expectedKey}`;
  const authBuf = Buffer.from(authorization);
  const expBuf = Buffer.from(expectedAuth);
  if (authBuf.length !== expBuf.length || !crypto.timingSafeEqual(authBuf, expBuf)) {
    return response.status(401).json({ error: "Unauthorized scoring request." });
  }

  // Check payload length bounds to prevent large payload attacks
  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > 6 * 1024 * 1024) {
    return response.status(413).json({
      error: "Payload too large. Maximum proof size is 5MB.",
      verified: false,
    });
  }

  // Parse payload: support both multipart/form-data and JSON base64
  let fileBuffer: any = null;
  let mimeType = "image/jpeg";
  let extractedHabitCode = "";

  const contentTypeHeader = (
    Array.isArray(request.headers["content-type"])
      ? request.headers["content-type"][0]
      : request.headers["content-type"] || ""
  ).toLowerCase();

  if (contentTypeHeader.includes("multipart/form-data")) {
    const boundaryMatch = contentTypeHeader.match(/boundary=([^;]+)/i);
    const boundary = boundaryMatch ? boundaryMatch[1].replace(/['"]/g, "").trim() : "";
    if (boundary) {
      let bodyBuffer = request.body;
      if (typeof bodyBuffer === "string") bodyBuffer = Buffer.from(bodyBuffer, "latin1");
      if (Buffer.isBuffer(bodyBuffer)) {
        const parsed = parseMultipartBuffer(bodyBuffer, boundary);
        fileBuffer = parsed.file;
        extractedHabitCode = parsed.habit_code || "";
        if (parsed.contentType) mimeType = parsed.contentType;
      }
    }
  }

  if (!fileBuffer) {
    // Parse from JSON body
    let parsedBody = request.body;
    if (typeof parsedBody === "string") {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch (_) {
        parsedBody = null;
      }
    }

    const imageBase64 = parsedBody?.image || parsedBody?.file;
    if (imageBase64 && typeof imageBase64 === "string" && imageBase64.trim().length > 0) {
      const isJpeg = imageBase64.startsWith("/9j/");
      const isPng = imageBase64.startsWith("iVBORw0KGgo");
      const isWebp = imageBase64.startsWith("UklGR");

      if (!isJpeg && !isPng && !isWebp) {
        return response.status(422).json({
          error: "Invalid image format. Supported formats: JPEG, PNG, WebP.",
          verified: false,
          predicted_label: "other",
          confidence: 0.1,
        });
      }

      mimeType = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/webp";
      fileBuffer = Buffer.from(imageBase64, "base64");
    }

    if (parsedBody?.habit_code) {
      extractedHabitCode = parsedBody.habit_code;
    }
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    return response.status(400).json({
      error: "No image proof provided in request. An image is required for habit verification.",
      verified: false,
      predicted_label: "other",
      confidence: 0.0,
    });
  }

  if (fileBuffer.length > 5 * 1024 * 1024) {
    return response.status(413).json({
      error: "Payload too large. Maximum proof size is 5MB.",
      verified: false,
    });
  }

  const rawHabitCode =
    extractedHabitCode ||
    request.headers["x-habit-code"] ||
    request.query?.habit_code ||
    "";

  const habitCode = String(rawHabitCode).trim().slice(0, 40);

  if (!habitCode || !VALID_HABITS.has(habitCode)) {
    return response.status(400).json({
      error: "Invalid or unsupported habit code.",
      verified: false,
      predicted_label: "other",
      confidence: 0.0,
    });
  }

  // Forward to ML scoring service (fail-closed, loop-prevented)
  const mlScorerUrl = process.env.ML_SCORER_URL;
  if (!mlScorerUrl) {
    return response.status(503).json({
      error: "ML scoring service is not configured.",
      verified: false,
    });
  }

  // Prevent self-referential scoring loops
  if (
    mlScorerUrl.includes("unplastica.vercel.app") ||
    mlScorerUrl.includes("localhost:3000/api/score")
  ) {
    return response.status(503).json({
      error: "ML scoring backend loop detected: ML_SCORER_URL cannot point to /api/score itself.",
      verified: false,
    });
  }

  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, "proof.jpg");
    formData.append("habit_code", habitCode);

    const mlRes = await fetch(`${mlScorerUrl.replace(/\/$/, "")}/score`, {
      method: "POST",
      headers: { Authorization: `Bearer ${expectedKey}` },
      body: formData,
      signal: AbortSignal.timeout(10000),
    });

    if (!mlRes.ok) {
      return response.status(503).json({
        error: "Backend ML scorer is unavailable or returned error.",
        verified: false,
      });
    }

    const mlData = (await mlRes.json()) as { predicted_label: string; confidence: number; model_version?: string; extraction?: unknown };
    const verified =
      mlData.predicted_label === habitCode &&
      mlData.confidence >= 0.85 &&
      mlData.predicted_label !== "other";

    return response.status(200).json({
      status: verified ? "verified" : "rejected",
      predicted_label: mlData.predicted_label,
      confidence: mlData.confidence,
      model_version: mlData.model_version || "mobilenet_v3_small-v0.3.0-extracted-habit",
      verified,
      extraction: mlData.extraction,
    });
  } catch (err) {
    console.error("Backend ML scorer invocation failed:", err);
    return response.status(503).json({
      error: "Backend ML scorer is unreachable or timed out.",
      verified: false,
    });
  }
}
