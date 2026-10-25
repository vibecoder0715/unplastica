import { Image } from "jsr:@matmen/imagescript@1.3.1";
import { admin, isResponse, requireVerifiedUser } from "../_shared/clients.ts";
import { json, options } from "../_shared/http.ts";

const maxBytes = 50 * 1024;
const maxDimension = 4096;
const maxPixels = 8_000_000;
const allowedTypes = new Set(["image/jpeg", "image/png"]);

function uint32be(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function inspectJpeg(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (startOfFrame.has(marker)) {
      if (segmentLength < 7) return null;
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  return null;
}

function inspectPng(bytes: Uint8Array): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 33 || signature.some((byte, index) => bytes[index] !== byte)) return null;
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
  const dimensions = { width: uint32be(bytes, 16), height: uint32be(bytes, 20) };
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = uint32be(bytes, offset);
    if (length > bytes.length - offset - 12) return null;
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (type === "acTL") return null; // Animated PNGs are not needed for profile photos.
    offset += length + 12;
    if (type === "IEND") break;
  }
  return dimensions;
}

function inspectImage(bytes: Uint8Array, contentType: string): { width: number; height: number } | null {
  if (contentType === "image/jpeg") return inspectJpeg(bytes);
  if (contentType === "image/png") return inspectPng(bytes);
  return null;
}

async function readLimitedBody(request: Request): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function makeOpaque(image: Image): void {
  const pixels = image.bitmap;
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    pixels[i] = Math.round(pixels[i] * alpha + 255 * (1 - alpha));
    pixels[i + 1] = Math.round(pixels[i + 1] * alpha + 255 * (1 - alpha));
    pixels[i + 2] = Math.round(pixels[i + 2] * alpha + 255 * (1 - alpha));
    pixels[i + 3] = 255;
  }
}

async function sanitize(bytes: Uint8Array, width: number, height: number): Promise<Uint8Array | null> {
  let decoded: Image;
  try {
    decoded = await Image.decode(bytes);
  } catch {
    return null;
  }
  const dimensionsMatch = (decoded.width === width && decoded.height === height)
    || (decoded.width === height && decoded.height === width);
  if (!dimensionsMatch) return null;
  makeOpaque(decoded);
  for (const longestSide of [512, 384, 256]) {
    const scale = Math.min(1, longestSide / Math.max(decoded.width, decoded.height));
    const image = decoded.clone().resize(
      Math.max(1, Math.round(decoded.width * scale)),
      Math.max(1, Math.round(decoded.height * scale)),
    );
    for (const quality of [82, 72, 62]) {
      const output = await image.encodeJPEG(quality);
      if (output.byteLength <= maxBytes) return output;
    }
  }
  return null;
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const user = await requireVerifiedUser(request);
    if (isResponse(user)) return user;
    const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!allowedTypes.has(contentType)) return json({ error: "Choose a JPEG or PNG image." }, 415);
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > maxBytes) return json({ error: "Profile photos must be no larger than 50 KB." }, 413);
    const bytes = await readLimitedBody(request);
    if (!bytes?.length) return json({ error: "Profile photos must be no larger than 50 KB." }, 413);
    const dimensions = inspectImage(bytes, contentType);
    if (!dimensions) return json({ error: "This file is not a supported JPEG or PNG image." }, 415);
    const { width, height } = dimensions;
    if (width < 1 || height < 1 || width > maxDimension || height > maxDimension || width * height > maxPixels) {
      return json({ error: "Image dimensions are too large. Choose an image up to 4096 pixels per side." }, 413);
    }

    const db = admin();
    const { data: claimData, error: claimError } = await db.rpc("claim_avatar_upload_slot", {
      p_user_id: user.id,
      p_cooldown_seconds: 15,
    });
    if (claimError) throw claimError;
    const profile = Array.isArray(claimData) ? claimData[0] : claimData;
    if (!profile) return json({ error: "Please wait a few seconds before uploading another photo." }, 429, request);

    const sanitized = await sanitize(bytes, width, height);
    if (!sanitized) return json({ error: "This image could not be safely processed under the 50 KB limit." }, 413);

    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: storageError } = await db.storage.from("profile-avatars").upload(path, sanitized, {
      contentType: "image/jpeg", cacheControl: "60", upsert: false,
    });
    if (storageError) throw storageError;
    const { error: saveError } = await db.from("profiles").update({ avatar_path: path }).eq("id", user.id);
    if (saveError) {
      await db.storage.from("profile-avatars").remove([path]);
      throw saveError;
    }
    const oldPath = profile.avatar_path;
    if (typeof oldPath === "string" && oldPath.startsWith(`${user.id}/`) && oldPath !== path) {
      const { error: removeError } = await db.storage.from("profile-avatars").remove([oldPath]);
      if (removeError) console.error("Could not remove previous profile avatar", removeError);
    }
    return json({ avatar_path: path, size_bytes: sanitized.byteLength });
  } catch (error) {
    console.error("upload-profile-avatar", error);
    return json({ error: "Could not update profile photo." }, 500);
  }
});
