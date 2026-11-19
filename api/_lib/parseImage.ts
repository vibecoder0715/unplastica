import type { VercelRequest } from "./types.js";

export type ParsedImagePayload = {
  fileBuffer: Buffer;
  mimeType: string;
  habitCode: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function parseMultipartBuffer(
  bodyBuffer: Buffer,
  boundary: string,
): { file?: Buffer; habitCode?: string; contentType?: string } {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let file: Buffer | undefined;
  let habitCode: string | undefined;
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

      if (headers.includes('name="file"') || headers.includes('name="image"')) {
        file = Buffer.from(content);
        const match = headers.match(/Content-Type:\s*([^\r\n;]+)/i);
        if (match) contentType = match[1].trim();
      } else if (headers.includes('name="habit_code"')) {
        habitCode = content.toString("utf8").trim();
      }
    }
    start = nextIdx;
  }
  return { file, habitCode, contentType };
}

export function detectImageMimeFromMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Parses either multipart/form-data or JSON base64 proof payloads with magic-byte & size checks.
 */
export function parseImageRequest(
  request: VercelRequest,
): { ok: true; data: ParsedImagePayload } | { ok: false; status: number; error: string } {
  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > 7 * 1024 * 1024) {
    return { ok: false, status: 413, error: "Payload too large. Maximum proof size is 5MB." };
  }

  let fileBuffer: Buffer | null = null;
  let extractedHabitCode = "";

  const rawContentType = request.headers["content-type"];
  const contentTypeHeader = (Array.isArray(rawContentType) ? rawContentType[0] : rawContentType || "").toLowerCase();

  if (contentTypeHeader.includes("multipart/form-data")) {
    const boundaryMatch = contentTypeHeader.match(/boundary=([^;]+)/i);
    const boundary = boundaryMatch ? boundaryMatch[1].replace(/['"]/g, "").trim() : "";
    if (boundary) {
      let bodyBuffer = request.body;
      if (typeof bodyBuffer === "string") bodyBuffer = Buffer.from(bodyBuffer, "latin1");
      if (Buffer.isBuffer(bodyBuffer)) {
        const parsed = parseMultipartBuffer(bodyBuffer, boundary);
        if (parsed.file) fileBuffer = parsed.file;
        if (parsed.habitCode) extractedHabitCode = parsed.habitCode;
      }
    }
  }

  if (!fileBuffer) {
    let parsedBody: Record<string, unknown> | null = null;
    if (typeof request.body === "string") {
      try {
        parsedBody = JSON.parse(request.body) as Record<string, unknown>;
      } catch {
        parsedBody = null;
      }
    } else if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
      parsedBody = request.body as Record<string, unknown>;
    }

    const rawImage = parsedBody?.image ?? parsedBody?.file;
    if (typeof rawImage === "string" && rawImage.trim().length > 0) {
      const cleaned = rawImage.trim().replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      fileBuffer = Buffer.from(cleaned, "base64");
    }

    if (typeof parsedBody?.habit_code === "string") {
      extractedHabitCode = parsedBody.habit_code;
    }
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "No image proof provided in request. An image is required for habit verification.",
    };
  }

  if (fileBuffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: "Payload too large. Maximum proof size is 5MB." };
  }

  const detectedMime = detectImageMimeFromMagicBytes(fileBuffer);
  if (!detectedMime) {
    return {
      ok: false,
      status: 422,
      error: "Invalid image format. Supported formats: JPEG, PNG, WebP.",
    };
  }

  const rawHabitCode =
    extractedHabitCode ||
    (Array.isArray(request.headers["x-habit-code"])
      ? request.headers["x-habit-code"][0]
      : request.headers["x-habit-code"]) ||
    (Array.isArray(request.query?.habit_code) ? request.query?.habit_code[0] : request.query?.habit_code) ||
    "";

  const habitCode = String(rawHabitCode).trim().slice(0, 40);
  return {
    ok: true,
    data: {
      fileBuffer,
      mimeType: detectedMime,
      habitCode,
    },
  };
}
